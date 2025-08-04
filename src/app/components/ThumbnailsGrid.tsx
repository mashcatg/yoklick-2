import { useState, useEffect } from "react";
import { getUserWithFallback } from "@/app/lib/userCache";
import { reactionCache } from "@/app/lib/reactionCache";
import { userDataCache } from "@/app/lib/userDataCache";
import ThumbnailCard from "./ThumbnailCard";
import { Skeleton } from "@/components/ui/skeleton";

interface Thumbnail {
  id: string;
  image_url: string;
  prompt: string;
  text_position?: string;
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
  loading: boolean;
  onRegenerate: (prompt: string, is_public: boolean, text_position: string) => void;
  gridClassName?: string;
  selectedIds?: string[];
  setSelectedIds?: (ids: string[]) => void;
  quantity?: number;
  isRegenerating?: boolean;
  showCheckbox?: boolean;
}

export default function ThumbnailsGrid({
  thumbnails,
  loading,
  onRegenerate,
  gridClassName = "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4",
  selectedIds = [],
  setSelectedIds,
  quantity,
  isRegenerating = false,
  showCheckbox = false,
}: ThumbnailsGridProps) {
  const [user, setUser] = useState<any>(null);
  const [userReactions, setUserReactions] = useState<Set<string>>(new Set());
  const [reactionCounts, setReactionCounts] = useState<Map<string, number>>(new Map());
  const [enhancedThumbnails, setEnhancedThumbnails] = useState<(Thumbnail | null)[]>(thumbnails);
  const [userLoaded, setUserLoaded] = useState(false);

  // Get current user using smart cache
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await getUserWithFallback();
        if (userData) {
          setUser(userData);
          setUserLoaded(true);
        }
      } catch (error) {
        // Silent error handling for production
      }
    };

    loadUser();
  }, []);

  // Enhance thumbnails with user data
  useEffect(() => {
    const enhanceThumbnails = async () => {
      if (!thumbnails || thumbnails.length === 0) return;

      try {
        const validThumbnails = thumbnails.filter(thumb => thumb !== null) as Thumbnail[];
        const userIds = [...new Set(validThumbnails.map(thumb => thumb.user_id).filter(Boolean))] as string[];
        
        if (userIds.length === 0) {
          setEnhancedThumbnails(thumbnails);
          return;
        }

        const userData = await userDataCache.batchGetUserData(userIds);
        const enhanced = thumbnails.map(thumb => {
          if (!thumb) return null;
          const userInfo = userData.get(thumb.user_id || '');
          return {
            ...thumb,
            user: userInfo || thumb.user
          };
        });

        setEnhancedThumbnails(enhanced);
      } catch (error) {
        // Silent error handling for production
      }
    };

    enhanceThumbnails();
  }, [thumbnails]);

  // Load user data for reaction handling
  useEffect(() => {
    const loadUserData = async () => {
      if (!userLoaded) return;

      try {
        const userData = await getUserWithFallback();
        if (userData?.id) {
          setUser(userData);
        }
      } catch (error) {
        // Silent error handling for production
      }
    };

    loadUserData();
  }, [userLoaded]);

  // Load reaction data for all thumbnails
  useEffect(() => {
    const loadReactionData = async () => {
      if (!user?.id || !thumbnails || thumbnails.length === 0) {
        return;
      }

      try {
        // Get valid thumbnail IDs (filter out null thumbnails)
        const validThumbnailIds = thumbnails
          .filter(thumb => thumb && thumb.id)
          .map(thumb => thumb!.id.toString());

        if (validThumbnailIds.length === 0) {
          return;
        }

        console.log("Valid thumbnail IDs for reaction loading:", validThumbnailIds);
        console.log("User ID for reaction loading:", user.id);

        // Batch load user reactions and reaction counts
        const [userReactions, reactionCounts] = await Promise.all([
          reactionCache.batchCheckUserReactions(user.id, validThumbnailIds).catch(() => new Set<string>()),
          reactionCache.batchGetReactionCounts(validThumbnailIds).catch(() => new Map<string, number>())
        ]);

        console.log("User reactions loaded:", userReactions);
        console.log("Reaction counts loaded:", reactionCounts);

        setUserReactions(userReactions);
        setReactionCounts(reactionCounts);
      } catch (error) {
        // Silent error handling for production
        console.error("Error loading reaction data:", error);
        // Set default values on error
        setUserReactions(new Set());
        setReactionCounts(new Map());
      }
    };

    loadReactionData();
  }, [user?.id, thumbnails]);

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
        {Array.from({ length: quantity || 12 }, (_, index) => (
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