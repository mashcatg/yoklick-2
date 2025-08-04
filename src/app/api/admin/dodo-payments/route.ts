import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching payments from Dodo Payments...');
    
    const response = await fetch('https://test.dodopayments.com/payments', {
      headers: {
        'Authorization': 'Bearer 3QTS0SADKkPuZg1e.O2y69hs3glWtuwAnPksHxiIRkDNUiWM95KsUp_bhNtzkjftN',
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error(`Dodo API error: ${response.status} - ${response.statusText}`);
      throw new Error(`Failed to fetch payments: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Successfully fetched ${data.items?.length || 0} payments`);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch payments',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 