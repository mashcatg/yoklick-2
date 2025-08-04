-- Minimal Essential Functions
-- Run this file to create only the essential functions

-- Function to add credits (simple version)
CREATE OR REPLACE FUNCTION add_credits_simple(
    p_user_id UUID,
    p_credits INTEGER,
    p_subscription_id VARCHAR(255),
    p_plan_type VARCHAR(50)
)
RETURNS void AS $$
DECLARE
    current_credits INTEGER;
BEGIN
    -- Get current credits (create record if doesn't exist)
    SELECT COALESCE(credits, 0) INTO current_credits 
    FROM users_meta 
    WHERE id = p_user_id;
    
    -- If user doesn't exist in users_meta, create the record
    IF current_credits IS NULL THEN
        INSERT INTO users_meta (id, credits, subscription_id, plan_type, status, created_at, updated_at)
        VALUES (p_user_id, 0, p_subscription_id, p_plan_type, 'active', NOW(), NOW());
        current_credits := 0;
    END IF;
    
    -- Update users_meta with new credits
    UPDATE users_meta 
    SET credits = current_credits + p_credits,
        subscription_id = p_subscription_id,
        plan_type = p_plan_type,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Also update user_credits table for real-time tracking
    INSERT INTO user_credits (user_id, balance) 
    VALUES (p_user_id, current_credits + p_credits)
    ON CONFLICT (user_id) 
    DO UPDATE SET balance = current_credits + p_credits;
    
    -- Log the credit addition in credit_history
    INSERT INTO credit_history (
        user_id,
        credits_added,
        credits_remaining,
        action,
        subscription_id,
        plan_type
    ) VALUES (
        p_user_id,
        p_credits,
        current_credits + p_credits,
        'subscription_payment',
        p_subscription_id,
        p_plan_type
    );
END;
$$ LANGUAGE plpgsql;

-- Function to use credits (simple version)
CREATE OR REPLACE FUNCTION use_credits_simple(
    p_user_id UUID,
    p_credits_to_use INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    current_credits INTEGER;
BEGIN
    -- Get current credits (create record if doesn't exist)
    SELECT COALESCE(credits, 0) INTO current_credits 
    FROM users_meta 
    WHERE id = p_user_id;
    
    -- If user doesn't exist in users_meta, create the record
    IF current_credits IS NULL THEN
        INSERT INTO users_meta (id, credits, created_at, updated_at)
        VALUES (p_user_id, 0, NOW(), NOW());
        current_credits := 0;
    END IF;
    
    -- Check if user has enough credits
    IF current_credits < p_credits_to_use THEN
        RETURN FALSE;
    END IF;
    
    -- Update users_meta
    UPDATE users_meta 
    SET credits = current_credits - p_credits_to_use,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Also update user_credits table (insert if not exists, update if exists)
    INSERT INTO user_credits (user_id, balance) 
    VALUES (p_user_id, current_credits - p_credits_to_use)
    ON CONFLICT (user_id) 
    DO UPDATE SET balance = current_credits - p_credits_to_use;
    
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
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get user credits
CREATE OR REPLACE FUNCTION get_user_credits(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    user_credits INTEGER;
BEGIN
    SELECT COALESCE(credits, 0) INTO user_credits 
    FROM users_meta 
    WHERE id = p_user_id;
    
    -- If user doesn't exist, return 0
    IF user_credits IS NULL THEN
        RETURN 0;
    END IF;
    
    RETURN user_credits;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on credit_history table
ALTER TABLE credit_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own credit history" ON credit_history;
DROP POLICY IF EXISTS "Service role can insert credit history" ON credit_history;
DROP POLICY IF EXISTS "Service role can manage all credit history" ON credit_history;

-- Create new policies
CREATE POLICY "Users can view own credit history" ON credit_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert credit history" ON credit_history
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all credit history" ON credit_history
  FOR ALL USING (auth.role() = 'service_role');

-- Enable RLS on user_credits table
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own credits" ON user_credits;
DROP POLICY IF EXISTS "Service role can manage all credits" ON user_credits;

-- Create new policies
CREATE POLICY "Users can view own credits" ON user_credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all credits" ON user_credits
  FOR ALL USING (auth.role() = 'service_role');

-- Enable RLS on users_meta table
ALTER TABLE users_meta ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own metadata" ON users_meta;
DROP POLICY IF EXISTS "Users can insert own metadata" ON users_meta;
DROP POLICY IF EXISTS "Users can update own metadata" ON users_meta;
DROP POLICY IF EXISTS "Service role can manage all user metadata" ON users_meta;

-- Create new policies
CREATE POLICY "Users can view own metadata" ON users_meta
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own metadata" ON users_meta
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own metadata" ON users_meta
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role can manage all user metadata" ON users_meta
  FOR ALL USING (auth.role() = 'service_role'); 