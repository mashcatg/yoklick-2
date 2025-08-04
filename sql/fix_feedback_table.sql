-- Fix feedback table to ensure all required columns exist
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN DEFAULT FALSE;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_is_reviewed ON feedback(is_reviewed);
CREATE INDEX IF NOT EXISTS idx_feedback_is_featured ON feedback(is_featured);
CREATE INDEX IF NOT EXISTS idx_feedback_reviewed_by ON feedback(reviewed_by); 