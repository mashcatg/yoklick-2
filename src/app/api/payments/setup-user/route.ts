import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Create service role client
    const supabaseService = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { global: { headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` } } }
    );

    // Check if user exists in users_meta
    const { data: existingUser, error: checkError } = await supabaseService
      .from("users_meta")
      .select("id")
      .eq("id", userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error("Error checking user:", checkError);
      return NextResponse.json({ error: "Failed to check user" }, { status: 500 });
    }

    // If user doesn't exist, create the record
    if (!existingUser) {
      const { error: createError } = await supabaseService
        .from("users_meta")
        .insert({
          id: userId,
          credits: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (createError) {
        console.error("Error creating user meta:", createError);
        return NextResponse.json({ error: "Failed to create user meta" }, { status: 500 });
      }

      console.log("✅ Created users_meta record for user:", userId);
      return NextResponse.json({ 
        success: true, 
        message: "User meta created successfully" 
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: "User meta already exists" 
    });

  } catch (error) {
    console.error("Error in setup-user:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
} 