-- Fix Reaction Functions - Use BIGINT for thumbnail_id
-- This file fixes the toggle_reaction function to use BIGINT instead of UUID

-- First, drop any existing toggle_reaction functions to resolve conflicts
DROP FUNCTION IF EXISTS toggle_reaction(UUID, bigint, text);
DROP FUNCTION IF EXISTS toggle_reaction(UUID, UUID, text);

-- Create the correct toggle_reaction function with BIGINT thumbnail_id
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

-- Also ensure other reaction functions are correct
CREATE OR REPLACE FUNCTION get_reaction_count(
  p_thumbnail_id BIGINT,
  p_reaction_type TEXT DEFAULT 'love'
)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM thumbnail_reactions
    WHERE thumbnail_id = p_thumbnail_id 
    AND reaction_type = p_reaction_type
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION has_user_reacted(
  p_user_id UUID,
  p_thumbnail_id BIGINT,
  p_reaction_type TEXT DEFAULT 'love'
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM thumbnail_reactions
    WHERE user_id = p_user_id 
    AND thumbnail_id = p_thumbnail_id 
    AND reaction_type = p_reaction_type
  );
END;
$$ LANGUAGE plpgsql; 