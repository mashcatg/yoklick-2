-- Enable RLS on thumbnails table
ALTER TABLE thumbnails ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own thumbnails (public and private)
CREATE POLICY "Users can view own thumbnails" ON thumbnails
  FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Users can view public thumbnails (for explore and homepage)
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

-- Policy 6: Admin access (bypass RLS for admin operations)
-- This will be handled by backend APIs using service role
-- No direct admin policy needed as admin operations go through backend

-- Policy 7: Featured thumbnails for homepage
CREATE POLICY "Anyone can view featured thumbnails" ON thumbnails
  FOR SELECT USING (is_featured = true AND is_public = true AND is_hidden = false);

-- Policy 8: Profile page access (user's own thumbnails)
CREATE POLICY "Users can view own thumbnails in profile" ON thumbnails
  FOR SELECT USING (auth.uid() = user_id);

-- Policy 9: Generations page access (user's own thumbnails)
CREATE POLICY "Users can view own thumbnails in generations" ON thumbnails
  FOR SELECT USING (auth.uid() = user_id); 