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

    console.log("Fetching subscription status for user:", user.id);

    // Get user metadata
    const { data: userMeta, error: userMetaError } = await supabase
        .from("users_meta")
      .select("*")
        .eq("id", user.id)
        .single();

    // Get credit history (this table should exist)
    const { data: creditHistory, error: creditHistoryError } = await supabase
      .from("credit_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Calculate credit totals
    const totalCreditsEarned = creditHistory?.reduce((sum, record) => sum + (record.credits_added || 0), 0) || 0;
    const totalCreditsUsed = creditHistory?.reduce((sum, record) => sum + (record.credits_used || 0), 0) || 0;
    const currentCredits = userMeta?.credits || 0;

    // Get subscription data from subscriptions table
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    // Try to get transactions data (handle missing table gracefully)
    let transactions = null;
    let transactionsError = null;
    
    try {
      const { data: transactionsData, error: transactionsDataError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      
      transactions = transactionsData;
      transactionsError = transactionsDataError;
    } catch (error) {
      console.log("Transactions table not available, skipping...");
      transactions = null;
      transactionsError = { message: "Transactions table not found" };
    }

    // Determine subscription info from subscriptions table
    let subscription: any = null;
    let payments: any[] = [];

    // Check if user has subscription data from subscriptions table
    if (subscriptionData && subscriptionData.length > 0 && !subscriptionError) {
      const latestSubscription = subscriptionData[0];
      
      // Extract plan type from metadata
      let planType = latestSubscription.plan_type;
      
      if (!planType && latestSubscription.metadata) {
        planType = latestSubscription.metadata.plan_type || 
                   latestSubscription.metadata.plan || 
                   latestSubscription.metadata.plan_name ||
                   latestSubscription.metadata.name;
      }
      
      // Create comprehensive subscription object
      subscription = {
        subscription_id: latestSubscription.subscription_id,
        status: latestSubscription.status,
        plan_type: planType || "free",
        amount: latestSubscription.amount,
        currency: latestSubscription.currency,
        billing_cycle: latestSubscription.billing_cycle,
        next_billing_date: latestSubscription.next_billing_date,
        created_at: latestSubscription.created_at,
        updated_at: latestSubscription.updated_at,
        metadata: latestSubscription.metadata || {
          plan_type: planType || "free",
          plan_name: planType || "free",
          billing: latestSubscription.metadata?.billing || null,
          customer: latestSubscription.metadata?.customer || null,
          quantity: latestSubscription.metadata?.quantity || 1,
          on_demand: latestSubscription.metadata?.on_demand || false,
          product_id: latestSubscription.metadata?.product_id || null,
          discount_id: latestSubscription.metadata?.discount_id || null,
          cancelled_at: latestSubscription.metadata?.cancelled_at || null,
          trial_period_days: latestSubscription.metadata?.trial_period_days || 0,
          payment_frequency_count: latestSubscription.metadata?.payment_frequency_count || 1,
          subscription_period_count: latestSubscription.metadata?.subscription_period_count || 1,
          payment_frequency_interval: latestSubscription.metadata?.payment_frequency_interval || "Month",
          cancel_at_next_billing_date: latestSubscription.metadata?.cancel_at_next_billing_date || false,
          subscription_period_interval: latestSubscription.metadata?.subscription_period_interval || "Month"
        }
      };

      // Convert transactions to payments format if available
      if (transactions && transactions.length > 0 && !transactionsError) {
        payments = transactions.map(tx => ({
          payment_id: tx.payment_id || tx.id,
          total_amount: tx.amount || tx.total_amount,
          currency: tx.currency || "USD",
          status: tx.status || "succeeded",
          created_at: tx.created_at,
          payment_method: tx.payment_method || "Card",
          card_last_four: tx.card_last_four,
          card_network: tx.card_network,
          card_type: tx.card_type,
          billing: tx.billing,
          customer: tx.customer,
          refunds: tx.refunds,
          disputes: tx.disputes,
          settlement_amount: tx.settlement_amount,
          settlement_currency: tx.settlement_currency,
          tax: tx.tax
        }));
      }
    }
    // Fallback to transaction data if no subscription found and transactions table exists
    else if (transactions && transactions.length > 0 && !transactionsError) {
      const latestTransaction = transactions[0];
        
      // Create subscription object from transaction data
      subscription = {
        subscription_id: latestTransaction.id,
        status: "active", // Assume active if there's a transaction
        plan_type: latestTransaction.plan_type || "free",
        amount: latestTransaction.amount,
        currency: latestTransaction.currency || "USD",
        billing_cycle: "month",
        created_at: latestTransaction.created_at,
        metadata: {
          plan_type: latestTransaction.plan_type || "free",
          plan_name: latestTransaction.plan_type || "free"
        }
      };

      // Convert transactions to payments format
      payments = transactions.map(tx => ({
        payment_id: tx.payment_id || tx.id,
        total_amount: tx.amount || tx.total_amount,
        currency: tx.currency || "USD",
        status: tx.status || "succeeded",
        created_at: tx.created_at,
        payment_method: tx.payment_method || "Card",
        card_last_four: tx.card_last_four,
        card_network: tx.card_network,
        card_type: tx.card_type,
        billing: tx.billing,
        customer: tx.customer,
        refunds: tx.refunds,
        disputes: tx.disputes,
        settlement_amount: tx.settlement_amount,
        settlement_currency: tx.settlement_currency,
        tax: tx.tax
      }));
    }

    // If no subscription found, check user metadata
    if (!subscription && userMeta) {
      subscription = {
        subscription_id: userMeta.id,
        status: userMeta.plan === 'free' ? 'free' : 'active',
        plan_type: userMeta.plan || "free",
        amount: 0,
        currency: "USD",
        billing_cycle: "month",
        created_at: userMeta.created_at,
        metadata: {
          plan_type: userMeta.plan || "free",
          plan_name: userMeta.plan || "free"
        }
      };
    }

    // Ensure user has proper metadata
    if (!userMeta) {
      console.log("Creating user_meta for user:", user.id);
      await supabase
        .from("users_meta")
        .insert({
          id: user.id,
          credits: 0,
          plan: 'free',
          is_yearly: false,
          created_at: new Date().toISOString()
        });
    }

    // Ensure user has user_credits record
    const { data: userCredits, error: userCreditsError } = await supabase
      .from("user_credits")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (userCreditsError && userCreditsError.code === 'PGRST116') {
      console.log("Creating user_credits for user:", user.id);
      await supabase
        .from("user_credits")
        .insert({
          user_id: user.id,
          balance: userMeta?.credits || 0
        });
    }

    // Determine plan details
    let planName = "Free Plan";
    let planType = "monthly";
    let nextBillingDate = null;
    let monthlyCredits = 0;

    if (subscription) {
      const planTypeFromSub = subscription.plan_type;
      
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
      const billingCycle = subscription.billing_cycle;
      planType = billingCycle?.toLowerCase() === 'year' ? 'yearly' : 'monthly';
      nextBillingDate = subscription.next_billing_date;
    }

    return NextResponse.json({
      success: true,
      data: {
        subscription,
        payments,
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
    console.error("Subscription status error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Failed to fetch subscription status",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 