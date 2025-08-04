-- =====================================================
-- RECREATE DELETED TABLES AND FUNCTIONS
-- Yoklick Project - Database Recovery
-- =====================================================

-- 1. RECREATE CREDIT_HISTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS credit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_added int DEFAULT 0,
  credits_used int DEFAULT 0,
  credits_remaining int,
  action text NOT NULL, -- subscription_payment, usage, admin_adjustment
  subscription_id text,
  payment_id text,
  plan_type text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create index for credit_history
CREATE INDEX IF NOT EXISTS idx_credit_history_user_id ON credit_history(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_history_action ON credit_history(action);
CREATE INDEX IF NOT EXISTS idx_credit_history_created_at ON credit_history(created_at);

-- 2. RECREATE USER_CREDITS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance int DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create index for user_credits
CREATE INDEX IF NOT EXISTS idx_user_credits_balance ON user_credits(balance);

-- 3. RECREATE TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'succeeded', -- succeeded, failed, pending
  plan_type text,
  credits int NOT NULL,
  is_yearly boolean DEFAULT false,
  payment_provider text DEFAULT 'dodo',
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_id ON transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- 4. RECREATE SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  subscription_id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL, -- active, cancelled, pending
  plan_type text NOT NULL, -- starter, creator, pro
  amount numeric,
  billing_cycle text, -- monthly, yearly
  next_billing_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_type ON subscriptions(plan_type);

-- 5. RECREATE FUNCTIONS
-- =====================================================

-- Function 1: use_credits_simple
-- =====================================================
DROP FUNCTION IF EXISTS use_credits_simple(uuid, int);
CREATE OR REPLACE FUNCTION use_credits_simple(
  p_user_id uuid,
  p_credits_to_use int
) RETURNS boolean AS $$
DECLARE
  current_credits int;
BEGIN
  -- Get current credits from users_meta
  SELECT credits INTO current_credits 
  FROM users_meta 
  WHERE id = p_user_id;
  
  -- Check if user has enough credits
  IF current_credits IS NULL OR current_credits < p_credits_to_use THEN
    RETURN false;
  END IF;
  
  -- Deduct credits from users_meta
  UPDATE users_meta 
  SET credits = credits - p_credits_to_use,
      total_credits_used = total_credits_used + p_credits_to_use
  WHERE id = p_user_id;
  
  -- Update user_credits table
  UPDATE user_credits 
  SET balance = balance - p_credits_to_use,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Insert or update user_credits if not exists
  IF NOT FOUND THEN
    INSERT INTO user_credits (user_id, balance)
    VALUES (p_user_id, current_credits - p_credits_to_use);
  END IF;
  
  -- Log credit usage in credit_history
  INSERT INTO credit_history (
    user_id,
    credits_used,
    credits_remaining,
    action
  ) VALUES (
    p_user_id,
    p_credits_to_use,
    current_credits - p_credits_to_use,
    'usage'
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function 2: add_credits_with_expiry
-- =====================================================
DROP FUNCTION IF EXISTS add_credits_with_expiry(uuid, int, text, text, text);
CREATE OR REPLACE FUNCTION add_credits_with_expiry(
  p_user_id uuid,
  p_credits int,
  p_subscription_id text,
  p_payment_id text,
  p_plan_type text
) RETURNS void AS $$
BEGIN
  -- Add credits to users_meta
  UPDATE users_meta SET 
    credits = credits + p_credits,
    total_credits_earned = total_credits_earned + p_credits
  WHERE id = p_user_id;
  
  -- Update or insert user_credits
  INSERT INTO user_credits (user_id, balance)
  VALUES (p_user_id, p_credits)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    balance = user_credits.balance + p_credits,
    updated_at = now();
  
  -- Log credit history
  INSERT INTO credit_history (
    user_id, 
    credits_added, 
    credits_remaining, 
    action, 
    subscription_id, 
    payment_id, 
    plan_type
  ) VALUES (
    p_user_id, 
    p_credits, 
    (SELECT credits FROM users_meta WHERE id = p_user_id), 
    'subscription_payment', 
    p_subscription_id, 
    p_payment_id, 
    p_plan_type
  );
END;
$$ LANGUAGE plpgsql;

-- Function 3: sync_user_credits
-- =====================================================
DROP FUNCTION IF EXISTS sync_user_credits();
CREATE OR REPLACE FUNCTION sync_user_credits() RETURNS trigger AS $$
BEGIN
  IF tg_op = 'INSERT' THEN
    -- Insert new user_credits record
    INSERT INTO user_credits(user_id, balance)
    VALUES (new.id, new.credits)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      balance = new.credits,
      updated_at = now();
  ELSIF tg_op = 'UPDATE' THEN
    -- Update existing user_credits record
    UPDATE user_credits 
    SET balance = new.credits,
        updated_at = now()
    WHERE user_id = new.id;
    
    -- Insert if not exists
    IF NOT FOUND THEN
      INSERT INTO user_credits(user_id, balance)
      VALUES (new.id, new.credits);
    END IF;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- 6. RECREATE TRIGGERS
-- =====================================================

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS users_meta_sync_credits ON users_meta;

-- Create trigger for syncing user_credits
CREATE TRIGGER users_meta_sync_credits
  AFTER INSERT OR UPDATE ON users_meta
  FOR EACH ROW EXECUTE FUNCTION sync_user_credits();

-- 7. ADD MISSING COLUMNS TO EXISTING TABLES
-- =====================================================

-- Add missing columns to users_meta if they don't exist
ALTER TABLE users_meta 
ADD COLUMN IF NOT EXISTS total_credits_earned int DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_credits_used int DEFAULT 0;

-- Add missing columns to feedback table
ALTER TABLE feedback 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS admin_reply text,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- 8. UPDATE EXISTING RECORDS WITH DEFAULT VALUES
-- =====================================================

-- Update existing users_meta records
UPDATE users_meta SET 
  total_credits_earned = COALESCE(total_credits_earned, 0),
  total_credits_used = COALESCE(total_credits_used, 0)
WHERE total_credits_earned IS NULL OR total_credits_used IS NULL;

-- Update existing feedback records
UPDATE feedback SET 
  status = COALESCE(status, 'pending')
WHERE status IS NULL;

-- 9. CREATE VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for public and featured thumbnails
CREATE OR REPLACE VIEW public_featured_thumbnails AS
SELECT * FROM thumbnails 
WHERE is_public = true OR is_featured = true 
ORDER BY created_at DESC;

-- View for user's thumbnails
CREATE OR REPLACE VIEW my_thumbnails AS
SELECT * FROM thumbnails 
WHERE user_id = auth.uid();

-- 10. VERIFICATION QUERIES
-- =====================================================

-- Check if all tables were created successfully
SELECT 
  'credit_history' as table_name,
  COUNT(*) as row_count
FROM credit_history
UNION ALL
SELECT 
  'user_credits' as table_name,
  COUNT(*) as row_count
FROM user_credits
UNION ALL
SELECT 
  'transactions' as table_name,
  COUNT(*) as row_count
FROM transactions
UNION ALL
SELECT 
  'subscriptions' as table_name,
  COUNT(*) as row_count
FROM subscriptions;

-- Check if functions were created successfully
SELECT 
  proname as function_name,
  prosrc as function_source
FROM pg_proc 
WHERE proname IN ('use_credits_simple', 'add_credits_with_expiry', 'sync_user_credits');

-- =====================================================
-- END OF SQL RECREATION SCRIPT
-- ===================================================== 