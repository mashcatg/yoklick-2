import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimit(req, 'track_behavior');
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  try {
    const { userId, action, data } = await req.json();

    if (!userId || !action) {
      return NextResponse.json({ error: "User ID and action are required" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Map actions to interaction types
    const interactionTypeMap: { [key: string]: string } = {
      'view_thumbnail': 'view',
      'like_thumbnail': 'like',
      'share_thumbnail': 'share',
      'download_thumbnail': 'download',
      'open_modal': 'modal_open',
      'search_keywords': 'search',
      'generate_thumbnails': 'generate'
    };

    const interactionType = interactionTypeMap[action] || action;

    // Track user interaction
    if (data?.thumbnailId) {
      await supabase
        .from("user_interactions")
        .insert({
          user_id: userId,
          thumbnail_id: data.thumbnailId,
          interaction_type: interactionType,
          interaction_data: data
        });

      // Update thumbnail analytics
      const analyticsField = `${interactionType}_count`;
      await supabase
        .from("thumbnail_analytics")
        .upsert({
          thumbnail_id: data.thumbnailId,
          [analyticsField]: 1
        }, {
          onConflict: 'thumbnail_id',
          ignoreDuplicates: false
        });

      // Update user preferences based on interaction
      await supabase.rpc('update_user_preferences', {
        p_user_id: userId,
        p_thumbnail_id: data.thumbnailId,
        p_interaction_type: interactionType
      });
    }

    // Handle search interactions
    if (action === 'search_keywords' && data?.keywords) {
      const keywords = Array.isArray(data.keywords) ? data.keywords : [data.keywords];
      
      for (const keyword of keywords) {
        await supabase
          .from("user_preferences")
          .upsert({
            user_id: userId,
            tag: keyword.toLowerCase(),
            interest_score: 0.5, // Small boost for search
            view_count: 1,
            last_interaction: new Date().toISOString()
          }, {
            onConflict: 'user_id,tag',
            ignoreDuplicates: false
          });
      }
    }

    // Handle generation interactions
    if (action === 'generate_thumbnails' && data?.prompt) {
      // Extract keywords from the prompt for preference tracking
      const promptKeywords = data.prompt.toLowerCase().match(/\b\w{3,}\b/g) || [];
      const uniqueKeywords = [...new Set(promptKeywords)].slice(0, 5);
      
      for (const keyword of uniqueKeywords) {
        await supabase
          .from("user_preferences")
          .upsert({
            user_id: userId,
            tag: (keyword as string).toLowerCase(),
            interest_score: 1.0, // Higher boost for generation
            view_count: 1,
            last_interaction: new Date().toISOString()
          }, {
            onConflict: 'user_id,tag',
            ignoreDuplicates: false
          });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "User behavior tracked successfully" 
    });

  } catch (error) {
    console.error("Error tracking user behavior:", error);
    return NextResponse.json({ 
      error: "Failed to track user behavior",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 