import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscription_id');

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`https://test.dodopayments.com/subscriptions/${subscriptionId}`, {
      headers: {
        'Authorization': 'Bearer 3QTS0SADKkPuZg1e.O2y69hs3glWtuwAnPksHxiIRkDNUiWM95KsUp_bhNtzkjftN'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch subscription details: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching subscription details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription details' },
      { status: 500 }
    );
  }
} 