import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import DodoPayments from "dodopayments";

const DODO_API_KEY = process.env.DODO_PAYMENTS_API_KEY || process.env.DODO_API_KEY;

export async function POST(req: NextRequest) {
  try {
    // Get user from request headers (client-side auth)
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Please sign in to continue" }, { status: 401 });
    }

    const accessToken = authHeader.replace('Bearer ', '');
    
    // Create client with user's access token for auth
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    );

    // Create service role client for database operations
    const supabaseService = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { global: { headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) {
      console.error("Auth error:", userError);
      return NextResponse.json({ 
        error: "User not found", 
        details: userError?.message || "Authentication failed",
        status: "auth_error"
      }, { status: 401 });
    }

    const { subscriptionId } = await req.json();

    if (!subscriptionId) {
      return NextResponse.json({ error: "Subscription ID is required" }, { status: 400 });
    }

    // Initialize Dodo Payments client
    const isDevelopment = process.env.NODE_ENV === 'development';
    const environment = isDevelopment ? 'test_mode' : 'live_mode';
    
    const client = new DodoPayments({
      bearerToken: DODO_API_KEY!,
      environment: environment,
    });

    try {
      // Fetch subscription from Dodo Payments
      const subscription = await client.subscriptions.retrieve(subscriptionId);
      console.log("🔄 Syncing subscription:", subscription.subscription_id);

      // Extract plan type from metadata or product ID
      let planType = subscription.metadata?.plan_type;
      
      // If plan type is not available or is "unknown", try to get it from previous subscription
      if (!planType || planType === "unknown") {
        const { data: previousSubscription } = await supabaseService
          .from("subscriptions")
          .select("plan_type")
          .eq("user_id", user.id)
          .neq("subscription_id", subscription.subscription_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        
        if (previousSubscription?.plan_type && previousSubscription.plan_type !== "unknown") {
          planType = previousSubscription.plan_type;
          console.log("🔄 Using plan type from previous subscription:", planType);
        } else {
          // Fallback: determine plan type from product ID
          const productId = subscription.product_id;
          console.log("🔄 Determining plan type from product ID:", productId);
          
          if (productId) {
            if (productId.includes("starter") || productId === "pdt_PoCX9Im2AUmxotnYx9ydm") {
              planType = "starter";
            } else if (productId.includes("creator") || productId === "pdt_nzFFbBbSBVopc9gvAwGic") {
              planType = "creator";
            } else if (productId.includes("pro") || productId === "pdt_DNbzGIiBdpqiKlrWLOj6q") {
              planType = "pro";
            } else {
              planType = "unknown";
            }
          } else {
            planType = "unknown";
          }
          console.log("🔄 Determined plan type from product ID:", planType);
        }
      }

      // Update subscription in local database
      const { error: subscriptionError } = await supabaseService
        .from("subscriptions")
        .upsert({
          subscription_id: subscription.subscription_id,
          user_id: subscription.metadata?.user_id || user.id,
          plan_type: planType,
          status: subscription.status,
          amount: subscription.recurring_pre_tax_amount,
          currency: subscription.currency,
          created_at: subscription.created_at,
          next_billing_date: subscription.next_billing_date,
          billing_cycle: subscription.payment_frequency_interval?.toLowerCase() || "monthly",
          metadata: {
            ...subscription.metadata,
            product_id: subscription.product_id,
            customer: subscription.customer,
            billing: subscription.billing,
            subscription_period_interval: subscription.subscription_period_interval,
            payment_frequency_interval: subscription.payment_frequency_interval,
            subscription_period_count: subscription.subscription_period_count,
            payment_frequency_count: subscription.payment_frequency_count,
            trial_period_days: subscription.trial_period_days,
            quantity: subscription.quantity,
            discount_id: subscription.discount_id,
            cancelled_at: subscription.cancelled_at,
            cancel_at_next_billing_date: subscription.cancel_at_next_billing_date,
            on_demand: subscription.on_demand,
            addons: subscription.addons,
          },
        });

      if (subscriptionError) {
        console.error("Error updating subscription:", subscriptionError);
        return NextResponse.json({ 
          error: "Failed to update subscription in database",
          details: subscriptionError
        }, { status: 500 });
      }

      // Clean up old subscription records for this user (keep only the latest)
      const { error: cleanupError } = await supabaseService
        .from("subscriptions")
        .delete()
        .eq("user_id", user.id)
        .neq("subscription_id", subscription.subscription_id);
      
      if (cleanupError) {
        console.error("Error cleaning up old subscriptions:", cleanupError);
      } else {
        console.log("✅ Cleaned up old subscription records");
      }

      // Update user metadata
      const { error: userUpdateError } = await supabase.auth.updateUser({
        data: {
          subscription_id: subscription.subscription_id,
          subscription_status: subscription.status,
          plan_type: planType,
          subscription_updated_at: new Date().toISOString(),
        }
      });

      if (userUpdateError) {
        console.error("Error updating user metadata:", userUpdateError);
      }

      // Update users_meta table
      const { error: userMetaError } = await supabaseService
        .from("users_meta")
        .upsert({
          id: user.id,
          subscription_id: subscription.subscription_id,
          plan_type: planType,
          status: subscription.status,
          updated_at: new Date().toISOString(),
        });

      if (userMetaError) {
        console.error("Error updating users_meta:", userMetaError);
        
        // If user doesn't exist in users_meta, create the record
        if (userMetaError.code === 'PGRST116' || userMetaError.message?.includes('0 rows')) {
          console.log("Creating new users_meta record for user:", user.id);
          const { error: createError } = await supabaseService
            .from("users_meta")
            .insert({
              id: user.id,
              subscription_id: subscription.subscription_id,
              plan_type: planType,
              status: subscription.status,
              credits: 0, // Start with 0 credits
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          
          if (createError) {
            console.error("Error creating users_meta record:", createError);
          } else {
            console.log("✅ Created users_meta record for user:", user.id);
          }
        }
      }

      // If subscription is active, allocate credits
      if (subscription.status === "active" && planType !== "unknown") {
        try {
          // Check if credits were already allocated for this subscription
          const { data: existingCreditHistory } = await supabaseService
            .from("credit_history")
            .select("id")
            .eq("user_id", user.id)
            .eq("subscription_id", subscription.subscription_id)
            .maybeSingle();

          if (existingCreditHistory) {
            console.log(`⚠️ Credits already allocated for subscription ${subscription.subscription_id} - skipping allocation`);
          } else {
            console.log(`🔄 Allocating credits for subscription ${subscription.subscription_id} with plan ${planType}`);
            
            const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/payments/allocate-credits`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({
                userId: user.id,
                subscriptionId: subscription.subscription_id,
                planType: planType,
              }),
            });

            if (response.ok) {
              const result = await response.json();
              if (result.alreadyAllocated) {
                console.log("✅ Credits were already allocated for this subscription");
              } else {
                console.log("✅ Credits allocated successfully");
              }
            } else {
              console.error("Failed to allocate credits:", await response.text());
            }
          }
        } catch (creditError) {
          console.error("Error allocating credits:", creditError);
        }
      }

      // Fetch associated payments using direct API call
      const paymentsResponse = await fetch(`https://${isDevelopment ? 'test' : 'live'}.dodopayments.com/payments?subscription_id=${subscription.subscription_id}`, {
        headers: {
          'Authorization': `Bearer ${process.env.DODO_PAYMENTS_API_KEY || process.env.DODO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      let payments: any[] = [];
      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json();
        payments = paymentsData.items || [];
      }

      // Sync payments to local database
      for (const payment of payments) {
        const { error: paymentError } = await supabase
          .from("transactions")
          .upsert({
            payment_id: payment.payment_id,
            subscription_id: payment.subscription_id,
            user_id: payment.metadata?.user_id || user.id,
            amount: payment.total_amount,
            currency: payment.currency,
            status: payment.status || "pending",
            payment_method: payment.payment_method_type || "unknown",
            created_at: payment.created_at,
            metadata: {
              ...payment.metadata,
              customer: payment.customer,
              billing: payment.billing,
              business_id: payment.business_id,
              settlement_amount: payment.settlement_amount,
              settlement_currency: payment.settlement_currency,
              tax: payment.tax,
              error_message: payment.error_message,
              error_code: payment.error_code,
              card_last_four: payment.card_last_four,
              card_issuing_country: payment.card_issuing_country,
              card_type: payment.card_type,
              card_network: payment.card_network,
              brand_id: payment.brand_id,
              digital_products_delivered: payment.digital_products_delivered,
            },
          });

        if (paymentError) {
          console.error("Error syncing payment:", paymentError);
        }
      }

      console.log("✅ Subscription synced successfully");
      
      return NextResponse.json({
        success: true,
        subscription: subscription,
        payments: payments,
        message: "Subscription synced successfully"
      });

    } catch (error: any) {
      if (error instanceof DodoPayments.APIError) {
        return NextResponse.json({ 
          error: "Dodo Payments API error",
          details: {
            status: error.status,
            name: error.name,
            message: error.message
          }
        }, { status: error.status || 500 });
      } else {
        return NextResponse.json({ 
          error: "Failed to sync subscription",
          details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
      }
    }

  } catch (error) {
    console.error("Sync subscription error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 