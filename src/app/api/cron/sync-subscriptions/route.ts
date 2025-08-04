import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import DodoPayments from "dodopayments";

const DODO_API_KEY = process.env.DODO_PAYMENTS_API_KEY || process.env.DODO_API_KEY;

export async function POST(req: NextRequest) {
  try {
    // Verify the request is from a legitimate cron service
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Initialize Dodo Payments client
    const isDevelopment = process.env.NODE_ENV === 'development';
    const environment = isDevelopment ? 'test_mode' : 'live_mode';
    
    const client = new DodoPayments({
      bearerToken: DODO_API_KEY!,
      environment: environment,
    });

    // Get all subscriptions from database
    const { data: subscriptions, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .in("status", ["pending", "active", "past_due", "cancelled"]);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return NextResponse.json({ 
        success: false, 
        error: subError.message 
      }, { status: 500 });
    }

    let syncedCount = 0;
    let errorCount = 0;
    let renewedCount = 0;
    let failedPaymentCount = 0;
    let expiredCount = 0;

    // Sync each subscription
    for (const subscription of subscriptions || []) {
      try {
        // Get subscription from Dodo Payments
        const dodoSubscription = await client.subscriptions.retrieve(subscription.subscription_id);
        
        // Update local database with latest status
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            status: dodoSubscription.status,
            next_billing_date: dodoSubscription.next_billing_date,
            metadata: {
              ...subscription.metadata,
              ...dodoSubscription,
              last_sync: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq("subscription_id", subscription.subscription_id);

        if (updateError) {
          console.error(`Error updating subscription ${subscription.subscription_id}:`, updateError);
          errorCount++;
          continue;
        }

        syncedCount++;

        // Handle different subscription states
        await handleSubscriptionState(dodoSubscription, subscription, supabase, client);

        // Check for failed payments and retry logic
        if (dodoSubscription.status === "past_due" as any) {
          failedPaymentCount++;
          await handleFailedPayment(dodoSubscription, supabase, client);
        }

        // Handle expired subscriptions
        if (dodoSubscription.status === "cancelled" && subscription.status !== "cancelled") {
          expiredCount++;
          await handleExpiredSubscription(dodoSubscription, supabase);
        }

        // If subscription became active, allocate credits
        if (dodoSubscription.status === "active" && subscription.status === "pending") {
          renewedCount++;
          await allocateCreditsForSubscription(dodoSubscription, subscription);
        }

      } catch (error) {
        console.error(`Error syncing subscription ${subscription.subscription_id}:`, error);
        errorCount++;
      }
    }

    // Handle auto-renewal for upcoming renewals
    await handleUpcomingRenewals(supabase, client);

    console.log(`✅ Subscription sync completed: ${syncedCount} synced, ${errorCount} errors, ${renewedCount} renewed, ${failedPaymentCount} failed payments, ${expiredCount} expired`);

    return NextResponse.json({ 
      success: true, 
      message: 'Subscriptions synced and auto-renew managed successfully',
      syncedCount,
      errorCount,
      renewedCount,
      failedPaymentCount,
      expiredCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Subscription sync cron job error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Handle different subscription states
async function handleSubscriptionState(dodoSubscription: any, localSubscription: any, supabase: any, client: any) {
  const status = dodoSubscription.status;
  
  switch (status) {
    case "active":
      // Ensure credits are allocated for active subscriptions
      if (localSubscription.status !== "active") {
        await allocateCreditsForSubscription(dodoSubscription, localSubscription);
      }
      break;
      
    case "past_due":
      // Send notification about failed payment
      await sendFailedPaymentNotification(dodoSubscription, supabase);
      break;
      
    case "cancelled":
      // Handle subscription cancellation
      await handleSubscriptionCancellation(dodoSubscription, supabase);
      break;
      
    case "pending":
      // Wait for payment confirmation
      console.log(`⏳ Subscription ${dodoSubscription.subscription_id} is pending payment`);
      break;
  }
}

// Handle failed payments with retry logic
async function handleFailedPayment(subscription: any, supabase: any, client: any) {
  try {
    console.log(`⚠️ Handling failed payment for subscription: ${subscription.subscription_id}`);
    
    // Get payment history for this subscription
    const paymentsResponse = await fetch(`https://${process.env.NODE_ENV === 'development' ? 'test' : 'live'}.dodopayments.com/payments?subscription_id=${subscription.subscription_id}`, {
      headers: {
        'Authorization': `Bearer ${process.env.DODO_PAYMENTS_API_KEY || process.env.DODO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (paymentsResponse.ok) {
      const paymentsData = await paymentsResponse.json();
      const failedPayments = paymentsData.items?.filter((p: any) => p.status === "failed") || [];
      
      if (failedPayments.length > 0) {
        const lastFailedPayment = failedPayments[0];
        
        // Log failed payment attempt
        await supabase
          .from("credit_history")
          .insert({
            user_id: subscription.metadata?.user_id,
            credits_added: 0,
            credits_used: 0,
            credits_remaining: 0,
            action: "payment_failed",
            subscription_id: subscription.subscription_id,
            payment_id: lastFailedPayment.payment_id,
            plan_type: subscription.metadata?.plan_type,
            created_at: new Date().toISOString(),
            expires_at: new Date().toISOString(),
            metadata: {
              failure_reason: lastFailedPayment.failure_reason,
              retry_count: (lastFailedPayment.metadata?.retry_count || 0) + 1
            }
          });
      }
    }
  } catch (error) {
    console.error("Error handling failed payment:", error);
  }
}

// Handle expired subscriptions
async function handleExpiredSubscription(subscription: any, supabase: any) {
  try {
    console.log(`❌ Handling expired subscription: ${subscription.subscription_id}`);
    
    // Log subscription expiration
    await supabase
      .from("credit_history")
      .insert({
        user_id: subscription.metadata?.user_id,
        credits_added: 0,
        credits_used: 0,
        credits_remaining: 0,
        action: "subscription_expired",
        subscription_id: subscription.subscription_id,
        plan_type: subscription.metadata?.plan_type,
        created_at: new Date().toISOString(),
        expires_at: new Date().toISOString(),
        metadata: {
          cancellation_reason: subscription.cancellation_reason || "payment_failed"
        }
      });
  } catch (error) {
    console.error("Error handling expired subscription:", error);
  }
}

// Handle subscription cancellation
async function handleSubscriptionCancellation(subscription: any, supabase: any) {
  try {
    console.log(`🚫 Handling subscription cancellation: ${subscription.subscription_id}`);
    
    // Update user status if needed
    await supabase
      .from("users_meta")
      .update({
        subscription_status: "cancelled",
        updated_at: new Date().toISOString()
      })
      .eq("id", subscription.metadata?.user_id);
  } catch (error) {
    console.error("Error handling subscription cancellation:", error);
  }
}

// Send failed payment notification
async function sendFailedPaymentNotification(subscription: any, supabase: any) {
  try {
    // This would integrate with your notification system
    // For now, we'll log it
    console.log(`📧 Failed payment notification should be sent for user: ${subscription.metadata?.user_id}`);
    
    // You could add email/SMS notification logic here
    // await sendEmail(subscription.metadata?.user_email, "payment_failed", subscription);
  } catch (error) {
    console.error("Error sending failed payment notification:", error);
  }
}

// Handle upcoming renewals
async function handleUpcomingRenewals(supabase: any, client: any) {
  try {
    // Get subscriptions that are due for renewal in the next 24 hours
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const { data: upcomingRenewals } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("status", "active")
      .lte("next_billing_date", tomorrow.toISOString())
      .gte("next_billing_date", new Date().toISOString());

    console.log(`🔄 Found ${upcomingRenewals?.length || 0} subscriptions due for renewal`);

    for (const renewal of upcomingRenewals || []) {
      try {
        // Verify subscription is still active with Dodo Payments
        const dodoSubscription = await client.subscriptions.retrieve(renewal.subscription_id);
        
        if (dodoSubscription.status === "active") {
          console.log(`✅ Subscription ${renewal.subscription_id} is ready for auto-renewal`);
          
          // The actual renewal is handled by Dodo Payments automatically
          // We just need to ensure our system is ready
          await supabase
            .from("subscriptions")
            .update({
              metadata: {
                ...renewal.metadata,
                last_renewal_check: new Date().toISOString()
              }
            })
            .eq("subscription_id", renewal.subscription_id);
        }
      } catch (error) {
        console.error(`Error checking renewal for ${renewal.subscription_id}:`, error);
      }
    }
  } catch (error) {
    console.error("Error handling upcoming renewals:", error);
  }
}

// Allocate credits for subscription
async function allocateCreditsForSubscription(dodoSubscription: any, localSubscription: any) {
  try {
    const planType = dodoSubscription.metadata?.plan_type || localSubscription.plan_type;
    let creditsToAdd = 0;

    if (planType === "starter") creditsToAdd = 40;
    else if (planType === "creator") creditsToAdd = 100;
    else if (planType === "pro") creditsToAdd = 300;

    if (creditsToAdd > 0) {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/payments/allocate-credits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          userId: dodoSubscription.metadata?.user_id || localSubscription.user_id,
          subscriptionId: dodoSubscription.subscription_id,
          planType: planType,
          creditsToAdd: creditsToAdd,
          action: 'subscription_activation'
        }),
      });

      if (response.ok) {
        console.log(`✅ Credits allocated for subscription ${dodoSubscription.subscription_id}`);
      } else {
        console.error(`Failed to allocate credits for subscription ${dodoSubscription.subscription_id}`);
      }
    }
  } catch (creditError) {
    console.error(`Error allocating credits for subscription ${dodoSubscription.subscription_id}:`, creditError);
  }
}

// Also support GET for testing
export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    message: 'Enhanced subscription sync endpoint is working',
    timestamp: new Date().toISOString()
  });
} 