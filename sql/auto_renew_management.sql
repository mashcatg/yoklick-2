-- Auto-Renew Management Functions
-- This file contains functions for managing subscription auto-renewal

-- Function to check subscription health and auto-renew status
CREATE OR REPLACE FUNCTION check_subscription_health(p_user_id UUID)
RETURNS TABLE(
    subscription_id VARCHAR(255),
    status VARCHAR(50),
    plan_type VARCHAR(50),
    auto_renew_enabled BOOLEAN,
    next_billing_date TIMESTAMP WITH TIME ZONE,
    days_until_renewal INTEGER,
    payment_method_valid BOOLEAN,
    last_payment_status VARCHAR(50),
    health_status VARCHAR(50),
    health_message TEXT
) AS $$
DECLARE
    sub_record RECORD;
    days_diff INTEGER;
BEGIN
    -- Get the latest subscription for the user
    SELECT * INTO sub_record
    FROM subscriptions
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;

    -- If no subscription found
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            NULL::VARCHAR(255),
            'free'::VARCHAR(50),
            NULL::VARCHAR(50),
            TRUE::BOOLEAN, -- Auto-renewal is always enabled by default
            NULL::TIMESTAMP WITH TIME ZONE,
            NULL::INTEGER,
            FALSE::BOOLEAN,
            NULL::VARCHAR(50),
            'no_subscription'::VARCHAR(50),
            'No active subscription found'::TEXT;
        RETURN;
    END IF;

    -- Calculate days until renewal
    IF sub_record.next_billing_date IS NOT NULL THEN
        days_diff := EXTRACT(EPOCH FROM (sub_record.next_billing_date - NOW())) / 86400;
    ELSE
        days_diff := NULL;
    END IF;

    -- Determine health status - auto-renewal is always enabled unless explicitly cancelled
    RETURN QUERY SELECT 
        sub_record.subscription_id,
        sub_record.status,
        sub_record.plan_type,
        (sub_record.status = 'active' AND NOT (sub_record.metadata->>'cancel_at_next_billing_date')::BOOLEAN)::BOOLEAN,
        sub_record.next_billing_date,
        days_diff::INTEGER,
        (sub_record.status = 'active')::BOOLEAN,
        (SELECT t.status FROM transactions t WHERE t.subscription_id = sub_record.subscription_id ORDER BY t.created_at DESC LIMIT 1),
        CASE 
            WHEN sub_record.status = 'past_due' THEN 'past_due'
            WHEN sub_record.status = 'cancelled' THEN 'cancelled'
            WHEN (sub_record.metadata->>'cancel_at_next_billing_date')::BOOLEAN THEN 'cancelling'
            WHEN days_diff <= 3 AND days_diff > 0 THEN 'renewal_soon'
            ELSE 'healthy'
        END::VARCHAR(50),
        CASE 
            WHEN sub_record.status = 'past_due' THEN 'Payment is past due'
            WHEN sub_record.status = 'cancelled' THEN 'Subscription has been cancelled'
            WHEN (sub_record.metadata->>'cancel_at_next_billing_date')::BOOLEAN THEN 'Subscription will be cancelled at next billing date'
            WHEN days_diff <= 3 AND days_diff > 0 THEN 'Renewal is coming up soon'
            ELSE 'Subscription is healthy and will auto-renew'
        END::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to get upcoming renewals (for cron job)
