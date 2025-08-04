import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getDodoConfig, getDodoClient } from "@/app/lib/dodoConfig";

export async function GET(req: NextRequest) {
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

    // Get user's subscription
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (subError || !subscription) {
      return NextResponse.json({
        status: "no_subscription",
        message: "No active subscription found",
        health: {
          hasSubscription: false,
          autoRenewEnabled: false,
          nextBillingDate: null,
          daysUntilRenewal: null,
          paymentMethodValid: false,
          lastPaymentStatus: null
        }
      });
    }

    // Get Dodo Payments configuration
    let dodoConfig;
    try {
      dodoConfig = getDodoConfig();
    } catch (error: any) {
      console.error("Dodo Payments configuration error:", error.message);
      return NextResponse.json({ 
        error: "Dodo Payments not configured properly",
        details: error.message
      }, { status: 503 });
    }

    // Initialize Dodo Payments client
    const client = getDodoClient();

    try {
      // Get fresh subscription data from Dodo Payments
      const dodoSubscription = await client.subscriptions.retrieve(subscription.subscription_id);
      
      // Get recent payments using the configured API key
      const paymentsResponse = await fetch(`https://${dodoConfig.environment === 'test_mode' ? 'test' : 'live'}.dodopayments.com/payments?subscription_id=${subscription.subscription_id}&limit=5`, {
        headers: {
          'Authorization': `Bearer ${dodoConfig.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      let lastPaymentStatus = null;
      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json();
        const recentPayments = paymentsData.items || [];
        if (recentPayments.length > 0) {
          lastPaymentStatus = recentPayments[0].status;
        }
      }

      // Calculate days until renewal
      const nextBillingDate = dodoSubscription.next_billing_date;
      let daysUntilRenewal = null;
      if (nextBillingDate) {
        const now = new Date();
        const billingDate = new Date(nextBillingDate);
        const diffTime = billingDate.getTime() - now.getTime();
        daysUntilRenewal = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      // Determine health status
      let healthStatus = "healthy";
      let healthMessage = "Subscription is healthy";

      if (dodoSubscription.status === "past_due") {
        healthStatus = "past_due";
        healthMessage = "Payment is past due";
      } else if (dodoSubscription.status === "cancelled") {
        healthStatus = "cancelled";
        healthMessage = "Subscription has been cancelled";
      } else if (dodoSubscription.cancel_at_next_billing_date) {
        healthStatus = "cancelling";
        healthMessage = "Subscription will be cancelled at next billing date";
      } else if (lastPaymentStatus === "failed") {
        healthStatus = "payment_failed";
        healthMessage = "Last payment failed";
      } else if (daysUntilRenewal !== null && daysUntilRenewal <= 3) {
        healthStatus = "renewal_soon";
        healthMessage = "Renewal is coming up soon";
      }

      return NextResponse.json({
        status: healthStatus,
        message: healthMessage,
        subscription: {
          id: dodoSubscription.subscription_id,
          status: dodoSubscription.status,
          planType: subscription.plan_type,
          amount: dodoSubscription.recurring_pre_tax_amount,
          currency: dodoSubscription.currency,
          nextBillingDate: dodoSubscription.next_billing_date,
          cancelAtNextBillingDate: dodoSubscription.cancel_at_next_billing_date
        },
        health: {
          hasSubscription: true,
          autoRenewEnabled: dodoSubscription.status === "active" && !dodoSubscription.cancel_at_next_billing_date,
          nextBillingDate: dodoSubscription.next_billing_date,
          daysUntilRenewal: daysUntilRenewal,
          paymentMethodValid: lastPaymentStatus !== "failed",
          lastPaymentStatus: lastPaymentStatus,
          subscriptionStatus: dodoSubscription.status,
          isActive: dodoSubscription.status === "active",
          isPastDue: dodoSubscription.status === "past_due",
          isCancelled: dodoSubscription.status === "cancelled",
          willCancelAtRenewal: dodoSubscription.cancel_at_next_billing_date
        }
      });

    } catch (dodoError) {
      console.error("Error fetching from Dodo Payments:", dodoError);
      
      // Fallback to local data
      return NextResponse.json({
        status: "local_data_only",
        message: "Using local subscription data (Dodo Payments unavailable)",
        subscription: {
          id: subscription.subscription_id,
          status: subscription.status,
          planType: subscription.plan_type,
          amount: subscription.recurring_amount,
          currency: subscription.currency,
          nextBillingDate: subscription.next_billing_date,
          cancelAtNextBillingDate: subscription.metadata?.cancel_at_next_billing_date || false
        },
        health: {
          hasSubscription: true,
          autoRenewEnabled: subscription.status === "active" && !subscription.metadata?.cancel_at_next_billing_date,
          nextBillingDate: subscription.next_billing_date,
          daysUntilRenewal: null, // Can't calculate without fresh data
          paymentMethodValid: subscription.status === "active",
          lastPaymentStatus: null,
          subscriptionStatus: subscription.status,
          isActive: subscription.status === "active",
          isPastDue: subscription.status === "past_due",
          isCancelled: subscription.status === "cancelled",
          willCancelAtRenewal: subscription.metadata?.cancel_at_next_billing_date || false
        }
      });
    }

  } catch (error) {
    console.error("Subscription health check error:", error);
    return NextResponse.json({ 
      error: "Failed to check subscription health",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 