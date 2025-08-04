import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: NextRequest) => string;
  handler?: (req: NextRequest) => NextResponse;
  onLimitReached?: (req: NextRequest) => void;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: this.defaultKeyGenerator,
      handler: this.defaultHandler,
      ...config
    };
  }

  private defaultKeyGenerator(req: NextRequest): string {
    // Use IP address as default key
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               req.headers.get('cf-connecting-ip') ||
               'unknown';
    return `rate_limit:${ip}`;
  }

  private defaultHandler(req: NextRequest): NextResponse {
    return NextResponse.json(
      { error: 'Too many requests', message: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime <= now) {
        delete this.store[key];
      }
    });
  }

  check(req: NextRequest): { allowed: boolean; remaining: number; resetTime: number } {
    this.cleanup();

    const key = this.config.keyGenerator!(req);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    if (!this.store[key] || this.store[key].resetTime <= now) {
      this.store[key] = {
        count: 1,
        resetTime: now + this.config.windowMs
      };
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: this.store[key].resetTime
      };
    }

    if (this.store[key].count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: this.store[key].resetTime
      };
    }

    this.store[key].count++;
    return {
      allowed: true,
      remaining: this.config.maxRequests - this.store[key].count,
      resetTime: this.store[key].resetTime
    };
  }

  handle(req: NextRequest): { allowed: boolean; response?: NextResponse } {
    const result = this.check(req);

    if (!result.allowed) {
      if (this.config.onLimitReached) {
        this.config.onLimitReached(req);
      }
      return {
        allowed: false,
        response: this.config.handler!(req)
      };
    }

    return { allowed: true };
  }
}

// Pre-configured rate limiters for different use cases
export const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  keyGenerator: (req) => {
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               req.headers.get('cf-connecting-ip') ||
               'unknown';
    const userAgent = req.headers.get('user-agent') || '';
    return `api:${ip}:${userAgent.slice(0, 50)}`;
  }
});

export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  keyGenerator: (req) => {
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               req.headers.get('cf-connecting-ip') ||
               'unknown';
    return `auth:${ip}`;
  },
  handler: (req) => {
    return NextResponse.json(
      { error: 'Too many authentication attempts', message: 'Please try again later' },
      { status: 429 }
    );
  }
});

export const generateRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  keyGenerator: (req) => {
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               req.headers.get('cf-connecting-ip') ||
               'unknown';
    return `generate:${ip}`;
  },
  handler: (req) => {
    return NextResponse.json(
      { error: 'Generation rate limit exceeded', message: 'Please wait before generating more thumbnails' },
      { status: 429 }
    );
  }
});

export const uploadRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5,
  keyGenerator: (req) => {
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               req.headers.get('cf-connecting-ip') ||
               'unknown';
    return `upload:${ip}`;
  },
  handler: (req) => {
    return NextResponse.json(
      { error: 'Upload rate limit exceeded', message: 'Please wait before uploading more files' },
      { status: 429 }
    );
  }
});

export const searchRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 50,
  keyGenerator: (req) => {
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               req.headers.get('cf-connecting-ip') ||
               'unknown';
    return `search:${ip}`;
  }
});

// Utility function for API routes
export function rateLimit(req: NextRequest, type: 'api' | 'auth' | 'generate' | 'upload' | 'search' | 'cron' | 'webhook') {
  let limiter: RateLimiter;

  switch (type) {
    case 'auth':
      limiter = authRateLimiter;
      break;
    case 'generate':
      limiter = generateRateLimiter;
      break;
    case 'upload':
      limiter = uploadRateLimiter;
      break;
    case 'search':
      limiter = searchRateLimiter;
      break;
    case 'cron':
      // No rate limiting for cron jobs
      return { allowed: true, response: undefined };
    case 'webhook':
      // No rate limiting for webhooks (they come from trusted sources)
      return { allowed: true, response: undefined };
    default:
      limiter = apiRateLimiter;
  }

  return limiter.handle(req);
}

// Generate rate limit headers for responses
export function getRateLimitHeaders(identifier: string, type: string): Record<string, string> {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute default
  const maxRequests = 100; // default max requests
  
  return {
    'X-RateLimit-Limit': maxRequests.toString(),
    'X-RateLimit-Remaining': '99', // Default remaining
    'X-RateLimit-Reset': Math.floor((now + windowMs) / 1000).toString(),
    'X-RateLimit-Type': type
  };
}

// Enhanced rate limiting with user-based limits
export class UserRateLimiter {
  private store: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(
    private windowMs: number = 60 * 1000,
    private maxRequests: number = 100
  ) {}

  check(userId: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const key = `user:${userId}`;
    const windowStart = now - this.windowMs;

    const current = this.store.get(key);
    if (!current || current.resetTime <= now) {
      this.store.set(key, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs
      };
    }

    if (current.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime
      };
    }

    current.count++;
    this.store.set(key, current);
    return {
      allowed: true,
      remaining: this.maxRequests - current.count,
      resetTime: current.resetTime
    };
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (value.resetTime <= now) {
        this.store.delete(key);
      }
    }
  }
}

// User-specific rate limiters
export const userGenerateLimiter = new UserRateLimiter(60 * 1000, 20); // 20 generations per minute
export const userUploadLimiter = new UserRateLimiter(60 * 1000, 10); // 10 uploads per minute
export const userSearchLimiter = new UserRateLimiter(60 * 1000, 100); // 100 searches per minute

// Utility for user-based rate limiting
export function userRateLimit(userId: string, type: 'generate' | 'upload' | 'search') {
  let limiter: UserRateLimiter;

  switch (type) {
    case 'generate':
      limiter = userGenerateLimiter;
      break;
    case 'upload':
      limiter = userUploadLimiter;
      break;
    case 'search':
      limiter = userSearchLimiter;
      break;
    default:
      return { allowed: true, remaining: 999, resetTime: Date.now() };
  }

  return limiter.check(userId);
} 