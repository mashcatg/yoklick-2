-- =====================================================
-- ADD MISSING COLUMNS TO FIX API ERRORS
-- Yoklick Project - Database Schema Fix
-- =====================================================

-- 1. ADD METADATA COLUMN TO SUBSCRIPTIONS TABLE
-- =====================================================
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 2. ADD ANY OTHER MISSING COLUMNS THAT MIGHT BE NEEDED
-- =====================================================

-- Add metadata column to transactions if it doesn't exist
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Add any missing columns to credit_history
ALTER TABLE credit_history 
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 3. UPDATE EXISTING RECORDS WITH DEFAULT METADATA
-- =====================================================

-- Update existing subscriptions with default metadata
UPDATE subscriptions 
SET metadata = '{"plan_type": "free", "plan_name": "free"}'::jsonb
WHERE metadata IS NULL OR metadata = '{}'::jsonb;

-- Update existing transactions with default metadata
UPDATE transactions 
SET metadata = '{}'::jsonb
WHERE metadata IS NULL;

-- Update existing credit_history with default metadata
UPDATE credit_history 
SET metadata = '{}'::jsonb
WHERE metadata IS NULL;

-- 4. CREATE INDEXES FOR BETTER PERFORMANCE
-- =====================================================

-- Create GIN index for metadata columns (for JSON queries)
CREATE INDEX IF NOT EXISTS idx_subscriptions_metadata ON subscriptions USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_transactions_metadata ON transactions USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_credit_history_metadata ON credit_history USING GIN (metadata);

-- 5. VERIFICATION QUERIES
-- =====================================================

-- Check if metadata column was added successfully
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
  AND column_name = 'metadata';

-- Check all subscriptions table columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'subscriptions'
ORDER BY ordinal_position;

-- =====================================================
-- END OF SCHEMA FIX SCRIPT
-- ===================================================== 