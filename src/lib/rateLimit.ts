import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  burstLimit?: number;
  cooldownMs?: number;
}

const rateLimitConfigs: Record<string, RateLimitConfig> = {
  // Authentication endpoints - Very strict
  'auth': { 
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, 
    message: 'Too many authentication attempts. Please try again later.',
    burstLimit: 3,
    cooldownMs: 30 * 60 * 1000 // 30 minutes cooldown
  },
  
  // Sign up/Sign in - Extra strict
  'signup': { 
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, 
    message: 'Too many signup attempts. Please try again later.',
    burstLimit: 2,
    cooldownMs: 60 * 60 * 1000 // 1 hour cooldown
  },
  
  'signin': { 
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, 
    message: 'Too many signin attempts. Please try again later.',
    burstLimit: 3,
    cooldownMs: 30 * 60 * 1000 // 30 minutes cooldown
  },
  
  // Password reset - Very strict
  'password_reset': { 
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, 
    message: 'Too many password reset attempts. Please try again later.',
    burstLimit: 2,
    cooldownMs: 60 * 60 * 1000 // 1 hour cooldown
  },
  
  // Generation endpoints - Expensive operations
  'generate': { 
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, 
    message: 'Too many generation requests. Please wait before generating more.',
    burstLimit: 5,
    cooldownMs: 5 * 60 * 1000 // 5 minutes cooldown
  },
  
  // Regenerate - Similar to generate
  'regenerate': { 
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 8, 
    message: 'Too many regeneration requests. Please wait before regenerating more.',
    burstLimit: 4,
    cooldownMs: 5 * 60 * 1000 // 5 minutes cooldown
  },
  
  // Payment endpoints - Sensitive
  'payment': { 
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, 
    message: 'Too many payment requests. Please try again later.',
    burstLimit: 10,
    cooldownMs: 10 * 60 * 1000 // 10 minutes cooldown
  },
  
  // Subscription management
  'subscription': { 
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 15, 
    message: 'Too many subscription requests. Please try again later.',
    burstLimit: 8,
    cooldownMs: 5 * 60 * 1000 // 5 minutes cooldown
  },
  
  // Admin endpoints - Moderate
  'admin': { 
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, 
    message: 'Too many admin requests. Please try again later.',
    burstLimit: 15,
    cooldownMs: 2 * 60 * 1000 // 2 minutes cooldown
  },
  
  // User data endpoints
  'user_data': { 
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50, 
    message: 'Too many user data requests. Please try again later.',
    burstLimit: 25,
    cooldownMs: 1 * 60 * 1000 // 1 minute cooldown
  },
  
  // Search endpoints
  'search': { 
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50, 
    message: 'Too many search requests. Please try again later.',
    burstLimit: 25,
    cooldownMs: 1 * 60 * 1000 // 1 minute cooldown
  },
  
  // Track user behavior - Analytics
  'track_behavior': { 
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, 
    message: 'Too many tracking requests.',
    burstLimit: 50,
    cooldownMs: 30 * 1000 // 30 seconds cooldown
  },
  
  // Webhook endpoints
  'webhook': { 
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50, 
    message: 'Too many webhook requests.',
    burstLimit: 25,
    cooldownMs: 1 * 60 * 1000 // 1 minute cooldown
  },
  
  // Cron jobs
  'cron': { 
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, 
    message: 'Too many cron job requests.',
    burstLimit: 5,
    cooldownMs: 5 * 60 * 1000 // 5 minutes cooldown
  },
  
  // General API endpoints
  'api': { 
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, 
    message: 'Too many requests from this IP.',
    burstLimit: 50,
    cooldownMs: 1 * 60 * 1000 // 1 minute cooldown
  },
  
  // Default
  'default': { 
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, 
    message: 'Too many requests.',
    burstLimit: 50,
    cooldownMs: 1 * 60 * 1000 // 1 minute cooldown
  }
};

