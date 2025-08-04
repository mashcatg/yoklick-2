-- Clean Essential Functions for Yoklick
-- Run this file to create all necessary functions and tables

-- =====================================================
-- CREDIT MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to add credits (simple version without expiry)
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
    -- Get current credits
    SELECT COALESCE(credits, 0) INTO current_credits 
    FROM users_meta 
    WHERE id = p_user_id;
    
    -- Update users_meta with new credits
    UPDATE users_meta 
    SET credits = current_credits + p_credits 
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
    -- Get current credits
    SELECT COALESCE(credits, 0) INTO current_credits 
    FROM users_meta 
    WHERE id = p_user_id;
    
    -- Check if user has enough credits
    IF current_credits < p_credits_to_use THEN
        RETURN FALSE;
    END IF;
    
    -- Update users_meta
    UPDATE users_meta 
    SET credits = current_credits - p_credits_to_use 
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
    
    RETURN user_credits;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS POLICIES FOR CREDIT TABLES
-- =====================================================

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

-- =====================================================
-- AI SUGGESTION SYSTEM TABLES
-- =====================================================

-- Table: thumbnail_tags (tags extracted from thumbnails)
CREATE TABLE IF NOT EXISTS thumbnail_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thumbnail_id BIGINT REFERENCES thumbnails(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    confidence_score FLOAT DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: user_preferences (user's interest tracking)
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    interest_score FLOAT DEFAULT 0.0,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, tag)
);

