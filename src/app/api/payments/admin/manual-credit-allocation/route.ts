import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { userId, credits, planType, action } = await req.json();

    if (!userId || !credits || credits <= 0) {
      return NextResponse.json({
        success: false,
        error: "Invalid parameters. User ID and credits are required."
      }, { status: 400 });
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
    const newCredits = currentCredits + credits;
    
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

    // Insert credit history record
    const { error: historyError } = await supabase
      .from("credit_history")
      .insert({
        user_id: userId,
        credits_added: credits,
        credits_remaining: newCredits,
        action: action || 'manual_allocation',
        plan_type: planType || 'manual',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        metadata: {
          admin_action: true,
          reason: 'Manual allocation by admin'
        }
      });

    if (historyError) {
      console.error('Error inserting credit history:', historyError);
      // Don't fail the request if history insertion fails
    }

    console.log(`Admin manually allocated ${credits} credits to user ${userId}. Total: ${newCredits}`);

    return NextResponse.json({
      success: true,
      message: `Successfully allocated ${credits} credits`,
      userId,
      creditsAdded: credits,
      totalCredits: newCredits
    });

  } catch (error: any) {
    console.error("Manual credit allocation error:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to allocate credits",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 