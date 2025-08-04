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

    // Fetch user's subscription data from database
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (subError && subError.code !== 'PGRST116') {
      console.error("Error fetching subscription:", subError);
    }

    // Fetch user's payment transactions
    const { data: payments, error: paymentsError } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (paymentsError) {
      console.error("Error fetching payments:", paymentsError);
    }

    // Fetch user metadata
    const { data: userMeta, error: userMetaError } = await supabase
      .from("users_meta")
      .select("*")
      .eq("id", user.id)
      .single();

    if (userMetaError && userMetaError.code !== 'PGRST116') {
      console.error("Error fetching user meta:", userMetaError);
    }

    // If user has an active subscription, fetch detailed payment data from DodoPayments
    let detailedPayments: any[] = [];
    if (subscription?.subscription_id) {
      try {
        const dodoResponse = await fetch(
          `https://${process.env.NODE_ENV === 'development' ? 'test' : 'live'}.dodopayments.com/payments?subscription_id=${subscription.subscription_id}`,
          {
            headers: {
              "Authorization": `Bearer ${process.env.DODO_PAYMENTS_API_KEY}`,
            },
          }
        );

        if (dodoResponse.ok) {
          const dodoData = await dodoResponse.json();
          detailedPayments = dodoData.items || [];
        }
      } catch (error) {
        console.error("Error fetching DodoPayments data:", error);
      }
    }

    // Merge database payments with DodoPayments data
    const mergedPayments = (payments || []).map(dbPayment => {
      const dodoPayment = detailedPayments.find(
        dp => dp.payment_id === dbPayment.payment_id
      );
      
      return {
        ...dbPayment,
        dodo_data: dodoPayment || null,
        // Enhanced payment details
        billing_address: dodoPayment?.billing || null,
        customer_details: dodoPayment?.customer || null,
        card_details: dodoPayment ? {
          last_four: dodoPayment.card_last_four,
          network: dodoPayment.card_network,
          type: dodoPayment.card_type,
          issuing_country: dodoPayment.card_issuing_country
        } : null,
        refunds: dodoPayment?.refunds || [],
        disputes: dodoPayment?.disputes || [],
        settlement_details: dodoPayment ? {
          amount: dodoPayment.settlement_amount,
          currency: dodoPayment.settlement_currency,
          tax: dodoPayment.settlement_tax
        } : null
      };
    });

    // Fetch credit history
    const { data: creditHistory, error: creditError } = await supabase
      .from("credit_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (creditError) {
      console.error("Error fetching credit history:", creditError);
    }

    return NextResponse.json({
      subscription: subscription || null,
      payments: mergedPayments,
      creditHistory: creditHistory || [],
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      userMeta: userMeta || null,
      hasActiveSubscription: !!subscription?.status === 'active',
      subscriptionStatus: subscription?.status || 'inactive',
      planType: subscription?.plan_type || 'free'
    });

  } catch (error) {
    console.error("Error in subscription-details API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

 