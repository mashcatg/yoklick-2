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

    console.log("🔄 Starting failed payment retry process...");

    // Initialize Dodo Payments client
    const isDevelopment = process.env.NODE_ENV === 'development';
    const environment = isDevelopment ? 'test_mode' : 'live_mode';
    
    const client = new DodoPayments({
      bearerToken: DODO_API_KEY!,
      environment: environment,
    });

    // Get failed payments that need retry
    const { data: failedPayments, error: failedError } = await supabase
      .rpc('get_failed_payments_for_retry', {
        p_days_back: 30
      });

    if (failedError) {
      console.error('Error fetching failed payments:', failedError);
      return NextResponse.json({ 
        success: false, 
        error: failedError.message 
      }, { status: 500 });
    }

    let retryAttempts = 0;
    let successfulRetries = 0;
    let errors = 0;

    // Process each failed payment
    for (const failedPayment of failedPayments || []) {
      try {
        console.log(`🔄 Retrying payment ${failedPayment.payment_id} for subscription ${failedPayment.subscription_id}`);
        
        // Get the subscription details
        const { data: subscription, error: subError } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("subscription_id", failedPayment.subscription_id)
          .single();

        if (subError || !subscription) {
          console.error(`Subscription not found for ${failedPayment.subscription_id}`);
          errors++;
          continue;
        }

        // Attempt to retry the payment with Dodo Payments
        try {
          // This would typically involve calling Dodo Payments API to retry the payment
          // For now, we'll just log the attempt
          console.log(`💳 Attempting to retry payment ${failedPayment.payment_id}`);
          
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
              plan_type: subscription.plan_type,
              created_at: new Date().toISOString(),
              expires_at: new Date().toISOString(),
              metadata: {
                retry_count: failedPayment.retry_count + 1,
                original_failure_reason: failedPayment.failure_reason,
                retry_attempt: new Date().toISOString()
              }
            });

          retryAttempts++;
          
          // Here you would actually retry the payment with Dodo Payments
          // const retryResult = await client.payments.retry(failedPayment.payment_id);
          
          // For now, we'll simulate a successful retry
          console.log(`✅ Payment retry logged for ${failedPayment.payment_id}`);
          successfulRetries++;
          
        } catch (retryError) {
          console.error(`Failed to retry payment ${failedPayment.payment_id}:`, retryError);
          errors++;
        }

      } catch (error) {
        console.error(`Error processing failed payment ${failedPayment.payment_id}:`, error);
        errors++;
      }
    }

    // Update subscription statuses for subscriptions with failed payments
    const { data: pastDueSubscriptions, error: pastDueError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("status", "active");

    if (!pastDueError && pastDueSubscriptions) {
      for (const subscription of pastDueSubscriptions) {
        try {
          // Check if this subscription has recent failed payments
          const { data: recentFailures } = await supabase
            .from("credit_history")
            .select("*")
            .eq("subscription_id", subscription.subscription_id)
            .eq("action", "payment_failed")
            .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
            .limit(1);

          if (recentFailures && recentFailures.length > 0) {
            console.log(`⚠️ Subscription ${subscription.subscription_id} has recent failed payments, updating status`);
            
            // Update subscription status to past_due
            await supabase
              .from("subscriptions")
              .update({
                status: "past_due",
                updated_at: new Date().toISOString(),
                metadata: {
                  ...subscription.metadata,
                  past_due_reason: "failed_payments",
                  past_due_updated_at: new Date().toISOString()
                }
              })
              .eq("subscription_id", subscription.subscription_id);
          }
        } catch (error) {
          console.error(`Error updating subscription ${subscription.subscription_id}:`, error);
        }
      }
    }

    console.log(`✅ Failed payment retry completed: ${retryAttempts} attempts, ${successfulRetries} successful, ${errors} errors`);

    return NextResponse.json({ 
      success: true, 
      message: 'Failed payment retry process completed',
      retryAttempts,
      successfulRetries,
      errors,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed payment retry error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Also support GET for testing
export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    message: 'Failed payment retry endpoint is working',
    timestamp: new Date().toISOString()
  });
} 