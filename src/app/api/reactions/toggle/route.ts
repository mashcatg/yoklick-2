import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId, thumbnailId, reactionType = 'love' } = await req.json();

    if (!userId || !thumbnailId) {
      return NextResponse.json({ error: 'User ID and thumbnail ID are required' }, { status: 400 });
    }

    // Ensure thumbnailId is a number (BIGINT)
    const numericThumbnailId = typeof thumbnailId === 'string' ? parseInt(thumbnailId) : thumbnailId;

    console.log('Attempting to toggle reaction:', {
      userId,
      thumbnailId: numericThumbnailId,
      reactionType
    });

    // Toggle reaction using the database function
    const { data: result, error } = await supabase.rpc('toggle_reaction', {
      p_user_id: userId,
      p_thumbnail_id: numericThumbnailId,
      p_reaction_type: reactionType
    });

    if (error) {
      console.error('Error toggling reaction:', error);
      
      // Try fallback approach using direct table operations
      try {
        console.log('RPC failed, trying direct table operations...');
        
        // Check if user has already reacted
        const { data: existingReaction, error: checkError } = await supabase
          .from('thumbnail_reactions')
          .select('id')
          .eq('user_id', userId)
          .eq('thumbnail_id', thumbnailId)
          .eq('reaction_type', reactionType)
          .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error checking existing reaction:', checkError);
          return NextResponse.json({ error: 'Failed to check existing reaction', details: checkError.message }, { status: 500 });
        }

        let added = false;
        if (existingReaction) {
          // Remove reaction
          const { error: deleteError } = await supabase
            .from('thumbnail_reactions')
            .delete()
            .eq('id', existingReaction.id);

          if (deleteError) {
            console.error('Error removing reaction:', deleteError);
            return NextResponse.json({ error: 'Failed to remove reaction', details: deleteError.message }, { status: 500 });
          }
          added = false;
        } else {
          // Add reaction
          const { error: insertError } = await supabase
            .from('thumbnail_reactions')
            .insert({
              user_id: userId,
              thumbnail_id: thumbnailId,
              reaction_type: reactionType,
              created_at: new Date().toISOString()
            });

          if (insertError) {
            console.error('Error adding reaction:', insertError);
            return NextResponse.json({ error: 'Failed to add reaction', details: insertError.message }, { status: 500 });
          }
          added = true;
        }

        // Get updated reaction count
        const { data: count, error: countError } = await supabase
          .from('thumbnail_reactions')
          .select('id', { count: 'exact' })
          .eq('thumbnail_id', thumbnailId)
          .eq('reaction_type', reactionType);

        if (countError) {
          console.error('Error getting reaction count:', countError);
        }

        return NextResponse.json({ 
          success: true, 
          added, 
          count: count?.length || 0,
          method: 'fallback'
        });

      } catch (fallbackError) {
        console.error('Fallback approach also failed:', fallbackError);
        return NextResponse.json({ 
          error: 'Failed to toggle reaction', 
          details: 'Both RPC and fallback approaches failed',
          rpcError: error.message,
          fallbackError: fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    // Get updated reaction count
    const { data: count, error: countError } = await supabase.rpc('get_reaction_count', {
      p_thumbnail_id: numericThumbnailId,
      p_reaction_type: reactionType
    });

    if (countError) {
      console.error('Error getting reaction count:', countError);
    }

    // Track user behavior for AI suggestions
    if (result) {
      // User added a reaction - track this as positive engagement
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/track-user-behavior`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action: 'reaction_added',
          data: { 
            thumbnailId: numericThumbnailId, 
            reactionType,
            action: 'positive_engagement'
          }
        })
      });
    }

    return NextResponse.json({ 
      success: true, 
      added: result, 
      count: count || 0,
      method: 'rpc'
    });

  } catch (error) {
    console.error('Error in toggle reaction API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 