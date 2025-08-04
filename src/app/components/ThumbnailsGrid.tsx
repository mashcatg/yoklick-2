import { useState, useEffect } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import ThumbnailCard from "./ThumbnailCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ReactionCache } from "@/app/lib/reactionCache";
import { userDataCache } from "@/app/lib/userDataCache";
import { getUserWithFallback } from "@/app/lib/userCache";

interface Thumbnail {
  id: string;
  image_url: string;
  prompt: string;
  user?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  created_at?: string;
  user_id?: string;
  group_id?: string;
  is_hidden?: boolean;
  is_public?: boolean;
  is_featured?: boolean;
}

interface ThumbnailsGridProps {
  thumbnails: (Thumbnail | null)[];
  loading?: boolean;
  onRegenerate?: (prompt: string, is_public: boolean, text_position: string) => void;
  gridClassName?: string;
  selectedIds?: string[];
  setSelectedIds?: (ids: string[]) => void;
  quantity?: number;
  isRegenerating?: boolean;
  showCheckbox?: boolean;
}

export default function ThumbnailsGrid({
  thumbnails,
  loading = false,
  onRegenerate,
  gridClassName = "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4",
  selectedIds = [],
  setSelectedIds,
  quantity = 12,
  isRegenerating = false,
  showCheckbox = false
}: ThumbnailsGridProps) {
  const [user, setUser] = useState<any>(null);
  const [userReactions, setUserReactions] = useState<Set<string>>(new Set());
  const [reactionCounts, setReactionCounts] = useState<Map<string, number>>(new Map());
  const [enhancedThumbnails, setEnhancedThumbnails] = useState<(Thumbnail | null)[]>(thumbnails);

  // Get current user using smart cache
  useEffect(() => {
    const getUser = async () => {
      try {
        const userData = await getUserWithFallback();
        if (userData) {
          console.log('✅ User loaded in ThumbnailsGrid:', userData.id);
          setUser(userData);
        } else {
          console.log('ℹ️ No user found in ThumbnailsGrid');
        }
      } catch (error) {
        console.error('❌ Error loading user in ThumbnailsGrid:', error);
      }
    };
    getUser();
  }, []);

  // Batch load user data for all thumbnails
  useEffect(() => {
    const loadUserData = async () => {
      if (!thumbnails || thumbnails.length === 0) return;

      // Get all user IDs that need data
      const userIdsToFetch = thumbnails
        .filter(thumb => thumb && thumb.user_id && (!thumb.user || !thumb.user.name))
        .map(thumb => thumb!.user_id)
        .filter((id): id is string => id !== undefined) // Type guard to remove undefined
        .filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates

      if (userIdsToFetch.length === 0) {
        setEnhancedThumbnails(thumbnails);
        return;
      }

      try {
        // Batch fetch user data
        const userDataMap = await userDataCache.batchGetUserData(userIdsToFetch);

        // Enhance thumbnails with user data
        const enhanced = thumbnails.map(thumb => {
          if (!thumb || !thumb.user_id) return thumb;
          
          const userData = userDataMap.get(thumb.user_id);
          if (userData && (!thumb.user || !thumb.user.name)) {
            return {
              ...thumb,
              user: {
                id: userData.id,
                name: userData.name,
                avatar_url: userData.avatar_url,
                email: userData.email
              }
            };
          }
          return thumb;
        });

        setEnhancedThumbnails(enhanced);
      } catch (error) {
        console.error('Error loading user data:', error);
        setEnhancedThumbnails(thumbnails);
      }
    };

    loadUserData();
  }, [thumbnails]);

  // Batch load reactions for all thumbnails
  useEffect(() => {
    const loadReactions = async () => {
      if (!user || !enhancedThumbnails || enhancedThumbnails.length === 0) {
        console.log('❌ Cannot load reactions:', { 
          hasUser: !!user, 
          hasThumbnails: !!enhancedThumbnails, 
          thumbnailsLength: enhancedThumbnails?.length 
        });
        return;
      }

      try {
        console.log('🔄 Loading reactions for user:', user.id);
        console.log('🔍 User object:', {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata
        });
        
        // Get all valid thumbnail IDs
        const validThumbnailIds = enhancedThumbnails
          .filter(thumb => thumb !== null)
          .map(thumb => thumb!.id.toString()); // Ensure IDs are strings

        if (validThumbnailIds.length === 0) {
          console.log('❌ No valid thumbnail IDs found');
          return;
        }

        console.log('📋 Valid thumbnail IDs:', validThumbnailIds);

        // Batch load user reactions and counts
        const [userReactionsSet, countsMap] = await Promise.all([
          ReactionCache.batchCheckUserReactions(user.id, validThumbnailIds),
          ReactionCache.batchGetReactionCounts(validThumbnailIds)
        ]);

        console.log('✅ Reactions loaded:', {
          userReactions: Array.from(userReactionsSet),
          counts: Object.fromEntries(countsMap),
          thumbnailIds: validThumbnailIds
        });

        setUserReactions(userReactionsSet);
        setReactionCounts(countsMap);
      } catch (error) {
        console.error('❌ Error loading reactions:', error);
      }
    };

    loadReactions();
  }, [user, enhancedThumbnails]);

  // Debug: Log when reaction data changes
  useEffect(() => {
    console.log('🔄 Reaction data updated in ThumbnailsGrid:', {
      userReactionsSize: userReactions.size,
      reactionCountsSize: reactionCounts.size,
      userReactionsArray: Array.from(userReactions),
      reactionCountsObject: Object.fromEntries(reactionCounts)
    });
  }, [userReactions, reactionCounts]);

  const handleSelect = (id: string, selected: boolean) => {
    if (!setSelectedIds) return;
    
    if (selected) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  const uniqueKey = (thumb: Thumbnail | null, index: number) => {
    if (!thumb) return `skeleton-${index}`;
    return `thumb-${thumb.id}-${index}`;
  };

  if (loading) {
    return (
      <div className={`grid ${gridClassName}`}>
        {Array.from({ length: quantity }, (_, index) => (
          <div key={`skeleton-${index}`} className="relative group rounded-xl overflow-hidden hover:shadow-lg transition-shadow border border-border flex flex-col col-span-1 aspect-[16/9]">
            <div className="absolute inset-0 w-full h-full">
              <Skeleton className="h-full w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid ${gridClassName}`}>
      {enhancedThumbnails.map((thumbnail, index) => {
        // Skip null thumbnails
        if (!thumbnail) {
          return (
            <div key={`skeleton-${index}`} className="relative group rounded-xl overflow-hidden hover:shadow-lg transition-shadow border border-border flex flex-col col-span-1 aspect-[16/9]">
              <div className="absolute inset-0 w-full h-full">
                <Skeleton className="h-full w-full rounded-xl" />
              </div>
            </div>
          );
        }

        const hasReacted = userReactions.has((thumbnail.id || '').toString());
        const reactionCount = reactionCounts.get((thumbnail.id || '').toString()) || 0;
        
        console.log('📤 Passing reaction data to ThumbnailCard:', {
          thumbnailId: thumbnail.id,
          thumbnailIdType: typeof thumbnail.id,
          hasReacted,
          reactionCount,
          userReactionsSize: userReactions.size,
          reactionCountsSize: reactionCounts.size,
          userReactionsArray: Array.from(userReactions),
          reactionCountsObject: Object.fromEntries(reactionCounts),
          userReactionsHasThumbnail: userReactions.has(thumbnail.id || ''),
          reactionCountsHasThumbnail: reactionCounts.has(thumbnail.id || ''),
          userReactionsContainsThumbnail: Array.from(userReactions).includes(thumbnail.id || ''),
          userReactionsContainsThumbnailString: Array.from(userReactions).includes((thumbnail.id || '').toString())
        });

        return (
          <ThumbnailCard
            key={uniqueKey(thumbnail, index)}
            thumbnail={thumbnail}
            selected={selectedIds.includes(thumbnail.id || '')}
            onSelect={handleSelect}
            isSelectionMode={selectedIds.length > 0}
            showCheckbox={showCheckbox}
            // Pass pre-loaded reaction data for performance
            hasReacted={hasReacted}
            reactionCount={reactionCount}
          />
        );
      })}
    </div>
  );
}