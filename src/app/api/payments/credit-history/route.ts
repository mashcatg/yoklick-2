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

    console.log("Fetching credit history for user:", user.id);

    // Get credit history from database
    const { data: creditHistory, error: creditHistoryError } = await supabase
      .from("credit_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (creditHistoryError) {
      console.error("Error fetching credit history:", creditHistoryError);
      return NextResponse.json({ 
        error: "Failed to fetch credit history",
        details: creditHistoryError.message 
      }, { status: 500 });
    }

    // Get user metadata for current credit balance
    const { data: userMeta, error: userMetaError } = await supabase
      .from("users_meta")
      .select("*")
      .eq("id", user.id)
      .single();

    // Calculate totals
    const totalCreditsEarned = creditHistory?.reduce((sum, record) => sum + (record.credits_added || 0), 0) || 0;
    const totalCreditsUsed = creditHistory?.reduce((sum, record) => sum + (record.credits_used || 0), 0) || 0;
    const currentCredits = userMeta?.credits || 0;

    // Get current subscription for plan details
    const { data: currentSubscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Determine plan details
    let planName = "Free Plan";
    let planType = "monthly";
    let nextBillingDate = null;
    let monthlyCredits = 0;

    if (currentSubscription) {
      const planTypeFromSub = currentSubscription.plan_type || currentSubscription.metadata?.plan_type;
      
      switch (planTypeFromSub?.toLowerCase()) {
        case 'creator':
          planName = "Creator Plan";
          monthlyCredits = 100;
          break;
        case 'pro':
          planName = "Pro Plan";
          monthlyCredits = 500;
          break;
        case 'enterprise':
          planName = "Enterprise Plan";
          monthlyCredits = 1000;
          break;
        case 'starter':
          planName = "Starter Plan";
          monthlyCredits = 50;
          break;
        default:
          planName = "Free Plan";
          monthlyCredits = 0;
      }

      // Determine if yearly or monthly
      const billingCycle = currentSubscription.billing_cycle || currentSubscription.metadata?.payment_frequency_interval;
      planType = billingCycle?.toLowerCase() === 'year' ? 'yearly' : 'monthly';
      nextBillingDate = currentSubscription.next_billing_date;
    }

    return NextResponse.json({
      success: true,
      data: {
        creditHistory: creditHistory || [],
        userMeta: {
          id: user.id,
          credits: currentCredits,
          total_credits_earned: totalCreditsEarned,
          total_credits_used: totalCreditsUsed,
          plan: planName,
          plan_type: planType,
          monthly_credits: monthlyCredits,
          next_billing_date: nextBillingDate
        }
      }
    });

  } catch (error) {
    console.error("Credit history error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Failed to fetch credit history",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 