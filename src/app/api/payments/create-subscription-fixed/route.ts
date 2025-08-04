import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import DodoPayments from "dodopayments";
import { rateLimit, getRateLimitHeaders } from "@/lib/rateLimit";

const DODO_API_KEY = process.env.DODO_PAYMENTS_API_KEY || process.env.DODO_API_KEY;

export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    message: "Fixed create subscription endpoint is accessible",
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

    // Create or get customer first
    let customerId = user.id;
    
    try {
      // Try to get existing customer
      const customer = await client.customers.retrieve(customerId);
      console.log('Existing customer found:', customer.customer_id);
    } catch (error: any) {
      console.log('Customer retrieval error:', error.status, error.message);
      if (error.status === 404) {
        // Create new customer
        console.log('Creating new customer for user:', user.id);
        const newCustomer = await client.customers.create({
          email: user.email || "",
          name: user.user_metadata?.full_name || user.email || "",
        });
        customerId = newCustomer.customer_id;
        console.log('New customer created:', customerId);
      } else {
        console.error('Customer API error:', error);
        throw error;
      }
    }

    // Create subscription using the official SDK
    console.log('Creating subscription with params:', {
      customerId,
      productId,
      planType,
      userId: user.id
    });
    
    const subscription = await client.subscriptions.create({
      customer: { customer_id: customerId },
      product_id: productId,
      quantity: 1,
      billing: {
        city: "Default City",
        country: "US",
        state: "Default State",
        street: "Default Street",
        zipcode: "12345"
      },
      metadata: {
        user_id: user.id,
        plan_type: planType,
        auto_renew_enabled: "true",
      },
      trial_period_days: 0,
    });
    
    console.log('Subscription created successfully:', subscription.subscription_id);

    // Save subscription to local database
    const { error: subscriptionError } = await supabase
      .from("subscriptions")
      .insert({
        subscription_id: subscription.subscription_id,
        user_id: user.id,
        status: "pending",
        plan_type: planType,
        amount: 0,
        billing_cycle: "monthly",
        created_at: new Date().toISOString(),
        metadata: {
          user_id: user.id,
          plan_type: planType,
          dodo_subscription_id: subscription.subscription_id,
          auto_renew_enabled: true,
          cancel_at_next_billing_date: false,
        }
      });

    if (subscriptionError) {
      console.error("Error saving subscription to database:", subscriptionError);
    }

    // Update user metadata with subscription info
    await supabase.auth.updateUser({
      data: {
        subscription_id: subscription.subscription_id,
        subscription_status: "pending",
        plan_type: planType,
        subscription_created_at: new Date().toISOString(),
      }
    });

    // Generate Dodo Payments checkout URL
    const checkoutBaseUrl = isDevelopment ? 'https://test.checkout.dodopayments.com' : 'https://checkout.dodopayments.com';
    const redirectUrl = `https://yoklick-2-zkkv.vercel.app/checkout?subscription_id=${subscription.subscription_id}`;
    const dodoCheckoutUrl = `${checkoutBaseUrl}/buy/${productId}?quantity=1&redirect_url=${encodeURIComponent(redirectUrl)}`;
    
    console.log('Checkout URL generated:', {
      checkoutBaseUrl,
      productId,
      redirectUrl,
      finalUrl: dodoCheckoutUrl
    });

    // Add rate limit headers to response
    const headers = getRateLimitHeaders(authHeader, 'subscription');

    return NextResponse.json({
      success: true,
      subscription: subscription,
      checkout_url: dodoCheckoutUrl
    }, { headers });

  } catch (error: any) {
    console.error('Error in create subscription:', error);
    
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
        error: "Failed to create subscription",
        details: error instanceof Error ? error.message : "Unknown error"
      }, { status: 500 });
    }
  }
} 