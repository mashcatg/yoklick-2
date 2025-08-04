-- Enhance users_meta table with user profile data for AI suggestions
-- Add new columns to store user preferences and behavior

ALTER TABLE users_meta 
ADD COLUMN IF NOT EXISTS user_interests JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS recent_searches JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS viewed_thumbnails JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS favorite_themes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_preferences JSONB DEFAULT '{}'::jsonb;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_meta_interests ON users_meta USING GIN (user_interests);
CREATE INDEX IF NOT EXISTS idx_users_meta_searches ON users_meta USING GIN (recent_searches);
CREATE INDEX IF NOT EXISTS idx_users_meta_viewed ON users_meta USING GIN (viewed_thumbnails);

-- Function to update user interests
CREATE OR REPLACE FUNCTION update_user_interests(
  p_user_id UUID,
  p_interests TEXT[]
)
RETURNS VOID AS $$
BEGIN
  UPDATE users_meta 
  SET user_interests = array_to_json(p_interests)::jsonb,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to add recent search
CREATE OR REPLACE FUNCTION add_recent_search(
  p_user_id UUID,
  p_search_term TEXT
)
RETURNS VOID AS $$
DECLARE
  current_searches JSONB;
BEGIN
  -- Get current searches
  SELECT recent_searches INTO current_searches 
  FROM users_meta 
  WHERE id = p_user_id;
  
  -- Add new search term to the beginning (most recent first)
  current_searches = jsonb_build_array(p_search_term) || current_searches;
  
  -- Keep only last 10 searches
  current_searches = current_searches - 10;
  
  UPDATE users_meta 
  SET recent_searches = current_searches,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to add viewed thumbnail
CREATE OR REPLACE FUNCTION add_viewed_thumbnail(
  p_user_id UUID,
  p_thumbnail_id UUID,
  p_prompt TEXT
)
RETURNS VOID AS $$
DECLARE
  current_viewed JSONB;
BEGIN
  -- Get current viewed thumbnails
  SELECT viewed_thumbnails INTO current_viewed 
  FROM users_meta 
  WHERE id = p_user_id;
  
  -- Add new thumbnail to the beginning
  current_viewed = jsonb_build_object('id', p_thumbnail_id, 'prompt', p_prompt, 'viewed_at', NOW()) || current_viewed;
  
  -- Keep only last 20 viewed thumbnails
  current_viewed = current_viewed - 20;
  
  UPDATE users_meta 
  SET viewed_thumbnails = current_viewed,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update AI preferences
CREATE OR REPLACE FUNCTION update_ai_preferences(
  p_user_id UUID,
  p_preferences JSONB
)
RETURNS VOID AS $$
BEGIN
  UPDATE users_meta 
  SET ai_preferences = p_preferences,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql; 