import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: "User ID is required"
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

    // Get all credit history for the user
    const { data: creditHistory, error: historyError } = await supabase
      .from("credit_history")
      .select("*")
      .eq("user_id", userId)
      .eq("action", "subscription_payment")
      .order("created_at", { ascending: true });

    if (historyError) {
      return NextResponse.json({
        success: false,
        error: "Failed to fetch credit history"
      }, { status: 500 });
    }

    // Group by subscription_id to find duplicates
    const groupedBySubscription: { [key: string]: any[] } = {};
    
    creditHistory?.forEach(record => {
      const subscriptionId = record.subscription_id;
      if (!groupedBySubscription[subscriptionId]) {
        groupedBySubscription[subscriptionId] = [];
      }
      groupedBySubscription[subscriptionId].push(record);
    });

    let duplicatesRemoved = 0;
    let totalRecords = 0;

    // Process each subscription group
    for (const [subscriptionId, records] of Object.entries(groupedBySubscription)) {
      if (records.length > 1) {
        console.log(`Found ${records.length} records for subscription ${subscriptionId}`);
        
        // Keep the first record (earliest created_at), delete the rest
        const [firstRecord, ...duplicateRecords] = records;
        
        for (const duplicateRecord of duplicateRecords) {
          const { error: deleteError } = await supabase
            .from("credit_history")
            .delete()
            .eq("id", duplicateRecord.id);
          
          if (deleteError) {
            console.error(`Failed to delete duplicate record ${duplicateRecord.id}:`, deleteError);
          } else {
            duplicatesRemoved++;
            console.log(`Deleted duplicate record ${duplicateRecord.id} for subscription ${subscriptionId}`);
          }
        }
      }
      totalRecords += records.length;
    }

    // Recalculate user credits after cleanup
    const { data: remainingHistory, error: remainingError } = await supabase
      .from("credit_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (remainingError) {
      return NextResponse.json({
        success: false,
        error: "Failed to fetch remaining credit history"
      }, { status: 500 });
    }

    // Calculate correct totals
    let totalCredits = 0;
    let totalEarned = 0;
    let totalUsed = 0;

    remainingHistory?.forEach((record) => {
      if (record.action === 'subscription_payment') {
        totalCredits += record.credits_added;
        totalEarned += record.credits_added;
      } else if (record.action === 'usage') {
        totalCredits -= record.credits_used;
        totalUsed += record.credits_used;
      }
    });

    // Update users_meta with correct totals
    const { error: updateError } = await supabase
      .from("users_meta")
      .update({
        credits: totalCredits,
        total_credits_earned: totalEarned,
        total_credits_used: totalUsed
      })
      .eq("id", userId);

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: "Failed to update user credits"
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Duplicate credits cleaned up successfully",
      duplicatesRemoved,
      totalRecords,
      finalCredits: totalCredits,
      finalEarned: totalEarned,
      finalUsed: totalUsed
    });

  } catch (error: any) {
    console.error("Error fixing duplicate credits:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to fix duplicate credits",
      details: error.message
    }, { status: 500 });
  }
} 