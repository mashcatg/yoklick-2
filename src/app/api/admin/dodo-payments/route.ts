import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`https://${process.env.NODE_ENV === 'development' ? 'test' : 'live'}.dodopayments.com/payments`, {
      headers: {
        'Authorization': `Bearer ${process.env.DODO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch payments: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    // console.log(`Successfully fetched ${data.items?.length || 0} payments`);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to fetch payments',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 