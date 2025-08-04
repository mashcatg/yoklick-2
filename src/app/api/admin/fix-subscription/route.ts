import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { subscriptionId, planType, userId, forceAllocate = false } = await req.json();
    
    if (!subscriptionId || !planType || !userId) {
      return NextResponse.json({ error: "subscriptionId, planType, and userId are required" }, { status: 400 });
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

    // Check if there's a successful payment for this subscription
    const { data: payments, error: paymentsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .eq('status', 'succeeded')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!forceAllocate && (!payments || payments.length === 0)) {
      return NextResponse.json({ 
        error: "No successful payment found for this subscription. Use forceAllocate: true to override.",
        subscriptionId,
        planType,
        userId
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
    }

    // Store subscription in database
    await supabase
      .from('subscriptions')
      .upsert({
        subscription_id: subscriptionId,
        user_id: userId,
        status: 'active',
        plan_type: planType,
        amount: 1849, // $18.49 in cents
        billing_cycle: 'monthly',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    // Update user metadata
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        subscription_status: 'active',
        plan_type: planType,
        last_credit_refill: new Date().toISOString(),
      }
    });

    // Ensure user exists in users_meta table and add credits
    const { data: existingUser, error: checkError } = await supabase
      .from("users_meta")
      .select("id, credits, total_credits_earned")
      .eq("id", userId)
      .single();

    if (checkError && checkError.code === 'PGRST116') {
      // User doesn't exist in users_meta, create the record
      await supabase
        .from("users_meta")
        .insert({
          id: userId,
          credits: creditsToAdd,
          plan: planType,
          total_credits_earned: creditsToAdd,
          total_credits_used: 0
        });
    } else if (existingUser) {
      // Update existing user with new credits and plan
      await supabase
        .from("users_meta")
        .update({
          credits: existingUser.credits + creditsToAdd,
          plan: planType,
          total_credits_earned: (existingUser.total_credits_earned || 0) + creditsToAdd
        })
        .eq("id", userId);
    }

    // Add to credit history
    await supabase
      .from('credit_history')
      .insert({
        user_id: userId,
        credits_added: creditsToAdd,
        credits_remaining: creditsToAdd,
        action: 'subscription_payment',
        subscription_id: subscriptionId,
        payment_id: subscriptionId,
        plan_type: planType,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      message: `Subscription ${subscriptionId} fixed successfully`,
      planType,
      creditsAdded: creditsToAdd,
      forceAllocated: forceAllocate
    });

  } catch (error) {
    console.error("Error fixing subscription:", error);
    return NextResponse.json({ 
      error: "Failed to fix subscription",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subscriptionId = searchParams.get('id');
    
    if (!subscriptionId) {
      return NextResponse.json({ error: "Subscription ID required" }, { status: 400 });
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

    // Check if subscription exists in database
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .single();

    if (subError) {
      return NextResponse.json({ 
        exists: false, 
        error: "Subscription not found in database",
        details: subError 
      });
    }

    return NextResponse.json({
      exists: true,
      subscription
    });

  } catch (error) {
    console.error("Error checking subscription:", error);
    return NextResponse.json({ 
      error: "Failed to check subscription",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 