CREATE OR REPLACE FUNCTION get_upcoming_renewals(p_days_ahead INTEGER DEFAULT 7)
RETURNS TABLE(
    user_id UUID,
    subscription_id VARCHAR(255),
    plan_type VARCHAR(50),
    next_billing_date TIMESTAMP WITH TIME ZONE,
    days_until_renewal INTEGER,
    user_email TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.user_id,
        s.subscription_id,
        s.plan_type,
        s.next_billing_date,
        EXTRACT(EPOCH FROM (s.next_billing_date - NOW())) / 86400::INTEGER as days_until_renewal,
        u.email
    FROM subscriptions s
    JOIN auth.users u ON s.user_id = u.id
    WHERE s.status = 'active'
    AND s.next_billing_date BETWEEN NOW() AND NOW() + (p_days_ahead || ' days')::INTERVAL
    AND NOT (s.metadata->>'cancel_at_next_billing_date')::BOOLEAN
    ORDER BY s.next_billing_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get failed payments that need retry
CREATE OR REPLACE FUNCTION get_failed_payments_for_retry(p_days_back INTEGER DEFAULT 30)
RETURNS TABLE(
    user_id UUID,
    subscription_id VARCHAR(255),
    payment_id VARCHAR(255),
    failure_reason TEXT,
    retry_count INTEGER,
    last_failure_date TIMESTAMP WITH TIME ZONE,
    user_email TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ch.user_id,
        ch.subscription_id,
        ch.payment_id,
        ch.metadata->>'failure_reason' as failure_reason,
        COALESCE((ch.metadata->>'retry_count')::INTEGER, 0) as retry_count,
        ch.created_at as last_failure_date,
        u.email
    FROM credit_history ch
    JOIN auth.users u ON ch.user_id = u.id
    WHERE ch.action = 'payment_failed'
    AND ch.created_at >= NOW() - (p_days_back || ' days')::INTERVAL
    AND (ch.metadata->>'retry_count')::INTEGER < 3  -- Max 3 retries
    ORDER BY ch.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to log auto-renewal events
CREATE OR REPLACE FUNCTION log_auto_renew_event(
    p_user_id UUID,
    p_subscription_id VARCHAR(255),
    p_event_type VARCHAR(50),
    p_details JSONB DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
    INSERT INTO credit_history (
        user_id,
        credits_added,
        credits_used,
        credits_remaining,
        action,
        subscription_id,
        created_at,
        expires_at,
        metadata
    ) VALUES (
        p_user_id,
        0,
        0,
        0,
        p_event_type,
        p_subscription_id,
        NOW(),
        NOW(),
        p_details
    );
END;
$$ LANGUAGE plpgsql;

-- Function to update subscription auto-renew status
CREATE OR REPLACE FUNCTION update_auto_renew_status(
    p_subscription_id VARCHAR(255),
    p_enabled BOOLEAN,
    p_reason TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    UPDATE subscriptions
    SET 
        metadata = metadata || jsonb_build_object(
            'auto_renew_enabled', p_enabled,
            'auto_renew_updated_at', NOW(),
            'auto_renew_reason', p_reason
        ),
        updated_at = NOW()
    WHERE subscription_id = p_subscription_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get subscription lifecycle events
CREATE OR REPLACE FUNCTION get_subscription_lifecycle_events(p_user_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE(
    event_type VARCHAR(50),
    event_date TIMESTAMP WITH TIME ZONE,
    details JSONB,
    subscription_id VARCHAR(255),
    plan_type VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ch.action as event_type,
        ch.created_at as event_date,
        ch.metadata as details,
        ch.subscription_id,
        ch.plan_type
    FROM credit_history ch
    WHERE ch.user_id = p_user_id
    AND ch.action IN (
        'subscription_payment',
        'subscription_renewal',
        'subscription_cancelled',
        'subscription_expired',
        'auto_renew_enabled',
        'auto_renew_disabled',
        'payment_failed',
        'subscription_activation'
    )
    ORDER BY ch.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to check if subscription needs attention
CREATE OR REPLACE FUNCTION check_subscription_attention_needed(p_user_id UUID)
RETURNS TABLE(
    needs_attention BOOLEAN,
    attention_type VARCHAR(50),
    attention_message TEXT,
    subscription_id VARCHAR(255)
) AS $$
DECLARE
    sub_record RECORD;
    days_until_renewal INTEGER;
    last_payment_status VARCHAR(50);
BEGIN
    -- Get the latest subscription
    SELECT * INTO sub_record
    FROM subscriptions
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;

    -- If no subscription, no attention needed
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL, NULL, NULL;
        RETURN;
    END IF;

    -- Calculate days until renewal
    IF sub_record.next_billing_date IS NOT NULL THEN
        days_until_renewal := EXTRACT(EPOCH FROM (sub_record.next_billing_date - NOW())) / 86400;
    ELSE
        days_until_renewal := NULL;
    END IF;

    -- Get last payment status
    SELECT t.status INTO last_payment_status
    FROM transactions t
    WHERE t.subscription_id = sub_record.subscription_id
    ORDER BY t.created_at DESC
    LIMIT 1;

    -- Determine if attention is needed - auto-renewal is always enabled unless cancelled
    IF sub_record.status = 'past_due' THEN
        RETURN QUERY SELECT TRUE, 'payment_past_due', 'Your payment is past due. Please update your payment method to continue auto-renewal.', sub_record.subscription_id;
    ELSIF last_payment_status = 'failed' THEN
        RETURN QUERY SELECT TRUE, 'payment_failed', 'Your last payment failed. Please update your payment method to continue auto-renewal.', sub_record.subscription_id;
    ELSIF days_until_renewal <= 3 AND days_until_renewal > 0 THEN
        RETURN QUERY SELECT TRUE, 'renewal_soon', 'Your subscription will auto-renew soon. Please ensure your payment method is up to date.', sub_record.subscription_id;
    ELSIF (sub_record.metadata->>'cancel_at_next_billing_date')::BOOLEAN THEN
        RETURN QUERY SELECT TRUE, 'cancelling', 'Your subscription will be cancelled at the next billing date. Auto-renewal has been disabled.', sub_record.subscription_id;
    ELSE
        RETURN QUERY SELECT FALSE, NULL, NULL, sub_record.subscription_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing_date ON subscriptions(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_credit_history_action ON credit_history(action);
CREATE INDEX IF NOT EXISTS idx_credit_history_subscription_id ON credit_history(subscription_id); 