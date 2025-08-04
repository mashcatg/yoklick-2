import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import DodoPayments from "dodopayments";
import { rateLimit } from "@/lib/rateLimit";

const DODO_API_KEY = process.env.DODO_PAYMENTS_API_KEY || process.env.DODO_API_KEY;

export async function POST(req: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimit(req, 'subscription');
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  try {
    // Get user from request headers
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Please sign in to continue" }, { status: 401 });
    }

    const accessToken = authHeader.replace('Bearer ', '');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const { subscriptionId } = await req.json();
    if (!subscriptionId) {
      return NextResponse.json({ error: "Subscription ID is required" }, { status: 400 });
    }

    // Verify subscription belongs to user
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("subscription_id", subscriptionId)
      .eq("user_id", user.id)
      .single();

    if (subError || !subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    // Initialize Dodo Payments client
    const isDevelopment = process.env.NODE_ENV === 'development';
    const environment = isDevelopment ? 'test_mode' : 'live_mode';
    
    const client = new DodoPayments({
      bearerToken: DODO_API_KEY!,
      environment: environment,
    });

    // Remove cancellation at next billing date (enable auto-renew)
    const updatedSubscription = await client.subscriptions.update(subscriptionId, {
      cancel_at_next_billing_date: false
    });

    // Update local database
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        updated_at: new Date().toISOString(),
        metadata: {
          ...subscription.metadata,
          cancel_at_next_billing_date: false,
          auto_renew_enabled: true,
          auto_renew_updated_at: new Date().toISOString()
        }
      })
      .eq("subscription_id", subscriptionId);

    if (updateError) {
      console.error("Error updating subscription:", updateError);
      return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
    }

    // Log auto-renewal enablement
    await supabase
      .from("credit_history")
      .insert({
        user_id: user.id,
        credits_added: 0,
        credits_used: 0,
        credits_remaining: 0,
        action: "auto_renew_enabled",
        subscription_id: subscriptionId,
        plan_type: subscription.plan_type,
        created_at: new Date().toISOString(),
        expires_at: new Date().toISOString(),
        metadata: {
          enabled_at: new Date().toISOString()
        }
      });

    return NextResponse.json({
      success: true,
      message: "Auto-renewal enabled successfully",
      subscription: updatedSubscription
    });

  } catch (error) {
    console.error("Enable auto-renew error:", error);
    return NextResponse.json({ 
      error: "Failed to enable auto-renewal",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 