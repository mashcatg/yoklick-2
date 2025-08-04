import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('payment_id');

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`https://${process.env.NODE_ENV === 'development' ? 'test' : 'live'}.dodopayments.com/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.DODO_API_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch payment details: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch payment details' },
      { status: 500 }
    );
  }
} 