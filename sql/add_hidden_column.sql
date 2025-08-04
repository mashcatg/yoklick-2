-- Add is_hidden column to thumbnails table
ALTER TABLE thumbnails ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- Create index for better performance when filtering hidden thumbnails
CREATE INDEX IF NOT EXISTS idx_thumbnails_is_hidden ON thumbnails(is_hidden);

-- Update explore page queries to exclude hidden thumbnails
-- This will be handled in the application code by adding WHERE is_hidden = FALSE
-- to queries that fetch public thumbnails for the explore page 