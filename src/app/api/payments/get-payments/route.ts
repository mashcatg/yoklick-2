import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import DodoPayments from "dodopayments";

const DODO_API_KEY = process.env.DODO_PAYMENTS_API_KEY || process.env.DODO_API_KEY;

export async function GET(req: NextRequest) {
  try {
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

    const { searchParams } = new URL(req.url);
    const subscriptionId = searchParams.get('subscription_id');

    if (!subscriptionId) {
      return NextResponse.json({ error: "Subscription ID is required" }, { status: 400 });
    }

    // Initialize Dodo Payments client
    const isDevelopment = process.env.NODE_ENV === 'development';
    const environment = isDevelopment ? 'test_mode' : 'live_mode';
    
    const client = new DodoPayments({
      bearerToken: DODO_API_KEY!,
      environment: environment,
    });

    try {
      // First get subscription details to get customer_id
      const subscriptionResponse = await fetch(`https://${isDevelopment ? 'test' : 'live'}.dodopayments.com/subscriptions/${subscriptionId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.DODO_PAYMENTS_API_KEY || process.env.DODO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      let customerId = null;
      if (subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json();
        customerId = subscriptionData.customer?.customer_id;
        console.log("🔍 Found customer ID:", customerId);
      }

      // Fetch payments from Dodo Payments using customer_id for more comprehensive results
      let dodoPayments: any[] = [];
      if (customerId) {
        const paymentsResponse = await fetch(`https://${isDevelopment ? 'test' : 'live'}.dodopayments.com/payments?customer_id=${customerId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.DODO_PAYMENTS_API_KEY || process.env.DODO_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        if (paymentsResponse.ok) {
          const paymentsData = await paymentsResponse.json();
          dodoPayments = paymentsData.items || [];
          console.log("🔍 Found payments for customer:", dodoPayments.length);
        }
      } else {
        // Fallback to subscription_id if customer_id not found
        const paymentsResponse = await fetch(`https://${isDevelopment ? 'test' : 'live'}.dodopayments.com/payments?subscription_id=${subscriptionId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.DODO_PAYMENTS_API_KEY || process.env.DODO_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        if (paymentsResponse.ok) {
          const paymentsData = await paymentsResponse.json();
          dodoPayments = paymentsData.items || [];
        }
      }

      // Also fetch from local database
      const { data: localPayments } = await supabase
        .from("transactions")
        .select("*")
        .eq("subscription_id", subscriptionId)
        .order("created_at", { ascending: false });

      // Merge and deduplicate payments
      const allPayments = [...dodoPayments];
      
      // Add local payments that aren't in Dodo payments
      if (localPayments) {
        localPayments.forEach(localPayment => {
          const exists = dodoPayments.some(dodoPayment => 
            dodoPayment.payment_id === localPayment.payment_id
          );
          if (!exists) {
            allPayments.push(localPayment);
          }
        });
      }

      // Sort by created_at descending
      allPayments.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return NextResponse.json({
        success: true,
        payments: allPayments,
        count: allPayments.length
      });

    } catch (error: any) {
      if (error instanceof DodoPayments.APIError) {
        return NextResponse.json({ 
          error: "Dodo Payments API error",
          details: {
            status: error.status,
            name: error.name,
            message: error.message
          }
        }, { status: error.status || 500 });
      } else {
        return NextResponse.json({ 
          error: "Failed to fetch payments",
          details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
      }
    }

  } catch (error) {
    console.error("Get payments error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 