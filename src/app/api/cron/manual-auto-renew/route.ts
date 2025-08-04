import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimit(req, 'cron');
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  try {
    // Verify the request is from a legitimate source
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

    console.log("🔄 Starting manual auto-renew check...");

    let notificationsSent = 0;
    let errors = 0;

    // Get subscriptions that need attention
    const { data: attentionSubscriptions, error: attentionError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("status", "active")
      .lt("next_billing_date", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()); // 7 days from now

    if (attentionError) {
      console.error('Error fetching attention subscriptions:', attentionError);
      return NextResponse.json({ 
        success: false, 
        error: attentionError.message 
      }, { status: 500 });
    }

    if (attentionSubscriptions && attentionSubscriptions.length > 0) {
      for (const subscription of attentionSubscriptions) {
        try {
          // Send notification for upcoming renewals
          await sendRenewalNotification(subscription, supabase);
          notificationsSent++;
          console.log(`📧 Sent renewal notification for subscription ${subscription.subscription_id}`);
        } catch (error) {
          console.error(`Error sending notification for ${subscription.subscription_id}:`, error);
          errors++;
        }
      }
    }

    console.log(`✅ Manual auto-renew check completed: ${notificationsSent} notifications, ${errors} errors`);

    return NextResponse.json({ 
      success: true, 
      message: 'Manual auto-renew check completed',
      notificationsSent,
      errors,
      subscriptionsChecked: attentionSubscriptions?.length || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Manual auto-renew check error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
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
          renewal_date: subscription.next_billing_date,
          manual_trigger: true
        }
      });
  } catch (error) {
    console.error('Error sending renewal notification:', error);
    throw error;
  }
}

// Also support GET for testing
export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    message: 'Manual auto-renew endpoint is working',
    timestamp: new Date().toISOString()
  });
} 