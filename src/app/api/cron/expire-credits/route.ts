import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// This endpoint should be called by a cron job service (e.g., Vercel Cron, GitHub Actions, etc.)
// Example cron schedule: 0 0 * * * (daily at midnight)

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
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Call the database function to expire credits
    const { data, error } = await supabase.rpc('expire_credits');

    if (error) {
      console.error('Error expiring credits:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    console.log('Credit expiry job completed successfully');

    return NextResponse.json({ 
      success: true, 
      message: 'Credits expired successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Credit expiry cron job error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Also support GET for testing
export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    message: 'Credit expiry endpoint is working',
    timestamp: new Date().toISOString()
  });
} 