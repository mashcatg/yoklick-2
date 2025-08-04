import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import DodoPayments from "dodopayments";
import { rateLimit, getRateLimitHeaders } from "@/lib/rateLimit";

const DODO_API_KEY = process.env.DODO_PAYMENTS_API_KEY || process.env.DODO_API_KEY;

export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    message: "Simple create subscription endpoint is accessible",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    hasApiKey: !!DODO_API_KEY
  });
}

export async function POST(req: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimit(req, 'subscription');
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  try {
    // Check if Dodo Payments is configured
    if (!DODO_API_KEY) {
      return NextResponse.json({ 
        error: "Dodo Payments not configured. Please set up your DODO_PAYMENTS_API_KEY environment variable.",
        details: "Payment system is not configured yet"
      }, { status: 503 });
    }

    // Get user from request headers (client-side auth)
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Please sign in to continue" }, { status: 401 });
    }

    const accessToken = authHeader.replace('Bearer ', '');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const { productId, planType } = await req.json();

    if (!productId || !planType) {
      return NextResponse.json({ error: "Product ID and plan type are required" }, { status: 400 });
    }

    // Initialize Dodo Payments client
    const isDevelopment = process.env.NODE_ENV === 'development';
    const environment = isDevelopment ? 'test_mode' : 'live_mode';
    
    const client = new DodoPayments({
      bearerToken: DODO_API_KEY,
      environment: environment,
    });

    // Simple response for testing
    return NextResponse.json({
      success: true,
      message: "Simple subscription creation endpoint working",
      productId,
      planType,
      environment,
      hasApiKey: !!DODO_API_KEY,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 