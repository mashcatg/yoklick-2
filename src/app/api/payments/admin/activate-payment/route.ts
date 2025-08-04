import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import DodoPayments from "dodopayments";

const DODO_API_KEY = process.env.DODO_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { paymentId } = await req.json();

    if (!paymentId) {
      return NextResponse.json({
        success: false,
        error: "Payment ID is required"
      }, { status: 400 });
    }

    if (!DODO_API_KEY) {
      return NextResponse.json({
        success: false,
        error: "Dodo Payments is not configured"
      }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Initialize Dodo Payments client
    const client = new DodoPayments({
      bearerToken: DODO_API_KEY,
                      environment: process.env.NODE_ENV === 'development' ? 'test_mode' : 'live_mode',
    });

    try {
      // Get payment details
      const payment = await client.payments.retrieve(paymentId);
      
      if (!payment) {
        return NextResponse.json({
          success: false,
          error: "Payment not found"
        }, { status: 404 });
      }

      // Get subscription details
      const subscription = await client.subscriptions.retrieve(payment.subscription_id || '');
      
      if (!subscription) {
        return NextResponse.json({
          success: false,
          error: "Subscription not found"
        }, { status: 404 });
      }

      const userId = subscription.metadata?.user_id;
      const planType = subscription.metadata?.plan_type;

      if (!userId) {
        return NextResponse.json({
          success: false,
          error: "User ID not found in subscription metadata"
        }, { status: 400 });
      }

      // Determine credits based on plan type
      let creditsToAdd = 0;
      if (planType === "starter") {
        creditsToAdd = 40;
      } else if (planType === "creator") {
        creditsToAdd = 100;
      } else if (planType === "pro") {
        creditsToAdd = 300;
      } else if (planType === "free") {
        // Free users don't get credits - this is expected
        console.log('Admin: Free user - no credits to allocate');
        return NextResponse.json({
          success: false,
          error: "Free users cannot receive credits",
          planType
        }, { status: 400 });
      }

      if (creditsToAdd === 0) {
        return NextResponse.json({
          success: false,
          error: "Unknown plan type",
          planType
        }, { status: 400 });
      }

      // Get current credits
      const { data: userMeta, error: userError } = await supabase
        .from("users_meta")
        .select("credits")
        .eq("id", userId)
        .single();

      if (userError) {
        console.error('Error fetching user meta:', userError);
        return NextResponse.json({
          success: false,
          error: "Failed to fetch user data"
        }, { status: 500 });
      }

      const currentCredits = userMeta?.credits || 0;
      const newCredits = currentCredits + creditsToAdd;
      
      // Update credits
      const { error: updateError } = await supabase
        .from("users_meta")
        .update({ credits: newCredits })
        .eq("id", userId);

      if (updateError) {
        console.error('Error updating credits:', updateError);
        return NextResponse.json({
          success: false,
          error: "Failed to update credits"
        }, { status: 500 });
      }

      // Update user metadata
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          subscription_status: 'active',
          subscription_updated_at: new Date().toISOString(),
          last_credit_refill: new Date().toISOString()
        }
      });

      // Insert credit history record
      const { error: historyError } = await supabase
        .from("credit_history")
        .insert({
          user_id: userId,
          credits_added: creditsToAdd,
          credits_remaining: newCredits,
          action: 'admin_activation',
          subscription_id: payment.subscription_id,
          payment_id: paymentId,
          plan_type: planType,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          metadata: {
            admin_action: true,
            reason: 'Payment activated by admin'
          }
        });

      if (historyError) {
        console.error('Error inserting credit history:', historyError);
        // Don't fail the request if history insertion fails
      }

      console.log(`Admin activated payment ${paymentId} for user ${userId}. Allocated ${creditsToAdd} credits. Total: ${newCredits}`);

      return NextResponse.json({
        success: true,
        message: "Payment activated successfully",
        paymentId,
        userId,
        creditsAdded: creditsToAdd,
        totalCredits: newCredits,
        planType
      });

    } catch (error: any) {
      console.error("Error activating payment:", error);
      return NextResponse.json({
        success: false,
        error: "Failed to activate payment",
        details: error.message || "Unknown error"
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Admin payment activation error:", error);
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 