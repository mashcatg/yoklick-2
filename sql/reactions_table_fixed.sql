-- Create reactions table for user likes/loves (FIXED VERSION)
CREATE TABLE IF NOT EXISTS thumbnail_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thumbnail_id BIGINT NOT NULL REFERENCES thumbnails(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'love' CHECK (reaction_type IN ('love', 'like', 'save')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, thumbnail_id, reaction_type)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON thumbnail_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_thumbnail_id ON thumbnail_reactions(thumbnail_id);
CREATE INDEX IF NOT EXISTS idx_reactions_type ON thumbnail_reactions(reaction_type);
CREATE INDEX IF NOT EXISTS idx_reactions_created_at ON thumbnail_reactions(created_at);

-- Function to toggle reaction
CREATE OR REPLACE FUNCTION toggle_reaction(
  p_user_id UUID,
  p_thumbnail_id BIGINT,
  p_reaction_type TEXT DEFAULT 'love'
)
RETURNS BOOLEAN AS $$
DECLARE
  existing_reaction UUID;
BEGIN
  -- Check if reaction already exists
  SELECT id INTO existing_reaction
  FROM thumbnail_reactions
  WHERE user_id = p_user_id 
    AND thumbnail_id = p_thumbnail_id 
    AND reaction_type = p_reaction_type;
  
  IF existing_reaction IS NOT NULL THEN
    -- Remove existing reaction
    DELETE FROM thumbnail_reactions
    WHERE id = existing_reaction;
    RETURN FALSE; -- Reaction removed
  ELSE
    -- Add new reaction
    INSERT INTO thumbnail_reactions (user_id, thumbnail_id, reaction_type)
    VALUES (p_user_id, p_thumbnail_id, p_reaction_type);
    RETURN TRUE; -- Reaction added
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get reaction count for a thumbnail
CREATE OR REPLACE FUNCTION get_reaction_count(
  p_thumbnail_id BIGINT,
  p_reaction_type TEXT DEFAULT 'love'
)
RETURNS INTEGER AS $$
DECLARE
  count_result INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_result
  FROM thumbnail_reactions
  WHERE thumbnail_id = p_thumbnail_id 
    AND reaction_type = p_reaction_type;
  
  RETURN count_result;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has reacted
CREATE OR REPLACE FUNCTION has_user_reacted(
  p_user_id UUID,
  p_thumbnail_id BIGINT,
  p_reaction_type TEXT DEFAULT 'love'
)
RETURNS BOOLEAN AS $$
DECLARE
  exists_result BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM thumbnail_reactions
    WHERE user_id = p_user_id 
      AND thumbnail_id = p_thumbnail_id 
      AND reaction_type = p_reaction_type
  ) INTO exists_result;
  
  RETURN exists_result;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for reactions table
ALTER TABLE thumbnail_reactions ENABLE ROW LEVEL SECURITY;

-- Users can view all reactions
CREATE POLICY "Users can view all reactions" ON thumbnail_reactions
  FOR SELECT USING (true);

-- Users can insert their own reactions
CREATE POLICY "Users can insert their own reactions" ON thumbnail_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own reactions
CREATE POLICY "Users can update their own reactions" ON thumbnail_reactions
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own reactions
CREATE POLICY "Users can delete their own reactions" ON thumbnail_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Service role can manage all reactions
CREATE POLICY "Service role can manage all reactions" ON thumbnail_reactions
  FOR ALL USING (auth.role() = 'service_role'); 