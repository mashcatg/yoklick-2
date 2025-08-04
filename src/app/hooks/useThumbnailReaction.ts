import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import { toast } from 'sonner';
import { reactionCache } from '@/app/lib/reactionCache';
import { getUserWithFallback } from '@/app/lib/userCache';

export const useThumbnailReaction = (
  thumbnailId: string,
  preLoadedHasReacted?: boolean,
  preLoadedReactionCount?: number
) => {
  const [hasReacted, setHasReacted] = useState(false);
  const [reactionCount, setReactionCount] = useState(0);
  const [isReactionLoading, setIsReactionLoading] = useState(false);
  const [showBigHeart, setShowBigHeart] = useState(false);
  const [isReactionDataLoading, setIsReactionDataLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getUserWithFallback();
        if (userData) {
          setUser(userData);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (preLoadedHasReacted !== undefined && preLoadedReactionCount !== undefined) {
      setHasReacted(preLoadedHasReacted);
      setReactionCount(preLoadedReactionCount);
      setIsReactionDataLoading(false);
    } else if (user && thumbnailId) {
      Promise.all([
        checkUserReaction(),
        getReactionCount()
      ]).then(() => {
        setIsReactionDataLoading(false);
      }).catch(error => {
        console.error('Error getting reaction count:', error);
        setIsReactionDataLoading(false);
      });
    } else {
      setIsReactionDataLoading(false);
    }
  }, [user, thumbnailId, preLoadedHasReacted, preLoadedReactionCount]);

  const checkUserReaction = async () => {
    if (!user || !thumbnailId) return;
    
    try {
      const hasReacted = await reactionCache.getUserReactions(user.id).then(reactions => reactions.has(thumbnailId));
      setHasReacted(hasReacted);
    } catch (error) {
      console.error('Error checking user reaction:', error);
      setHasReacted(false);
    }
  };

  const getReactionCount = async () => {
    if (!thumbnailId) return;
    
    try {
      const count = await reactionCache.getReactionCount(thumbnailId);
      setReactionCount(count);
    } catch (error) {
      console.error('Error getting reaction count:', error);
      setReactionCount(0);
    }
  };

  const handleReaction = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (isReactionLoading) return;

    let currentUser = user;
    if (!currentUser) {
      try {
        currentUser = await getUserWithFallback();
        if (currentUser) {
          setUser(currentUser);
        } else {
          toast.error("Please log in to react to thumbnails");
          return;
        }
      } catch (error) {
        console.error('Error getting user from cache:', error);
        toast.error("Please log in to react to thumbnails");
        return;
      }
    }

    if (!currentUser) {
      toast.error("Please log in to react to thumbnails");
      return;
    }

    try {
      setIsReactionLoading(true);
      
      const { data: rpcData, error: rpcError } = await supabase.rpc('toggle_reaction', {
        p_user_id: currentUser.id,
        p_thumbnail_id: parseInt(thumbnailId),
        p_reaction_type: 'love'
      });
      
      if (!rpcError) {
        const newHasReacted = !hasReacted;
        setHasReacted(newHasReacted);
        setReactionCount(prev => newHasReacted ? prev + 1 : Math.max(0, prev - 1));
        
        reactionCache.invalidateUserCache(currentUser.id);
        
        if (!hasReacted) {
          setShowBigHeart(true);
          setTimeout(() => setShowBigHeart(false), 1000);
        }
        return;
      }
      
      // Fallback approach
      if (hasReacted) {
        const { error: deleteError } = await supabase
          .from('thumbnail_reactions')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('thumbnail_id', parseInt(thumbnailId))
          .eq('reaction_type', 'love');
        
        if (deleteError) {
          toast.error("Failed to react to thumbnail");
          return;
        }
        
        setHasReacted(false);
        setReactionCount(prev => Math.max(0, prev - 1));
      } else {
        const { error: insertError } = await supabase
          .from('thumbnail_reactions')
          .insert({
            user_id: currentUser.id,
            thumbnail_id: parseInt(thumbnailId),
            reaction_type: 'love',
            created_at: new Date().toISOString()
          });
        
        if (insertError) {
          toast.error("Failed to react to thumbnail");
          return;
        }
        
        setHasReacted(true);
        setReactionCount(prev => prev + 1);
        
        setShowBigHeart(true);
        setTimeout(() => setShowBigHeart(false), 1000);
      }
      
      reactionCache.invalidateUserCache(currentUser.id);
      
    } catch (error) {
      console.error('Error handling reaction:', error);
      toast.error("Failed to react to thumbnail");
    } finally {
      setIsReactionLoading(false);
    }
  };

  return {
    hasReacted,
    reactionCount,
    isReactionLoading,
    showBigHeart,
    isReactionDataLoading,
    handleReaction
  };
}; 