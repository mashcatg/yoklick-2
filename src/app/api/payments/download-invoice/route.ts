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

    // Fetch invoice from DodoPayments
    const isDevelopment = process.env.NODE_ENV === 'development';
    const baseUrl = isDevelopment ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';
    
    const dodoResponse = await fetch(
      `${baseUrl}/invoices/payments/${paymentId}`,
      {
        headers: {
          "Authorization": `Bearer ${process.env.DODO_PAYMENTS_API_KEY}`,
        },
      }
    );

    if (!dodoResponse.ok) {
      console.error("DodoPayments invoice error:", dodoResponse.status, dodoResponse.statusText);
      return NextResponse.json(
        { error: "Failed to fetch invoice from payment provider" },
        { status: dodoResponse.status }
      );
    }

    // Get the PDF blob
    const pdfBlob = await dodoResponse.blob();

    // Return the PDF with proper headers
    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${paymentId}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error("Error downloading invoice:", error);
    return NextResponse.json(
      { error: "Failed to download invoice" },
      { status: 500 }
    );
  }
} 