-- Table: thumbnail_analytics (view and interaction tracking)
CREATE TABLE IF NOT EXISTS thumbnail_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thumbnail_id BIGINT REFERENCES thumbnails(id) ON DELETE CASCADE,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    modal_open_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: user_interactions (detailed user behavior tracking)
CREATE TABLE IF NOT EXISTS user_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    thumbnail_id BIGINT REFERENCES thumbnails(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL, -- 'view', 'like', 'share', 'download', 'modal_open'
    interaction_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- FUNCTIONS FOR AI SUGGESTION SYSTEM
-- =====================================================

-- Function: Update user preferences based on interaction
CREATE OR REPLACE FUNCTION update_user_preferences(
    p_user_id UUID,
    p_thumbnail_id BIGINT,
    p_interaction_type TEXT
)
RETURNS void AS $$
DECLARE
    tag_record RECORD;
    weight FLOAT;
BEGIN
    -- Set weight based on interaction type
    CASE p_interaction_type
        WHEN 'like' THEN weight := 2.0;
        WHEN 'modal_open' THEN weight := 1.5;
        WHEN 'view' THEN weight := 1.0;
        WHEN 'share' THEN weight := 1.8;
        WHEN 'download' THEN weight := 1.3;
        ELSE weight := 0.5;
    END CASE;

    -- Update preferences for each tag of the thumbnail
    FOR tag_record IN 
        SELECT tag, confidence_score 
        FROM thumbnail_tags 
        WHERE thumbnail_id = p_thumbnail_id
    LOOP
        INSERT INTO user_preferences (user_id, tag, interest_score, view_count, like_count, last_interaction)
        VALUES (p_user_id, tag_record.tag, tag_record.confidence_score * weight, 
                CASE WHEN p_interaction_type = 'view' OR p_interaction_type = 'modal_open' THEN 1 ELSE 0 END,
                CASE WHEN p_interaction_type = 'like' THEN 1 ELSE 0 END,
                NOW())
        ON CONFLICT (user_id, tag) 
        DO UPDATE SET 
            interest_score = user_preferences.interest_score + (tag_record.confidence_score * weight),
            view_count = user_preferences.view_count + 
                CASE WHEN p_interaction_type = 'view' OR p_interaction_type = 'modal_open' THEN 1 ELSE 0 END,
            like_count = user_preferences.like_count + 
                CASE WHEN p_interaction_type = 'like' THEN 1 ELSE 0 END,
            last_interaction = NOW(),
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function: Get personalized thumbnail recommendations
CREATE OR REPLACE FUNCTION get_personalized_recommendations(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    thumbnail_id BIGINT,
    relevance_score FLOAT,
    reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH user_tags AS (
        SELECT tag, interest_score
        FROM user_preferences
        WHERE user_id = p_user_id
        ORDER BY interest_score DESC
        LIMIT 10
    ),
    tag_matches AS (
        SELECT 
            tt.thumbnail_id,
            ut.tag,
            ut.interest_score,
            tt.confidence_score,
            (ut.interest_score * tt.confidence_score) as match_score
        FROM thumbnail_tags tt
        JOIN user_tags ut ON tt.tag = ut.tag
        WHERE tt.thumbnail_id NOT IN (
            -- Exclude thumbnails user has already interacted with
            SELECT DISTINCT thumbnail_id 
            FROM user_interactions 
            WHERE user_id = p_user_id
        )
    ),
    ranked_thumbnails AS (
        SELECT 
            tm.thumbnail_id,
            SUM(tm.match_score) as total_score,
            COUNT(DISTINCT tm.tag) as tag_count,
            STRING_AGG(tm.tag, ', ') as matched_tags
        FROM tag_matches tm
        GROUP BY tm.thumbnail_id
        ORDER BY total_score DESC, tag_count DESC
    )
    SELECT 
        rt.thumbnail_id,
        rt.total_score as relevance_score,
        'Matched tags: ' || rt.matched_tags as reason
    FROM ranked_thumbnails rt
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Get trending thumbnails (popularity-based)
CREATE OR REPLACE FUNCTION get_trending_thumbnails(
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    thumbnail_id BIGINT,
    popularity_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ta.thumbnail_id,
        (ta.like_count * 2 + ta.view_count + ta.share_count * 1.5 + ta.download_count * 0.8) as popularity_score
    FROM thumbnail_analytics ta
    ORDER BY popularity_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS POLICIES FOR NEW TABLES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE thumbnail_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE thumbnail_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;

-- Thumbnail tags policies
CREATE POLICY "Users can view all thumbnail tags" ON thumbnail_tags
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage thumbnail tags" ON thumbnail_tags
  FOR ALL USING (auth.role() = 'service_role');

-- User preferences policies
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage user preferences" ON user_preferences
  FOR ALL USING (auth.role() = 'service_role');

-- Thumbnail analytics policies
CREATE POLICY "Users can view all thumbnail analytics" ON thumbnail_analytics
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage thumbnail analytics" ON thumbnail_analytics
  FOR ALL USING (auth.role() = 'service_role');

-- User interactions policies
CREATE POLICY "Users can view own interactions" ON user_interactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage user interactions" ON user_interactions
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_thumbnail_tags_thumbnail_id ON thumbnail_tags(thumbnail_id);
CREATE INDEX IF NOT EXISTS idx_thumbnail_tags_tag ON thumbnail_tags(tag);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_tag ON user_preferences(tag);
CREATE INDEX IF NOT EXISTS idx_thumbnail_analytics_thumbnail_id ON thumbnail_analytics(thumbnail_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_thumbnail_id ON user_interactions(thumbnail_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON user_interactions(interaction_type);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION add_credits_simple() IS 'Adds credits to user account (simple version without expiry)';
COMMENT ON FUNCTION use_credits_simple() IS 'Uses credits from user account, returns false if insufficient credits';
COMMENT ON FUNCTION get_user_credits() IS 'Gets current credit balance for a user';
COMMENT ON FUNCTION update_user_preferences() IS 'Updates user preferences based on interaction with thumbnails';
COMMENT ON FUNCTION get_personalized_recommendations() IS 'Gets personalized thumbnail recommendations based on user preferences';
COMMENT ON FUNCTION get_trending_thumbnails() IS 'Gets trending thumbnails based on popularity metrics'; 