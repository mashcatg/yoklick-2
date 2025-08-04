import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    // Get user from authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessToken = authHeader.replace("Bearer ", "");
    
    // Verify user session
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Get payment_id from query parameters
    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get("payment_id");
    
    if (!paymentId) {
      return NextResponse.json({ error: "Payment ID is required" }, { status: 400 });
    }

    // Verify that this payment belongs to the user
    const { data: payment, error: paymentError } = await supabase
      .from("transactions")
      .select("*")
      .eq("payment_id", paymentId)
      .eq("user_id", user.id)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: "Payment not found or access denied" }, { status: 404 });
    }

    // Fetch detailed payment information from DodoPayments
    const dodoResponse = await fetch(
      `https://${process.env.NODE_ENV === 'development' ? 'test' : 'live'}.dodopayments.com/payments/${paymentId}`,
      {
        headers: {
          "Authorization": `Bearer ${process.env.DODO_PAYMENTS_API_KEY || process.env.DODO_API_KEY}`,
        },
      }
    );

    if (!dodoResponse.ok) {
      console.error("DodoPayments payment details error:", dodoResponse.status, dodoResponse.statusText);
      return NextResponse.json(
        { error: "Failed to fetch payment details from payment provider" },
        { status: dodoResponse.status }
      );
    }

    const paymentDetails = await dodoResponse.json();

    // Return enhanced payment details
    return NextResponse.json({
      success: true,
      payment: {
        ...payment,
        dodo_details: paymentDetails,
        // Enhanced details
        billing_address: paymentDetails.billing || null,
        customer_details: paymentDetails.customer || null,
        card_details: paymentDetails.card_last_four ? {
          last_four: paymentDetails.card_last_four,
          network: paymentDetails.card_network,
          type: paymentDetails.card_type,
          issuing_country: paymentDetails.card_issuing_country
        } : null,
        refunds: paymentDetails.refunds || [],
        disputes: paymentDetails.disputes || [],
        settlement_details: paymentDetails.settlement_amount ? {
          amount: paymentDetails.settlement_amount,
          currency: paymentDetails.settlement_currency,
          tax: paymentDetails.settlement_tax
        } : null,
        product_cart: paymentDetails.product_cart || [],
        metadata: paymentDetails.metadata || {},
        error_details: paymentDetails.error_code ? {
          code: paymentDetails.error_code,
          message: paymentDetails.error_message
        } : null
      }
    });

  } catch (error) {
    console.error("Error fetching payment details:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment details" },
      { status: 500 }
    );
  }
} 