import { supabase } from './supabaseClient';

interface CachedUser {
  user: any;
  timestamp: number;
  expiresAt: number;
}

class UserCache {
  private cache = new Map<string, CachedUser>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 10;
  private isInitialized = false;
  private initializationPromise: Promise<any> | null = null;

  constructor() {
    // Initialize cache on first use
    this.initializeCache();
  }

  private async initializeCache() {
    if (this.isInitialized) return;
    
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.loadUserFromSession();
    await this.initializationPromise;
    this.isInitialized = true;
  }

  private async loadUserFromSession() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (user && !error) {
        this.setUser(user);
      }
    } catch (error) {
      // Silent error handling for production
    }
  }

  private setUser(user: any) {
    const cacheKey = 'current_user';
    const now = Date.now();
    
    this.cache.set(cacheKey, {
      user,
      timestamp: now,
      expiresAt: now + this.CACHE_DURATION
    });

    // Clean up old entries if cache is too large
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      this.cache.delete(entries[0][0]);
    }
  }

  private isExpired(cachedUser: CachedUser): boolean {
    return Date.now() > cachedUser.expiresAt;
  }

  async getUser(forceRefresh = false): Promise<any> {
    await this.initializeCache();

    const cacheKey = 'current_user';
    const cached = this.cache.get(cacheKey);

    // Return cached user if valid and not forcing refresh
    if (cached && !this.isExpired(cached) && !forceRefresh) {
      return cached.user;
    }

    // Fetch fresh user data
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        // Clear cache on auth errors
        this.invalidateCache();
        return null;
      }

      if (user) {
        this.setUser(user);
        return user;
      } else {
        // Clear cache when no user found
        this.invalidateCache();
        return null;
      }
    } catch (error) {
      // Clear cache on any error
      this.invalidateCache();
      return null;
    }
  }

  async getUserWithFallback(): Promise<any> {
    try {
      const user = await this.getUser();
      
      if (user) {
        return user;
      }

      // Try to get from session as fallback
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          this.setUser(session.user);
          return session.user;
        }
      } catch (error) {
        // Clear cache on session errors
        this.invalidateCache();
      }

      return null;
    } catch (error) {
      // Clear cache on any error
      this.invalidateCache();
      return null;
    }
  }

  invalidateCache() {
    this.cache.clear();
  }

  // Listen for auth state changes
  setupAuthListener() {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        this.setUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        this.invalidateCache();
        // Clear any stored session data
        if (typeof window !== 'undefined') {
          localStorage.removeItem('sb-access-token');
          sessionStorage.clear();
        }
      } else if (event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          this.setUser(session.user);
        }
      }
    });
  }

  // Get user without any API calls (from cache only)
  getCachedUser(): any {
    const cacheKey = 'current_user';
    const cached = this.cache.get(cacheKey);
    
    if (cached && !this.isExpired(cached)) {
      return cached.user;
    }
    
    return null;
  }

  // Check if user is cached and valid
  isUserCached(): boolean {
    const cacheKey = 'current_user';
    const cached = this.cache.get(cacheKey);
    return cached !== undefined && !this.isExpired(cached);
  }

  // Safe logout method
  async logout() {
    try {
      this.invalidateCache();
      
      // Clear any stored session data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sb-access-token');
        sessionStorage.clear();
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error during logout:', error);
      }
    } catch (error) {
      console.error('Error in logout:', error);
      // Even if there's an error, clear the cache
      this.invalidateCache();
    }
  }
}

// Create singleton instance
export const userCache = new UserCache();

// Setup auth listener on module load
if (typeof window !== 'undefined') {
  userCache.setupAuthListener();
}

// Export utility functions
export const getUser = () => userCache.getUser();
export const getUserWithFallback = () => userCache.getUserWithFallback();
export const getCachedUser = () => userCache.getCachedUser();
export const isUserCached = () => userCache.isUserCached();
export const invalidateUserCache = () => userCache.invalidateCache();
export const logoutUser = () => userCache.logout(); 