import { NextRequest, NextResponse } from "next/server";
import DodoPayments from "dodopayments";

const DODO_API_KEY = process.env.DODO_API_KEY;

export async function GET(req: NextRequest) {
  try {
    // Check if Dodo Payments is configured
    if (!DODO_API_KEY) {
      return NextResponse.json({
        success: false,
        error: "Dodo Payments is not configured"
      }, { status: 500 });
    }

    // Initialize Dodo Payments client
    const client = new DodoPayments({
      bearerToken: DODO_API_KEY,
                      environment: process.env.NODE_ENV === 'development' ? 'test_mode' : 'live_mode',
    });

    // Get all payments
    let allPayments: any[] = [];
    let pageNumber = 0;
    const pageSize = 100;

    try {
      // Fetch all payments with pagination
      while (true) {
        const paymentsResponse = await client.payments.list({
          page_size: pageSize,
          page_number: pageNumber
        });

        if (!paymentsResponse.items || paymentsResponse.items.length === 0) {
          break;
        }

        allPayments = allPayments.concat(paymentsResponse.items);
        pageNumber++;

        // Limit to first 1000 payments to avoid infinite loops
        if (allPayments.length >= 1000) {
          break;
        }
      }

      // Sort by created_at (newest first)
      allPayments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return NextResponse.json({
        success: true,
        payments: allPayments,
        total: allPayments.length
      });

    } catch (error: any) {
      console.error("Error fetching payments:", error);
      return NextResponse.json({
        success: false,
        error: "Failed to fetch payments",
        details: error.message || "Unknown error"
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Admin payments error:", error);
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 