import { NextRequest, NextResponse } from 'next/server';

interface FeedbackItem {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  is_reviewed: boolean;
  is_featured: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  status: string;
  admin_reply: string | null;
  updated_at: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
}

export async function GET(request: NextRequest) {
  try {
    // Create a new Supabase client with service role key to bypass RLS
    const { createClient } = require('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch feedback data without problematic join
    const { data, error } = await supabaseAdmin
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching feedback:', error);
      return NextResponse.json(
        { error: 'Failed to fetch feedback', details: error.message },
        { status: 500 }
      );
    }

    // Fetch user data separately to avoid join issues
    const userIds = [...new Set(data?.map((item: FeedbackItem) => item.user_id) || [])];
    let userData: Record<string, UserData> = {};
    
    if (userIds.length > 0) {
      const { data: users, error: userError } = await supabaseAdmin
        .from('users_meta')
        .select('id, name, email, avatar_url')
        .in('id', userIds);
      
      if (!userError && users) {
        userData = users.reduce((acc: Record<string, UserData>, user: UserData) => {
          acc[user.id] = user;
          return acc;
        }, {});
      }
    }

    // Combine feedback with user data
    const feedbackWithUsers = data?.map((feedback: FeedbackItem) => ({
      ...feedback,
      user: userData[feedback.user_id] || null
    })) || [];

    return NextResponse.json({ feedback: feedbackWithUsers });
  } catch (error) {
    console.error('Error in admin feedback API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, updates } = body;

    if (!id || !updates) {
      return NextResponse.json(
        { error: 'ID and updates are required' },
        { status: 400 }
      );
    }

    // Create a new Supabase client with service role key to bypass RLS
    const { createClient } = require('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabaseAdmin
      .from('feedback')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating feedback:', error);
      return NextResponse.json(
        { error: 'Failed to update feedback', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in admin feedback update API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 