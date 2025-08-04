import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    message: "Test API route is working",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    url: req.url
  });
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ 
    message: "Test POST route is working",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
} 