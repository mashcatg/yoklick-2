import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId, userInterests, recentSearches, viewedThumbnails, limit = 12 } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user profile data from database
    const { data: userData, error: userError } = await supabase
      .from('users_meta')
      .select('user_interests, recent_searches, viewed_thumbnails, favorite_themes')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
    }

    // Build comprehensive user profile
    const userProfile = {
      interests: userData?.user_interests || userInterests || [],
      searches: userData?.recent_searches || recentSearches || [],
      viewed: userData?.viewed_thumbnails || viewedThumbnails || [],
      favorites: userData?.favorite_themes || []
    };

    // Get user's loved thumbnails for better suggestions
    const { data: lovedThumbnails, error: lovedError } = await supabase
      .from('thumbnail_reactions')
      .select(`
        thumbnail_id,
        thumbnails!inner(
          id,
          prompt,
          image_url,
          user:users_meta(id, name, avatar_url)
        )
      `)
      .eq('user_id', userId)
      .eq('reaction_type', 'love')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!lovedError && lovedThumbnails && lovedThumbnails.length > 0) {
      // Add loved thumbnail prompts to user profile
      const lovedPrompts = lovedThumbnails.map((item: any) => item.thumbnails.prompt);
      userProfile.interests = [...userProfile.interests, ...lovedPrompts];
    }

    // Generate AI suggestions based on user profile
    let suggestions: string[] = [];
    
    if (userProfile.interests.length > 0 || userProfile.searches.length > 0) {
      try {
        const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Based on this user profile, suggest 3-5 thumbnail themes or topics that would interest them. Return only the suggestions separated by commas, no explanations: User interests: ${userProfile.interests.join(', ')}. Recent searches: ${userProfile.searches.join(', ')}. Loved thumbnails: ${lovedThumbnails?.map((item: any) => item.thumbnails.prompt).join(', ') || 'none'}`
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 150,
            }
          })
        });

        if (geminiResponse.ok) {
          const result = await geminiResponse.json();
          const suggestionsText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
          suggestions = suggestionsText.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      } catch (error) {
        console.error('Error getting AI suggestions:', error);
      }
    }

    // Search for thumbnails based on suggestions and user profile
    let suggestedThumbnails: any[] = [];
    
    if (suggestions.length > 0) {
      for (const suggestion of suggestions) {
        if (suggestedThumbnails.length >= limit) break;
        
        const { data: similar } = await supabase
          .from("thumbnails")
          .select("*, user:users_meta(id, name, avatar_url)")
          .or(`prompt.ilike.%${suggestion}%,prompt.ilike.${suggestion}%,prompt.ilike.%${suggestion}`)
          .neq("user_id", userId) // Don't suggest user's own thumbnails
          .eq("is_hidden", false)
          .or("is_public.eq.true,is_featured.eq.true")
          .order("created_at", { ascending: false })
          .limit(Math.ceil(limit / suggestions.length));
          
        if (similar && similar.length > 0) {
          const existingIds = suggestedThumbnails.map(t => t.id);
          const newThumbs = similar.filter(t => !existingIds.includes(t.id));
          suggestedThumbnails = [...suggestedThumbnails, ...newThumbs];
        }
      }
    }

    // If we don't have enough suggestions, add trending thumbnails
    if (suggestedThumbnails.length < limit) {
      const { data: trending } = await supabase
        .from("thumbnails")
        .select("*, user:users_meta(id, name, avatar_url)")
        .or("is_public.eq.true,is_featured.eq.true")
        .neq("user_id", userId)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(limit - suggestedThumbnails.length);
        
      if (trending && trending.length > 0) {
        const existingIds = suggestedThumbnails.map(t => t.id);
        const newThumbs = trending.filter(t => !existingIds.includes(t.id));
        suggestedThumbnails = [...suggestedThumbnails, ...newThumbs];
      }
    }

    // Shuffle and limit results
    suggestedThumbnails = suggestedThumbnails.sort(() => Math.random() - 0.5).slice(0, limit);

    return NextResponse.json({ 
      suggestions: suggestions,
      thumbnails: suggestedThumbnails,
      userProfile: userProfile
    });

  } catch (error) {
    console.error('Error in AI suggestions API:', error);
    
    // Fallback to trending thumbnails
    try {
      const { data: trending } = await supabase
        .from("thumbnails")
        .select("*, user:users_meta(id, name, avatar_url)")
        .or("is_public.eq.true,is_featured.eq.true")
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(12);
        
      return NextResponse.json({ 
        suggestions: [],
        thumbnails: trending || [],
        userProfile: {}
      });
    } catch (fallbackError) {
      console.error('Error in fallback:', fallbackError);
      return NextResponse.json({ 
        suggestions: [],
        thumbnails: [],
        userProfile: {}
      });
    }
  }
} 