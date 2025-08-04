import { supabase } from './supabaseClient';

interface CachedReaction {
  data: any;
  timestamp: number;
  expiresAt: number;
}

class ReactionCache {
  private userReactionsCache = new Map<string, CachedReaction>();
  private reactionCountsCache = new Map<string, CachedReaction>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private isExpired(cached: CachedReaction): boolean {
    return Date.now() > cached.expiresAt;
  }

  private setCache<T>(cache: Map<string, CachedReaction>, key: string, data: T): void {
    const now = Date.now();
    cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + this.CACHE_DURATION
    });
  }

  private getCache<T>(cache: Map<string, CachedReaction>, key: string): T | null {
    const cached = cache.get(key);
    if (cached && !this.isExpired(cached)) {
      return cached.data as T;
    }
    return null;
  }

  async getUserReactions(userId: string): Promise<Set<string>> {
    const cacheKey = `user_reactions_${userId}`;
    const cached = this.getCache<Set<string>>(this.userReactionsCache, cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('thumbnail_reactions')
        .select('thumbnail_id')
        .eq('user_id', userId)
        .eq('reaction_type', 'love');

      if (error) {
        console.error("Error fetching user reactions:", error);
        return new Set();
      }

      const reactedIds = new Set(data?.map(item => item.thumbnail_id.toString()) || []);
      this.setCache(this.userReactionsCache, cacheKey, reactedIds);
      return reactedIds;
    } catch (error) {
      console.error("Error in getUserReactions:", error);
      return new Set();
    }
  }

  async getReactionCount(thumbnailId: string): Promise<number> {
    const cacheKey = `reaction_count_${thumbnailId}`;
    const cached = this.getCache<number>(this.reactionCountsCache, cacheKey);
    
    if (cached !== null) {
      return cached;
    }

    try {
      const { count, error } = await supabase
        .from('thumbnail_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('thumbnail_id', thumbnailId)
        .eq('reaction_type', 'love');

      if (error) {
        console.error("Error fetching reaction count:", error);
        return 0;
      }

      this.setCache(this.reactionCountsCache, cacheKey, count || 0);
      return count || 0;
    } catch (error) {
      console.error("Error in getReactionCount:", error);
      return 0;
    }
  }

  async batchCheckUserReactions(userId: string, thumbnailIds: string[]): Promise<Set<string>> {
    const cacheKey = `user_reactions_${userId}`;
    const cached = this.getCache<Set<string>>(this.userReactionsCache, cacheKey);
    
    if (cached) {
      // Filter cached reactions to only include the requested thumbnail IDs
      const filteredReactions = new Set<string>();
      thumbnailIds.forEach(id => {
        if (cached.has(id)) {
          filteredReactions.add(id);
        }
      });
      return filteredReactions;
    }

    try {
      const { data, error } = await supabase
        .from('thumbnail_reactions')
        .select('thumbnail_id')
        .eq('user_id', userId)
        .eq('reaction_type', 'love')
        .in('thumbnail_id', thumbnailIds);

      if (error) {
        console.error("Error in batchCheckUserReactions:", error);
        return new Set();
      }

      const reactedIds = new Set(data?.map(item => item.thumbnail_id.toString()) || []);
      this.setCache(this.userReactionsCache, cacheKey, reactedIds);
      return reactedIds;
    } catch (error) {
      console.error("Error in batchCheckUserReactions:", error);
      return new Set();
    }
  }

  async batchGetReactionCounts(thumbnailIds: string[]): Promise<Map<string, number>> {
    const results = new Map<string, number>();
    const uncachedIds: string[] = [];

    // Check cache first
    thumbnailIds.forEach(id => {
      const cacheKey = `reaction_count_${id}`;
      const cached = this.getCache<number>(this.reactionCountsCache, cacheKey);
      
      if (cached !== null) {
        results.set(id, cached);
      } else {
        uncachedIds.push(id);
      }
    });

    // Fetch uncached counts
    if (uncachedIds.length > 0) {
      try {
        console.log("Fetching reaction counts for:", uncachedIds);
        
        const { data, error } = await supabase
          .from('thumbnail_reactions')
          .select('thumbnail_id')
          .eq('reaction_type', 'love')
          .in('thumbnail_id', uncachedIds);

        if (error) {
          console.error("Error in batchGetReactionCounts:", error);
          // Set 0 for all uncached IDs on error
          uncachedIds.forEach(id => {
            results.set(id, 0);
            const cacheKey = `reaction_count_${id}`;
            this.setCache(this.reactionCountsCache, cacheKey, 0);
          });
        } else if (data) {
          console.log("Reaction data received:", data);
          // Count reactions for each thumbnail
          const countMap = new Map<string, number>();
          data.forEach(item => {
            const id = item.thumbnail_id.toString();
            countMap.set(id, (countMap.get(id) || 0) + 1);
          });

          // Cache and add to results
          countMap.forEach((count, id) => {
            const cacheKey = `reaction_count_${id}`;
            this.setCache(this.reactionCountsCache, cacheKey, count);
            results.set(id, count);
          });

          // Set 0 for thumbnails with no reactions
          uncachedIds.forEach(id => {
            if (!results.has(id)) {
              results.set(id, 0);
              const cacheKey = `reaction_count_${id}`;
              this.setCache(this.reactionCountsCache, cacheKey, 0);
            }
          });
        } else {
          console.log("No reaction data returned");
          // No data returned, set 0 for all
          uncachedIds.forEach(id => {
            results.set(id, 0);
            const cacheKey = `reaction_count_${id}`;
            this.setCache(this.reactionCountsCache, cacheKey, 0);
          });
        }
      } catch (error) {
        console.error("Error in batchGetReactionCounts:", error);
        // Set 0 for all uncached IDs on error
        uncachedIds.forEach(id => {
          results.set(id, 0);
          const cacheKey = `reaction_count_${id}`;
          this.setCache(this.reactionCountsCache, cacheKey, 0);
        });
      }
    }

    return results;
  }

  invalidateUserCache(userId: string): void {
    const cacheKey = `user_reactions_${userId}`;
    this.userReactionsCache.delete(cacheKey);
  }

  invalidateThumbnailCache(thumbnailId: string): void {
    const cacheKey = `reaction_count_${thumbnailId}`;
    this.reactionCountsCache.delete(cacheKey);
  }

  clearAllCache(): void {
    this.userReactionsCache.clear();
    this.reactionCountsCache.clear();
  }
}

export const reactionCache = new ReactionCache(); 