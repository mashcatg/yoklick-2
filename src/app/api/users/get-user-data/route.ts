import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { userIds } = await req.json();
    
    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: "User IDs array is required" }, { status: 400 });
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: users, error } = await supabase
      .from("users_meta")
      .select("id, name, avatar_url, email")
      .in("id", userIds);

    if (error) {
      console.error("Error fetching user data:", error);
      return NextResponse.json({ error: "Failed to fetch user data" }, { status: 500 });
    }

    return NextResponse.json({ users: users || [] });
  } catch (error) {
    console.error("Error in get-user-data API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 