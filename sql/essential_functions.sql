-- Essential Functions for Yoklick
-- Run this file to create the basic functions

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

-- Comments
COMMENT ON FUNCTION add_credits_simple() IS 'Adds credits to user account (simple version without expiry)';
COMMENT ON FUNCTION use_credits_simple() IS 'Uses credits from user account, returns false if insufficient credits';
COMMENT ON FUNCTION get_user_credits() IS 'Gets current credit balance for a user'; 