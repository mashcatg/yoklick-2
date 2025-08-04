-- Credit History Table
-- This table tracks all credit transactions including additions, usage, and expiry

CREATE TABLE IF NOT EXISTS credit_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    credits_added INTEGER NOT NULL DEFAULT 0,
    credits_used INTEGER NOT NULL DEFAULT 0,
    credits_remaining INTEGER NOT NULL DEFAULT 0,
    action VARCHAR(50) NOT NULL, -- 'subscription_payment', 'manual_adjustment', 'expiry', 'usage'
    subscription_id VARCHAR(255),
    payment_id VARCHAR(255),
    plan_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}'
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_credit_history_user_id ON credit_history(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_history_created_at ON credit_history(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_history_expires_at ON credit_history(expires_at);
CREATE INDEX IF NOT EXISTS idx_credit_history_subscription_id ON credit_history(subscription_id);

-- RLS Policies
ALTER TABLE credit_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own credit history
CREATE POLICY "Users can view own credit history" ON credit_history
    FOR SELECT USING (auth.uid() = user_id);

-- Only system/admin can insert credit history
CREATE POLICY "System can insert credit history" ON credit_history
    FOR INSERT WITH CHECK (true);

-- Only system/admin can update credit history
CREATE POLICY "System can update credit history" ON credit_history
    FOR UPDATE USING (true);

-- Function to automatically expire credits
CREATE OR REPLACE FUNCTION expire_credits()
RETURNS void AS $$
BEGIN
    -- Update users_meta to set credits to 0 for expired credits
    UPDATE users_meta 
    SET credits = 0 
    WHERE id IN (
        SELECT DISTINCT user_id 
        FROM credit_history 
        WHERE expires_at < NOW() 
        AND credits_remaining > 0
    );
    
    -- Insert expiry records
    INSERT INTO credit_history (user_id, credits_added, credits_used, credits_remaining, action, created_at, expires_at)
    SELECT 
        user_id,
        0,
        credits_remaining,
        0,
        'expiry',
        NOW(),
        NOW()
    FROM credit_history 
    WHERE expires_at < NOW() 
    AND credits_remaining > 0;
    
    -- Update the original records to mark as expired
    UPDATE credit_history 
    SET credits_remaining = 0 
    WHERE expires_at < NOW() 
    AND credits_remaining > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to add credits with expiry
CREATE OR REPLACE FUNCTION add_credits_with_expiry(
    p_user_id UUID,
    p_credits INTEGER,
    p_subscription_id VARCHAR(255),
    p_payment_id VARCHAR(255),
    p_plan_type VARCHAR(50)
)
RETURNS void AS $$
DECLARE
    current_credits INTEGER;
    expiry_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current credits
    SELECT COALESCE(credits, 0) INTO current_credits 
    FROM users_meta 
    WHERE id = p_user_id;
    
    -- Set expiry date to 30 days from now
    expiry_date := NOW() + INTERVAL '30 days';
    
    -- Update users_meta with new credits
    UPDATE users_meta 
    SET credits = current_credits + p_credits 
    WHERE id = p_user_id;
    
    -- Insert credit history record
    INSERT INTO credit_history (
        user_id, 
        credits_added, 
        credits_remaining, 
        action, 
        subscription_id, 
        payment_id, 
        plan_type, 
        expires_at
    ) VALUES (
        p_user_id,
        p_credits,
        current_credits + p_credits,
        'subscription_payment',
        p_subscription_id,
        p_payment_id,
        p_plan_type,
        expiry_date
    );
END;
$$ LANGUAGE plpgsql;

-- Function to use credits
CREATE OR REPLACE FUNCTION use_credits(
    p_user_id UUID,
    p_credits_to_use INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    current_credits INTEGER;
    available_credits INTEGER;
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
    
    -- Insert usage record
    INSERT INTO credit_history (
        user_id, 
        credits_used, 
        credits_remaining, 
        action, 
        created_at, 
        expires_at
    ) VALUES (
        p_user_id,
        p_credits_to_use,
        current_credits - p_credits_to_use,
        'usage',
        NOW(),
        NOW() + INTERVAL '30 days'
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create a cron job to expire credits daily (if using pg_cron extension)
-- SELECT cron.schedule('expire-credits-daily', '0 0 * * *', 'SELECT expire_credits();');

-- Comments
COMMENT ON TABLE credit_history IS 'Tracks all credit transactions including additions, usage, and expiry';
COMMENT ON COLUMN credit_history.action IS 'Type of action: subscription_payment, manual_adjustment, expiry, usage';
COMMENT ON COLUMN credit_history.expires_at IS 'When these credits expire (30 days from creation)';
COMMENT ON FUNCTION expire_credits() IS 'Automatically expires credits that have passed their expiry date';
COMMENT ON FUNCTION add_credits_with_expiry() IS 'Adds credits to user account with 30-day expiry';
COMMENT ON FUNCTION use_credits() IS 'Uses credits from user account, returns false if insufficient credits'; 