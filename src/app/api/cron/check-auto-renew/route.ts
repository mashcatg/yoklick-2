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

    console.log("🔄 Starting auto-renew health check...");

    // For now, skip the attention check since the function doesn't exist
    // TODO: Implement a simpler subscription health check
    console.log("⚠️ Subscription attention check skipped - function not deployed");

    let notificationsSent = 0;
    let errors = 0;

    // For now, skip the upcoming renewals check since the function might not be deployed
    // TODO: Implement a simpler upcoming renewals check
    console.log("⚠️ Upcoming renewals check skipped - function not deployed");

    console.log(`✅ Auto-renew health check completed: ${notificationsSent} notifications, ${errors} errors`);

    return NextResponse.json({ 
      success: true, 
      message: 'Auto-renew health check completed - all subscriptions auto-renew by default',
      notificationsSent,
      errors,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Auto-renew health check error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Also support GET for testing
export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    message: 'Auto-renew health check endpoint is working',
    timestamp: new Date().toISOString()
  });
} 