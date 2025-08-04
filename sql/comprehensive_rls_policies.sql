-- =====================================================
-- COMPREHENSIVE RLS POLICIES FOR YOKLICK
-- =====================================================

-- =====================================================
-- 1. USERS_META TABLE RLS POLICIES
-- =====================================================

-- Enable RLS on users_meta table
ALTER TABLE users_meta ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own metadata
CREATE POLICY "Users can view own metadata" ON users_meta
  FOR SELECT USING (auth.uid() = id);

-- Policy 2: Users can insert their own metadata
CREATE POLICY "Users can insert own metadata" ON users_meta
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy 3: Users can update their own metadata
CREATE POLICY "Users can update own metadata" ON users_meta
  FOR UPDATE USING (auth.uid() = id);

-- Policy 4: Service role can manage all user metadata (for admin operations)
CREATE POLICY "Service role can manage all user metadata" ON users_meta
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 2. USER_CREDITS TABLE RLS POLICIES
-- =====================================================

-- Enable RLS on user_credits table
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own credits
CREATE POLICY "Users can view own credits" ON user_credits
  FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Users can update their own credits
CREATE POLICY "Users can update own credits" ON user_credits
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy 3: Service role can manage all credits (for admin operations)
CREATE POLICY "Service role can manage all credits" ON user_credits
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 3. CREDIT_HISTORY TABLE RLS POLICIES
-- =====================================================

-- Enable RLS on credit_history table
ALTER TABLE credit_history ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own credit history
CREATE POLICY "Users can view own credit history" ON credit_history
  FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Service role can insert credit history (for system operations)
CREATE POLICY "Service role can insert credit history" ON credit_history
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Policy 3: Service role can manage all credit history (for admin operations)
CREATE POLICY "Service role can manage all credit history" ON credit_history
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 4. SUBSCRIPTIONS TABLE RLS POLICIES
-- =====================================================

-- Enable RLS on subscriptions table
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Service role can insert subscriptions (for system operations)
CREATE POLICY "Service role can insert subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Policy 3: Service role can update subscriptions (for system operations)
CREATE POLICY "Service role can update subscriptions" ON subscriptions
  FOR UPDATE USING (auth.role() = 'service_role');

-- Policy 4: Service role can manage all subscriptions (for admin operations)
CREATE POLICY "Service role can manage all subscriptions" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 5. TRANSACTIONS TABLE RLS POLICIES
-- =====================================================

-- Enable RLS on transactions table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own transactions
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Service role can insert transactions (for system operations)
CREATE POLICY "Service role can insert transactions" ON transactions
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Policy 3: Service role can manage all transactions (for admin operations)
CREATE POLICY "Service role can manage all transactions" ON transactions
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 6. FEEDBACK TABLE RLS POLICIES
-- =====================================================

-- Enable RLS on feedback table
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can insert their own feedback
CREATE POLICY "Users can insert own feedback" ON feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy 2: Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON feedback
  FOR SELECT USING (auth.uid() = user_id);

-- Policy 3: Service role can manage all feedback (for admin operations)
CREATE POLICY "Service role can manage all feedback" ON feedback
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 7. THUMBNAILS TABLE RLS POLICIES (ENHANCED)
-- =====================================================

-- Enable RLS on thumbnails table
ALTER TABLE thumbnails ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own thumbnails (public and private)
CREATE POLICY "Users can view own thumbnails" ON thumbnails
  FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Anyone can view public thumbnails (for explore and homepage)
CREATE POLICY "Anyone can view public thumbnails" ON thumbnails
  FOR SELECT USING (is_public = true AND is_hidden = false);

-- Policy 3: Users can insert their own thumbnails
CREATE POLICY "Users can insert own thumbnails" ON thumbnails
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can update their own thumbnails
CREATE POLICY "Users can update own thumbnails" ON thumbnails
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy 5: Users can delete their own thumbnails
CREATE POLICY "Users can delete own thumbnails" ON thumbnails
  FOR DELETE USING (auth.uid() = user_id);

-- Policy 6: Service role can manage all thumbnails (for admin operations)
CREATE POLICY "Service role can manage all thumbnails" ON thumbnails
  FOR ALL USING (auth.role() = 'service_role');

-- Policy 7: Featured thumbnails for homepage
CREATE POLICY "Anyone can view featured thumbnails" ON thumbnails
  FOR SELECT USING (is_featured = true AND is_public = true AND is_hidden = false);

-- =====================================================
-- 8. ADDITIONAL SECURITY POLICIES
-- =====================================================

-- Policy for admin access to all tables (service role only)
-- This ensures that admin operations through backend APIs work correctly

-- =====================================================
-- 9. INDEXES FOR PERFORMANCE
-- =====================================================

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_meta_id ON users_meta(id);
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_history_user_id ON credit_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_thumbnails_user_id ON thumbnails(user_id);
CREATE INDEX IF NOT EXISTS idx_thumbnails_public ON thumbnails(is_public, is_hidden);
CREATE INDEX IF NOT EXISTS idx_thumbnails_featured ON thumbnails(is_featured, is_public, is_hidden);

-- =====================================================
-- 10. VERIFICATION QUERIES
-- =====================================================

-- Check if RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('users_meta', 'user_credits', 'credit_history', 'subscriptions', 'transactions', 'feedback', 'thumbnails')
ORDER BY tablename;

-- Check policies on each table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('users_meta', 'user_credits', 'credit_history', 'subscriptions', 'transactions', 'feedback', 'thumbnails')
ORDER BY tablename, policyname; 