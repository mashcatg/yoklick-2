import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    // Get subscription data
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .single();

    if (subError) {
      return NextResponse.json({ error: "Subscription not found", details: subError }, { status: 404 });
    }

    // Get user data
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(subscription.user_id);

    // Get user meta data
    const { data: userMeta, error: metaError } = await supabase
      .from('users_meta')
      .select('*')
      .eq('id', subscription.user_id)
      .single();

    return NextResponse.json({
      subscription,
      user: user?.user,
      userMeta,
      errors: {
        userError: userError?.message,
        metaError: metaError?.message
      }
    });

  } catch (error) {
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 