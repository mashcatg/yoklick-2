import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, getRateLimitHeaders } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimit(req, 'payment');
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  try {
    const { subscriptionId, planType, creditsToAdd, action = 'subscription_payment', userId } = await req.json();

    if (!subscriptionId || !planType || !creditsToAdd) {
      return NextResponse.json({
        success: false,
        error: "Missing required parameters"
      }, { status: 400 });
    }

    // Initialize Supabase client
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

    // Get user ID - either from parameters or from subscription lookup
    let targetUserId = userId;
    
    if (!targetUserId) {
      // Try to get user from subscription metadata
      const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("subscription_id", subscriptionId)
        .single();

      if (subError || !subscription) {
        // If subscription not in database, we'll need userId from request
        if (!userId) {
          return NextResponse.json({
            success: false,
            error: "User ID is required when subscription is not in database"
          }, { status: 400 });
        }
        targetUserId = userId;
      } else {
        targetUserId = subscription.user_id;
      }
    }

    // STEP 1: Check if credits were already allocated for this subscription
    // Use .maybeSingle() instead of .single() to avoid errors if multiple records exist
    const { data: existingHistory, error: historyError } = await supabase
      .from("credit_history")
      .select("id, credits_added, created_at")
      .eq("user_id", targetUserId)
      .eq("subscription_id", subscriptionId)
      .eq("action", action)
      .maybeSingle();

    if (existingHistory) {
      console.log(`⚠️ Credits already allocated for subscription ${subscriptionId} - skipping`);
      return NextResponse.json({
        success: true,
        alreadyAllocated: true,
        message: "Credits already allocated for this subscription"
      });
    }

    // Additional check: Look for any credit history with this subscription_id regardless of action
    const { data: anyExistingHistory, error: anyHistoryError } = await supabase
      .from("credit_history")
      .select("id, credits_added, action, created_at")
      .eq("user_id", targetUserId)
      .eq("subscription_id", subscriptionId)
      .maybeSingle();

    if (anyExistingHistory) {
      console.log(`⚠️ Credit history already exists for subscription ${subscriptionId} - skipping`);
      return NextResponse.json({
        success: true,
        alreadyAllocated: true,
        message: "Credits already allocated for this subscription"
      });
    }

    // STEP 2: Get all credit history to calculate the correct total
    const { data: allCreditHistory, error: allHistoryError } = await supabase
      .from("credit_history")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: true });

    if (allHistoryError) {
      return NextResponse.json({
        success: false,
        error: "Failed to fetch credit history"
      }, { status: 500 });
    }

    // STEP 3: Calculate the correct total credits from history
    let calculatedCredits = 0;
    let totalEarned = 0;
    let totalUsed = 0;

    allCreditHistory?.forEach((record) => {
      if (record.action === 'subscription_payment') {
        calculatedCredits += record.credits_added;
        totalEarned += record.credits_added;
      } else if (record.action === 'usage') {
        calculatedCredits -= record.credits_used;
        totalUsed += record.credits_used;
      }
    });

    // STEP 4: Add the new credits to the calculation
    const newTotalCredits = calculatedCredits + creditsToAdd;
    const newTotalEarned = totalEarned + creditsToAdd;

    // STEP 5: Insert the new credit history record
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    const { error: insertError } = await supabase
      .from("credit_history")
      .insert({
        user_id: targetUserId,
        credits_added: creditsToAdd,
        credits_remaining: newTotalCredits,
        action: action,
        subscription_id: subscriptionId,
        payment_id: subscriptionId,
        plan_type: planType,
        expires_at: expiryDate.toISOString()
      });

    if (insertError) {
      console.error("❌ Failed to insert credit history:", insertError);
      return NextResponse.json({
        success: false,
        error: "Failed to insert credit history"
      }, { status: 500 });
    }

    // STEP 6: Update users_meta with the correct total
    const { error: updateError } = await supabase
      .from("users_meta")
      .update({
        credits: newTotalCredits,
        total_credits_earned: newTotalEarned,
        total_credits_used: totalUsed
      })
      .eq("id", targetUserId);

    if (updateError) {
      console.error("❌ Failed to update user credits:", updateError);
      return NextResponse.json({
        success: false,
        error: "Failed to update user credits"
      }, { status: 500 });
    }

    console.log(`✅ Credits allocated successfully for subscription ${subscriptionId}: +${creditsToAdd} credits`);

    // Add rate limit headers to response
    const authHeader = req.headers.get('authorization') || 'service';
    const headers = getRateLimitHeaders(authHeader, 'payment');

    return NextResponse.json({
      success: true,
      message: "Credits allocated successfully",
      credits: newTotalCredits,
      creditsAdded: creditsToAdd
    }, { headers });

  } catch (error: any) {
    console.error("❌ Error in allocate-credits:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to allocate credits",
      details: error.message
    }, { status: 500 });
  }
} 