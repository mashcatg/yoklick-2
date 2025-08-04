import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { rateLimit, getRateLimitHeaders } from "@/lib/rateLimit";

const DODO_WEBHOOK_SECRET = process.env.DODO_WEBHOOK_SECRET;
const ALLOWED_IPS = process.env.DODO_WEBHOOK_IPS?.split(',') || [];
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  // Apply rate limiting for webhooks
  const rateLimitResult = rateLimit(req, 'webhook');
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  try {
    // IP Whitelisting
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown';
    
    if (ALLOWED_IPS.length > 0 && !ALLOWED_IPS.includes(clientIP)) {
      console.error(`Unauthorized IP: ${clientIP}`);
      return NextResponse.json({ error: "Unauthorized IP" }, { status: 403 });
    }

    const body = await req.text();
    const signature = req.headers.get("x-dodo-signature");
    const timestamp = req.headers.get("x-dodo-timestamp");

    // Enhanced webhook verification
    if (!DODO_WEBHOOK_SECRET || !signature || !timestamp) {
      console.error("Missing webhook secret, signature, or timestamp");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check timestamp to prevent replay attacks (within 5 minutes)
    const timestampNum = parseInt(timestamp);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestampNum) > 300) {
      console.error("Webhook timestamp too old or future");
      return NextResponse.json({ error: "Invalid timestamp" }, { status: 401 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", DODO_WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const event = JSON.parse(body);
    console.log("🔔 Dodo webhook received:", event.type);

    // Handle different event types
    switch (event.type) {
      case "subscription.created":
      case "subscription.updated":
      case "subscription.cancelled":
        await handleSubscriptionEvent(event.data);
        break;
      
      case "subscription.renewed":
        await handleSubscriptionRenewal(event.data);
        break;
      
      case "payment.success":
      case "payment.failed":
        await handlePaymentEvent(event.data);
        break;
      
      default:
        console.log("Unhandled webhook event type:", event.type);
    }

    // Add rate limit headers to response
    const headers = getRateLimitHeaders(clientIP, 'webhook');

    return NextResponse.json({ success: true }, { headers });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handleSubscriptionEvent(subscription: any) {
  try {
    console.log("🔄 Syncing subscription:", subscription.subscription_id);
    
    // Update subscription in local database
    const { error } = await supabase
      .from("subscriptions")
      .upsert({
        subscription_id: subscription.subscription_id,
        user_id: subscription.metadata?.user_id,
        plan_type: subscription.metadata?.plan_type || "unknown",
        status: subscription.status,
        amount: subscription.recurring_pre_tax_amount,
        currency: subscription.currency,
        created_at: subscription.created_at,
        next_billing_date: subscription.next_billing_date,
        metadata: {
          ...subscription.metadata,
          product_id: subscription.product_id,
          customer: subscription.customer,
          billing: subscription.billing,
          subscription_period_interval: subscription.subscription_period_interval,
          payment_frequency_interval: subscription.payment_frequency_interval,
          auto_renew_enabled: subscription.status === "active" && !subscription.cancel_at_next_billing_date,
          cancel_at_next_billing_date: subscription.cancel_at_next_billing_date || false,
        },
      });

    if (error) {
      console.error("Error updating subscription:", error);
      return;
    }

    // Update user metadata if user_id is provided
    if (subscription.metadata?.user_id) {
      const { error: userError } = await supabase
        .from("users_meta")
        .upsert({
          user_id: subscription.metadata.user_id,
          subscription_id: subscription.subscription_id,
          plan_type: subscription.metadata.plan_type || "unknown",
          status: subscription.status,
          updated_at: new Date().toISOString(),
        });

      if (userError) {
        console.error("Error updating user metadata:", userError);
      }
    }

    console.log("✅ Subscription synced successfully");
  } catch (error) {
    console.error("Error handling subscription event:", error);
  }
}

async function handleSubscriptionRenewal(subscription: any) {
  try {
    console.log("🔄 Handling subscription renewal:", subscription.subscription_id);
    
    // Update subscription status
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: subscription.status,
        next_billing_date: subscription.next_billing_date,
        updated_at: new Date().toISOString(),
        metadata: {
          ...subscription.metadata,
          product_id: subscription.product_id,
          customer: subscription.customer,
          billing: subscription.billing,
          subscription_period_interval: subscription.subscription_period_interval,
          payment_frequency_interval: subscription.payment_frequency_interval,
          auto_renew_enabled: subscription.status === "active" && !subscription.cancel_at_next_billing_date,
          cancel_at_next_billing_date: subscription.cancel_at_next_billing_date || false,
        },
      })
      .eq("subscription_id", subscription.subscription_id);

    if (error) {
      console.error("Error updating subscription renewal:", error);
      return;
    }

    // Allocate credits for renewal
    if (subscription.metadata?.user_id && subscription.status === "active") {
      try {
        const planType = subscription.metadata?.plan_type || "unknown";
        let creditsToAdd = 0;

        // Determine credits based on plan type
        switch (planType.toLowerCase()) {
          case "starter":
            creditsToAdd = 40;
            break;
          case "creator":
            creditsToAdd = 100;
            break;
          case "pro":
            creditsToAdd = 300;
            break;
          default:
            console.error(`Unknown plan type for renewal: ${planType}`);
            return;
        }

        console.log(`🔄 Allocating ${creditsToAdd} credits for renewal of ${planType} plan`);

        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/payments/allocate-credits`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            userId: subscription.metadata.user_id,
            subscriptionId: subscription.subscription_id,
            planType: planType,
            creditsToAdd: creditsToAdd,
            action: 'subscription_renewal'
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log("✅ Renewal credits allocated successfully:", result);
        } else {
          console.error("Failed to allocate renewal credits:", await response.text());
        }
      } catch (creditError) {
        console.error("Error allocating renewal credits:", creditError);
      }
    }

    console.log("✅ Subscription renewal handled successfully");
  } catch (error) {
    console.error("Error handling subscription renewal:", error);
  }
}

async function handlePaymentEvent(payment: any) {
  try {
    console.log("💳 Syncing payment:", payment.payment_id);
    
    // Insert payment record
    const { error } = await supabase
      .from("transactions")
      .upsert({
        payment_id: payment.payment_id,
        subscription_id: payment.subscription_id,
        user_id: payment.metadata?.user_id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        payment_method: payment.payment_method?.type || "unknown",
        created_at: payment.created_at,
        metadata: {
          ...payment.metadata,
          customer: payment.customer,
          billing: payment.billing,
        },
      });

    if (error) {
      console.error("Error inserting payment:", error);
      return;
    }

    // If payment is successful, allocate credits
    if (payment.status === "success" && payment.metadata?.user_id) {
      try {
        // Check if credits were already allocated for this payment
        const { data: existingAllocation } = await supabase
          .from("credit_history")
          .select("id")
          .eq("payment_id", payment.payment_id)
          .eq("action", "subscription_payment")
          .maybeSingle();

        if (existingAllocation) {
          console.log("✅ Credits already allocated for payment:", payment.payment_id);
          return;
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/payments/allocate-credits`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            userId: payment.metadata.user_id,
            subscriptionId: payment.subscription_id,
            planType: payment.metadata?.plan_type,
          }),
        });

        if (response.ok) {
          console.log("✅ Credits allocated successfully via webhook");
        } else {
          console.error("Failed to allocate credits via webhook:", await response.text());
        }
      } catch (creditError) {
        console.error("Error allocating credits via webhook:", creditError);
      }
    }

    console.log("✅ Payment synced successfully");
  } catch (error) {
    console.error("Error handling payment event:", error);
  }
} 