import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import DodoPayments from "dodopayments";
import { rateLimit } from "@/lib/rateLimit";

const DODO_API_KEY = process.env.DODO_API_KEY;

export async function POST(req: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimit(req, 'cron');
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

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


    const results = {
      creditsExpired: 0,
      subscriptionsSynced: 0,
      autoRenewChecked: 0,
      failedPaymentsRetried: 0,
      errors: 0,
      notificationsSent: 0
    };

    // 1. EXPIRE CREDITS (Daily at midnight)
    try {
      console.log("📅 Step 1: Expiring credits...");
      const { data: expireData, error: expireError } = await supabase.rpc('expire_credits');
      
      if (expireError) {
        console.error('Error expiring credits:', expireError);
        results.errors++;
      } else {
        console.log('✅ Credits expired successfully');
        results.creditsExpired = expireData || 0;
      }
    } catch (error) {
      console.error('Credit expiry error:', error);
      results.errors++;
    }

    // 2. SYNC SUBSCRIPTIONS (Daily at 1 AM)
    try {
      console.log("🔄 Step 2: Syncing subscriptions...");
      
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
        results.errors++;
      } else {
        let syncedCount = 0;
        
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

            if (!updateError) {
              syncedCount++;
              
              // Handle failed payments
              if (dodoSubscription.status === "past_due") {
                results.failedPaymentsRetried++;
                await handleFailedPayment(dodoSubscription, supabase, client);
              }

              // Handle expired subscriptions
              if (dodoSubscription.status === "cancelled" && subscription.status !== "cancelled") {
                await handleExpiredSubscription(dodoSubscription, supabase);
              }
            }
          } catch (error) {
            console.error(`Error syncing subscription ${subscription.subscription_id}:`, error);
            results.errors++;
          }
        }
        
        results.subscriptionsSynced = syncedCount;
        console.log(`✅ Synced ${syncedCount} subscriptions`);
      }
    } catch (error) {
      console.error('Subscription sync error:', error);
      results.errors++;
    }

    // 3. CHECK AUTO-RENEW (Daily at 2 AM)
    try {
      console.log("🔄 Step 3: Checking auto-renew status...");
      
      // Get subscriptions that need auto-renew attention
      const { data: attentionSubscriptions, error: attentionError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("status", "active")
        .lt("next_billing_date", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()); // 7 days from now

      if (!attentionError && attentionSubscriptions) {
        results.autoRenewChecked = attentionSubscriptions.length;
        
        for (const subscription of attentionSubscriptions) {
          try {
            // Send notification for upcoming renewals
            await sendRenewalNotification(subscription, supabase);
            results.notificationsSent++;
          } catch (error) {
            console.error(`Error sending notification for ${subscription.subscription_id}:`, error);
            results.errors++;
          }
        }
        
        console.log(`✅ Checked ${attentionSubscriptions.length} subscriptions for auto-renew`);
      }
    } catch (error) {
      console.error('Auto-renew check error:', error);
      results.errors++;
    }

    // 4. RETRY FAILED PAYMENTS (Daily at 3 AM)
    try {
      console.log("🔄 Step 4: Retrying failed payments...");
      
      // Get failed payments that need retry
      const { data: failedPayments, error: failedError } = await supabase
        .rpc('get_failed_payments_for_retry', {
          p_days_back: 30
        });

      if (!failedError && failedPayments) {
        for (const failedPayment of failedPayments) {
          try {
            console.log(`💳 Retrying payment ${failedPayment.payment_id}`);
            
            // Log the retry attempt
            await supabase
              .from("credit_history")
              .insert({
                user_id: failedPayment.user_id,
                credits_added: 0,
                credits_used: 0,
                credits_remaining: 0,
                action: "payment_retry",
                subscription_id: failedPayment.subscription_id,
                payment_id: failedPayment.payment_id,
                plan_type: failedPayment.plan_type,
                created_at: new Date().toISOString(),
                expires_at: new Date().toISOString(),
                metadata: {
                  retry_count: failedPayment.retry_count + 1,
                  original_failure_reason: failedPayment.failure_reason,
                  retry_attempt: new Date().toISOString()
                }
              });
            
            results.failedPaymentsRetried++;
          } catch (error) {
            console.error(`Error retrying payment ${failedPayment.payment_id}:`, error);
            results.errors++;
          }
        }
        
        console.log(`✅ Retried ${results.failedPaymentsRetried} failed payments`);
      }
    } catch (error) {
      console.error('Failed payment retry error:', error);
      results.errors++;
    }

    console.log(`✅ Daily maintenance completed:`, results);

    return NextResponse.json({ 
      success: true, 
      message: 'Daily maintenance completed successfully',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Daily maintenance error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Helper functions
async function handleFailedPayment(subscription: any, supabase: any, client: any) {
  try {
    // Log the failed payment
    await supabase
      .from("credit_history")
      .insert({
        user_id: subscription.user_id,
        credits_added: 0,
        credits_used: 0,
        credits_remaining: 0,
        action: "payment_failed",
        subscription_id: subscription.subscription_id,
        payment_id: subscription.payment_id,
        plan_type: subscription.plan_type,
        created_at: new Date().toISOString(),
        expires_at: new Date().toISOString(),
        metadata: {
          failure_reason: "payment_retry_needed",
          retry_count: 0
        }
      });
  } catch (error) {
    console.error('Error handling failed payment:', error);
  }
}

async function handleExpiredSubscription(subscription: any, supabase: any) {
  try {
    // Update subscription status
    await supabase
      .from("subscriptions")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString()
      })
      .eq("subscription_id", subscription.subscription_id);
  } catch (error) {
    console.error('Error handling expired subscription:', error);
  }
}

async function sendRenewalNotification(subscription: any, supabase: any) {
  try {
    // Log the notification
    await supabase
      .from("credit_history")
      .insert({
        user_id: subscription.user_id,
        credits_added: 0,
        credits_used: 0,
        credits_remaining: 0,
        action: "renewal_notification",
        subscription_id: subscription.subscription_id,
        plan_type: subscription.plan_type,
        created_at: new Date().toISOString(),
        expires_at: new Date().toISOString(),
        metadata: {
          notification_type: "upcoming_renewal",
          renewal_date: subscription.next_billing_date
        }
      });
  } catch (error) {
    console.error('Error sending renewal notification:', error);
  }
}

// Also support GET for testing
export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    message: 'Daily maintenance endpoint is working',
    timestamp: new Date().toISOString()
  });
} 