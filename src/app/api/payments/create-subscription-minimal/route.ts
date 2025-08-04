import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    message: "Minimal create subscription endpoint is accessible",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
}

export async function POST(req: NextRequest) {
  try {
    const { productId, planType } = await req.json();
    
    return NextResponse.json({
      success: true,
      message: "Minimal subscription creation endpoint working",
      productId,
      planType,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to parse request body",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 400 });
  }
} 