// Enhanced in-memory store for rate limiting
interface RateLimitEntry {
  count: number;
  resetTime: number;
  burstCount: number;
  lastRequestTime: number;
  cooldownUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Enhanced IP detection
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    // Handle multiple IPs in x-forwarded-for
    const ips = forwarded.split(',').map(ip => ip.trim());
    return ips[0] || 'unknown';
  }
  
  return cfConnectingIP || realIP || 'unknown';
}

// Enhanced rate limiting with burst protection and cooldown
export function rateLimit(req: NextRequest, type: string = 'default'): { allowed: boolean; response?: NextResponse } {
  const config = rateLimitConfigs[type] || rateLimitConfigs['default'];
  const clientIP = getClientIP(req);
  
  const key = `${type}:${clientIP}`;
  const now = Date.now();
  
  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetTime) {
    entry = { 
      count: 0, 
      resetTime: now + config.windowMs,
      burstCount: 0,
      lastRequestTime: now
    };
    rateLimitStore.set(key, entry);
  }
  
  // Check cooldown period
  if (entry.cooldownUntil && now < entry.cooldownUntil) {
    const remainingCooldown = Math.ceil((entry.cooldownUntil - now) / 1000);
    const response = NextResponse.json(
      { 
        error: config.message || 'Rate limit exceeded',
        cooldownRemaining: remainingCooldown
      },
      { status: 429 }
    );
    
    response.headers.set('Retry-After', remainingCooldown.toString());
    return { allowed: false, response };
  }
  
  // Check burst limit
  const timeSinceLastRequest = now - entry.lastRequestTime;
  if (timeSinceLastRequest < 1000) { // Within 1 second
    entry.burstCount++;
    if (entry.burstCount > (config.burstLimit || config.maxRequests)) {
      // Trigger cooldown for burst violations
      entry.cooldownUntil = now + (config.cooldownMs || 60 * 1000);
      rateLimitStore.set(key, entry);
      
      const response = NextResponse.json(
        { 
          error: 'Too many rapid requests. Please slow down.',
          cooldownRemaining: Math.ceil((config.cooldownMs || 60 * 1000) / 1000)
        },
        { status: 429 }
      );
      
      response.headers.set('Retry-After', Math.ceil((config.cooldownMs || 60 * 1000) / 1000).toString());
      return { allowed: false, response };
    }
  } else {
    // Reset burst count if enough time has passed
    entry.burstCount = 1;
  }
  
  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    // Trigger cooldown
    entry.cooldownUntil = now + (config.cooldownMs || 60 * 1000);
    rateLimitStore.set(key, entry);
    
    const response = NextResponse.json(
      { 
        error: config.message || 'Rate limit exceeded',
        cooldownRemaining: Math.ceil((config.cooldownMs || 60 * 1000) / 1000)
      },
      { status: 429 }
    );
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', '0');
    response.headers.set('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());
    response.headers.set('Retry-After', Math.ceil((config.cooldownMs || 60 * 1000) / 1000).toString());
    
    return { allowed: false, response };
  }
  
  // Increment counter and update timestamps
  entry.count++;
  entry.lastRequestTime = now;
  rateLimitStore.set(key, entry);
  
  return { allowed: true };
}

export function getRateLimitHeaders(clientIP: string, type: string = 'default'): Record<string, string> {
  const config = rateLimitConfigs[type] || rateLimitConfigs['default'];
  const key = `${type}:${clientIP}`;
  const entry = rateLimitStore.get(key);
  
  if (!entry) {
    return {
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': config.maxRequests.toString(),
      'X-RateLimit-Reset': new Date(Date.now() + config.windowMs).toISOString(),
      'X-RateLimit-BurstLimit': (config.burstLimit || config.maxRequests).toString()
    };
  }
  
  return {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': Math.max(0, config.maxRequests - entry.count).toString(),
    'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
    'X-RateLimit-BurstLimit': (config.burstLimit || config.maxRequests).toString()
  };
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime && (!entry.cooldownUntil || now > entry.cooldownUntil)) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

// Export configs for use in other files
export { rateLimitConfigs }; 