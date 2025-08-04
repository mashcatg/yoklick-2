// User data cache to prevent excessive API calls
class UserDataCache {
  private cache = new Map<string, { data: any, timestamp: number }>();
  private CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  private pendingRequests = new Map<string, Promise<any>>();

  async getUserData(userId: string): Promise<any> {
    const cacheKey = `user_${userId}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    // Check if request is already in progress
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    // Create new request
    const requestPromise = this.fetchUserData(userId);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const data = await requestPromise;
      
      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } finally {
      // Remove from pending requests
      this.pendingRequests.delete(cacheKey);
    }
  }

  private async fetchUserData(userId: string): Promise<any> {
    try {
      const response = await fetch("/api/users/get-user-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userIds: [userId] }),
      });

      if (response.ok) {
        const { users } = await response.json();
        if (users && users.length > 0) {
          return users[0];
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
    
    return null;
  }

  // Batch fetch multiple users
  async batchGetUserData(userIds: string[]): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    const uncachedIds: string[] = [];

    // Check cache first
    userIds.forEach(userId => {
      const cacheKey = `user_${userId}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        results.set(userId, cached.data);
      } else {
        uncachedIds.push(userId);
      }
    });

    // Fetch uncached users in batch
    if (uncachedIds.length > 0) {
      try {
        const response = await fetch("/api/users/get-user-data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userIds: uncachedIds }),
        });

        if (response.ok) {
          const { users } = await response.json();
          
          users.forEach((user: any) => {
            results.set(user.id, user);
            
            // Cache the result
            this.cache.set(`user_${user.id}`, {
              data: user,
              timestamp: Date.now()
            });
          });
        }
      } catch (error) {
        console.error("Error batch fetching user data:", error);
      }
    }

    return results;
  }

  // Clear cache for a specific user
  clearUserCache(userId: string) {
    this.cache.delete(`user_${userId}`);
  }

  // Clear all cache
  clearAllCache() {
    this.cache.clear();
  }

  // Get cache status
  getCacheStatus() {
    return {
      cachedUsers: this.cache.size,
      pendingRequests: this.pendingRequests.size
    };
  }
}

export const userDataCache = new UserDataCache(); 