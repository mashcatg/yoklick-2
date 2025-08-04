import { supabase } from "@/app/lib/supabaseClient";
import { performanceMonitor } from "./performanceMonitor";
import { requestLimiter } from "./requestLimiter";

// In-memory cache for user reactions
const reactionCache = new Map<string, { reactions: any[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache for reaction counts
const reactionCountCache = new Map<string, { count: number, timestamp: number }>();
const COUNT_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

export class ReactionCache {
  // Get user's reactions with caching
  static async getUserReactions(userId: string, forceRefresh = false): Promise<any[]> {
    const cacheKey = `user_reactions_${userId}`;
    const cached = reactionCache.get(cacheKey);
    
    // Return cached data if still valid
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      performanceMonitor.recordCacheHit();
      return cached.reactions;
    }
    
    performanceMonitor.recordCacheMiss();
    const stopTimer = performanceMonitor.startTimer('getUserReactions');
    
    try {
      // Use request limiter to prevent excessive calls
      const data = await requestLimiter.executeRequest(
        `getUserReactions_${userId}`,
        async () => {
          const { data, error } = await supabase
            .from("thumbnail_reactions")
            .select("thumbnail_id, reaction_type, created_at")
            .eq("user_id", userId)
            .eq("reaction_type", "love");
          
          if (error) {
            console.error("Error fetching user reactions:", error);
            return cached?.reactions || [];
          }
          
          // Ensure thumbnail_id is properly handled as number
          const processedData = (data || []).map(reaction => ({
            ...reaction,
            thumbnail_id: Number(reaction.thumbnail_id) // Ensure it's a number
          }));
          
          console.log('🔍 User reactions fetched:', {
            userId,
            rawData: data,
            processedData,
            count: processedData.length
          });
          
          return processedData;
        }
      );
      
      // Update cache
      reactionCache.set(cacheKey, {
        reactions: data,
        timestamp: Date.now()
      });
      
      stopTimer();
      return data;
    } catch (error) {
      console.error("Error in getUserReactions:", error);
      stopTimer();
      return cached?.reactions || [];
    }
  }
  
  // Get reaction count with caching
  static async getReactionCount(thumbnailId: string, forceRefresh = false): Promise<number> {
    const cacheKey = `reaction_count_${thumbnailId}`;
    const cached = reactionCountCache.get(cacheKey);
    
    // Return cached data if still valid
    if (!forceRefresh && cached && Date.now() - cached.timestamp < COUNT_CACHE_DURATION) {
      performanceMonitor.recordCacheHit();
      return cached.count;
    }
    
    performanceMonitor.recordCacheMiss();
    const stopTimer = performanceMonitor.startTimer('getReactionCount');
    
    try {
      // Use request limiter to prevent excessive calls
      const count = await requestLimiter.executeRequest(
        `getReactionCount_${thumbnailId}`,
        async () => {
          const { data, error } = await supabase
            .from("thumbnail_reactions")
            .select("id", { count: "exact" })
            .eq("thumbnail_id", parseInt(thumbnailId)) // Ensure it's parsed as integer
            .eq("reaction_type", "love");
          
          if (error) {
            console.error("Error fetching reaction count:", error);
            return cached?.count || 0;
          }
          
          return data?.length || 0;
        }
      );
      
      // Update cache
      reactionCountCache.set(cacheKey, {
        count,
        timestamp: Date.now()
      });
      
      stopTimer();
      return count;
    } catch (error) {
      console.error("Error in getReactionCount:", error);
      stopTimer();
      return cached?.count || 0;
    }
  }
  
  // Check if user has reacted to a specific thumbnail
  static async hasUserReacted(userId: string, thumbnailId: string, forceRefresh = false): Promise<boolean> {
    const userReactions = await this.getUserReactions(userId, forceRefresh);
    // Convert thumbnail_id to string for comparison
    return userReactions.some(reaction => reaction.thumbnail_id.toString() === thumbnailId);
  }
  
  // Batch check multiple thumbnails for user reactions
  static async batchCheckUserReactions(userId: string, thumbnailIds: string[], forceRefresh = false): Promise<Set<string>> {
    const userReactions = await this.getUserReactions(userId, forceRefresh);
    const reactedIds = new Set<string>();
    
    // Ensure all thumbnailIds are strings for consistent comparison
    const thumbnailIdsAsStrings = thumbnailIds.map(id => id.toString());
    
    console.log('🔍 Batch checking user reactions:', {
      userId,
      thumbnailIds,
      thumbnailIdsAsStrings,
      userReactions,
      userReactionsLength: userReactions.length
    });
    
    userReactions.forEach(reaction => {
      // Convert thumbnail_id to string for comparison
      const reactionThumbnailId = reaction.thumbnail_id.toString();
      console.log('🔍 Checking reaction:', {
        reactionThumbnailId,
        thumbnailIdsAsStrings,
        includes: thumbnailIdsAsStrings.includes(reactionThumbnailId),
        thumbnailIdsType: typeof thumbnailIdsAsStrings[0],
        reactionThumbnailIdType: typeof reactionThumbnailId
      });
      
      if (thumbnailIdsAsStrings.includes(reactionThumbnailId)) {
        reactedIds.add(reactionThumbnailId);
        console.log('✅ Found user reaction for thumbnail:', reactionThumbnailId);
      }
    });
    
    console.log('🔍 Final reacted IDs:', Array.from(reactedIds));
    return reactedIds;
  }
  
  // Batch get reaction counts for multiple thumbnails
  static async batchGetReactionCounts(thumbnailIds: string[], forceRefresh = false): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    
    // Check cache first
    const uncachedIds: string[] = [];
    thumbnailIds.forEach(id => {
      const cacheKey = `reaction_count_${id}`;
      const cached = reactionCountCache.get(cacheKey);
      
      if (!forceRefresh && cached && Date.now() - cached.timestamp < COUNT_CACHE_DURATION) {
        counts.set(id, cached.count);
      } else {
        uncachedIds.push(id);
      }
    });
    
    // Fetch uncached counts in batch
    if (uncachedIds.length > 0) {
      try {
        const data = await requestLimiter.executeRequest(
          `batchGetReactionCounts_${uncachedIds.join('_')}`,
          async () => {
            const { data, error } = await supabase
              .from("thumbnail_reactions")
              .select("thumbnail_id")
              .in("thumbnail_id", uncachedIds.map(id => parseInt(id))) // Ensure all IDs are parsed as integers
              .eq("reaction_type", "love");
            
            if (error) {
              console.error("Error in batchGetReactionCounts:", error);
              return [];
            }
            
            return data || [];
          }
        );
        
        // Count reactions per thumbnail
        const countMap = new Map<string, number>();
        data.forEach((reaction: any) => {
          // Ensure thumbnail_id is properly converted to string
          const id = reaction.thumbnail_id.toString();
          countMap.set(id, (countMap.get(id) || 0) + 1);
        });
        
        console.log('🔍 Batch reaction data processing:', {
          rawData: data,
          processedCounts: Object.fromEntries(countMap),
          uncachedIds
        });
        
        // Update cache and results
        uncachedIds.forEach(id => {
          const count = countMap.get(id) || 0;
          counts.set(id, count);
          
          // Update cache
          reactionCountCache.set(`reaction_count_${id}`, {
            count,
            timestamp: Date.now()
          });
        });
      } catch (error) {
        console.error("Error in batchGetReactionCounts:", error);
      }
    }
    
    return counts;
  }
  
  // Clear cache for a specific user
  static clearUserCache(userId: string) {
    reactionCache.delete(`user_reactions_${userId}`);
  }
  
  // Clear cache for a specific thumbnail
  static clearThumbnailCache(thumbnailId: string) {
    reactionCountCache.delete(`reaction_count_${thumbnailId}`);
  }
  
  // Clear all cache
  static clearAllCache() {
    reactionCache.clear();
    reactionCountCache.clear();
  }
  
  // Invalidate cache when user reacts/unreacts - FIXED VERSION
  static invalidateUserReactions(userId: string, thumbnailId: string) {
    // Clear user's reaction cache to force fresh fetch
    this.clearUserCache(userId);
    
    // Clear thumbnail's count cache to force fresh fetch
    this.clearThumbnailCache(thumbnailId);
    
    // Also clear any batch caches that might contain this data
    const cacheKeysToDelete: string[] = [];
    reactionCache.forEach((_, key) => {
      if (key.includes(`user_reactions_${userId}`)) {
        cacheKeysToDelete.push(key);
      }
    });
    
    reactionCountCache.forEach((_, key) => {
      if (key.includes(`reaction_count_${thumbnailId}`)) {
        cacheKeysToDelete.push(key);
      }
    });
    
    cacheKeysToDelete.forEach(key => {
      if (key.startsWith('user_reactions_')) {
        reactionCache.delete(key);
      } else if (key.startsWith('reaction_count_')) {
        reactionCountCache.delete(key);
      }
    });
  }
} 