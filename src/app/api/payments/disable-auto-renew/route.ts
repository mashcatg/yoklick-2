import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  return NextResponse.json({ 
    error: "Auto-renewal cannot be disabled. Subscriptions are set to auto-renew by default. To stop auto-renewal, please cancel your subscription.",
    message: "Auto-renewal is always enabled for active subscriptions"
  }, { status: 400 });
} 