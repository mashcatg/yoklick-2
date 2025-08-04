import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    // Get user from request headers (client-side auth)
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

    // Get subscription ID from query params
    const { searchParams } = new URL(req.url);
    const subscriptionId = searchParams.get('subscription_id');

    if (!subscriptionId) {
      return NextResponse.json({ error: "Subscription ID is required" }, { status: 400 });
    }

    console.log("Looking up subscription:", subscriptionId, "for user:", user.id);

    // Try to get subscription from database
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("subscription_id", subscriptionId)
      .eq("user_id", user.id)
      .limit(1);

    if (subscriptionError) {
      console.error("Database error:", subscriptionError);
      return NextResponse.json({ 
        error: "Failed to lookup subscription",
        details: subscriptionError.message 
      }, { status: 500 });
    }

    // If subscription found in database
    if (subscriptionData && subscriptionData.length > 0) {
      const subscription = subscriptionData[0];
      return NextResponse.json({
        success: true,
        subscription: {
          id: subscription.subscription_id,
          status: subscription.status,
          plan_type: subscription.plan_type,
          amount: subscription.amount,
          created_at: subscription.created_at,
          metadata: subscription.metadata || {
            plan_type: subscription.plan_type,
            plan_name: subscription.plan_type
          }
        }
      });
    }

    // If subscription not found in database, check if it's a new subscription
    // that might be created in Dodo Payments but not yet synced
    console.log("Subscription not found in database, checking user metadata...");

    // Check user metadata for subscription info
    const { data: userMeta } = await supabase
      .from("users_meta")
      .select("*")
      .eq("id", user.id)
      .single();

    if (userMeta?.subscription_id === subscriptionId) {
      // Subscription exists in user metadata but not in subscriptions table
      // This might be a new subscription that needs to be synced
      return NextResponse.json({
        success: true,
        subscription: {
          id: subscriptionId,
          status: "pending",
          plan_type: userMeta.plan_type || "free",
          amount: 0,
          created_at: userMeta.subscription_created_at || new Date().toISOString(),
          metadata: {
            plan_type: userMeta.plan_type || "free",
            plan_name: userMeta.plan_type || "free"
          }
        },
        needsSync: true
      });
    }

    // Subscription not found anywhere
    return NextResponse.json({
      success: false,
      error: "Subscription not found",
      subscription: null
    }, { status: 404 });

  } catch (error) {
    console.error("Subscription lookup error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 