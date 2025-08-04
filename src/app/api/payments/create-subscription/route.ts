import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import DodoPayments from "dodopayments";
import { rateLimit, getRateLimitHeaders } from "@/lib/rateLimit";

const DODO_API_KEY = process.env.DODO_API_KEY;

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
        error: "Dodo Payments not configured. Please set up your DODO_API_KEY environment variable.",
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

    try {
      // Create or get customer first
      let customerId = user.id;
      
      try {
        // Try to get existing customer
        const customer = await client.customers.retrieve(customerId);
      } catch (error: any) {
        if (error.status === 404) {
          // Create new customer
          const newCustomer = await client.customers.create({
            email: user.email || "",
            name: user.user_metadata?.full_name || user.email || "",
          });
          customerId = newCustomer.customer_id;
        } else {
          throw error;
        }
      }

      // Create subscription using the official SDK
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
          auto_renew_enabled: "true", // Always enable auto-renewal
        },
        trial_period_days: 0,
      });

      // Save subscription to local database
      const { error: subscriptionError } = await supabase
        .from("subscriptions")
        .insert({
          subscription_id: subscription.subscription_id,
          user_id: user.id,
          status: "pending",
          plan_type: planType,
          amount: 0, // Will be updated when payment is completed
          billing_cycle: "monthly", // Default to monthly, can be updated later
          created_at: new Date().toISOString(),
          metadata: {
            user_id: user.id,
            plan_type: planType,
            dodo_subscription_id: subscription.subscription_id,
            auto_renew_enabled: true, // Always enable auto-renewal
            cancel_at_next_billing_date: false, // Ensure auto-renewal is enabled
          }
        });

      if (subscriptionError) {
        console.error("Error saving subscription to database:", subscriptionError);
        // Continue anyway as the subscription was created in Dodo Payments
      }

      // Update user metadata with subscription info
      await supabase.auth.updateUser({
        data: {
          subscription_id: subscription.subscription_id,
          subscription_status: "pending", // Set to pending until payment is completed
          plan_type: planType,
          subscription_created_at: new Date().toISOString(),
        }
      });

      // Generate Dodo Payments checkout URL (test vs live)
      const checkoutBaseUrl = isDevelopment ? 'https://test.checkout.dodopayments.com' : 'https://checkout.dodopayments.com';
      const dodoCheckoutUrl = `${checkoutBaseUrl}/buy/${productId}?quantity=1&redirect_url=${encodeURIComponent('https://d5dd4f150298.ngrok-free.app/checkout?subscription_id=' + subscription.subscription_id)}`;

      // Add rate limit headers to response
      const headers = getRateLimitHeaders(authHeader, 'subscription');

      return NextResponse.json({
        success: true,
        subscription: subscription,
        checkout_url: dodoCheckoutUrl
      }, { headers });

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
          error: "Failed to create subscription",
          details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
      }
    }

  } catch (error) {
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 