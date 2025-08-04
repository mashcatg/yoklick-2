import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { subscriptionId, planType, userId, amount = 1849, status = 'active' } = await req.json();
    
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

    // Add subscription to database
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        subscription_id: subscriptionId,
        user_id: userId,
        status: status,
        plan_type: planType,
        recurring_amount: amount,
        currency: 'USD',
        customer_id: null,
        created_at: new Date().toISOString(),
        next_billing_date: new Date().toISOString(),
        metadata: {
          user_id: userId,
          plan_type: planType
        },
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (subError) {
      return NextResponse.json({ 
        error: "Failed to add subscription",
        details: subError
      }, { status: 500 });
    }

    // Update user metadata
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        subscription_status: status,
        plan_type: planType,
        subscription_updated_at: new Date().toISOString(),
      }
    });

    return NextResponse.json({
      success: true,
      message: `Subscription ${subscriptionId} added successfully`,
      subscription,
      planType,
      status
    });

  } catch (error) {
    console.error("Error adding subscription:", error);
    return NextResponse.json({ 
      error: "Failed to add subscription",
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

    // Check if subscription exists
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .single();

    if (subError) {
      return NextResponse.json({ 
        exists: false, 
        error: "Subscription not found",
        details: subError,
        subscriptionId
      });
    }

    return NextResponse.json({
      exists: true,
      subscription,
      subscriptionId
    });

  } catch (error) {
    console.error("Error checking subscription:", error);
    return NextResponse.json({ 
      error: "Failed to check subscription",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 