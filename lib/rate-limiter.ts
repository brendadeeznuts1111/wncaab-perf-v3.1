/**
 * Rate Limiter - In-Memory Sliding Window Implementation
 * 
 * Implements rate limiting using a sliding window algorithm with per-IP tracking.
 * Uses Map for O(1) lookups and automatic cleanup of expired entries.
 * 
 * @module lib/rate-limiter
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: number | null = null;
  
  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000, // 1 minute default
    private cleanupIntervalMs: number = 300000 // 5 minutes default
  ) {
    // Start cleanup interval to prevent memory leaks
    this.startCleanup();
  }
  
  /**
   * Check if request should be rate limited
   * 
   * @param identifier - Unique identifier (IP address, user ID, etc.)
   * @returns Object with allowed status and remaining requests
   */
  check(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.store.get(identifier);
    
    if (!entry || now > entry.resetAt) {
      // Create new entry or reset expired entry
      const resetAt = now + this.windowMs;
      this.store.set(identifier, {
        count: 1,
        resetAt,
      });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt,
      };
    }
    
    // Increment count
    entry.count++;
    
    if (entry.count > this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }
    
    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }
  
  /**
   * Clean up expired entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [identifier, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(identifier);
      }
    }
  }
  
  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    if (this.cleanupInterval !== null) {
      return; // Already started
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.cleanupIntervalMs) as unknown as number;
  }
  
  /**
   * Stop cleanup interval (for testing or shutdown)
   */
  stop(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
  
  /**
   * Get current store size (for monitoring)
   */
  getSize(): number {
    return this.store.size;
  }
  
  /**
   * Clear all entries (for testing)
   */
  clear(): void {
    this.store.clear();
  }
}

// Singleton instances for different rate limit configurations
const dashboardRateLimiter = new RateLimiter(
  parseInt(process.env.DASHBOARD_RATE_LIMIT || '60', 10), // 60 requests per minute default
  60000, // 1 minute window
  300000 // Cleanup every 5 minutes
);

const apiRateLimiter = new RateLimiter(
  parseInt(process.env.API_RATE_LIMIT || '1000', 10), // 1000 requests per minute default
  60000, // 1 minute window
  300000 // Cleanup every 5 minutes
);

/**
 * Rate limit middleware for dashboard endpoint
 * 
 * @param req - Request object
 * @param server - Server object for IP extraction
 * @returns Rate limit check result or null if not rate limited
 */
export function checkDashboardRateLimit(req: Request, server: any): { allowed: boolean; remaining: number; resetAt: number } | null {
  const clientIP = server?.requestIP?.(req);
  const identifier = clientIP?.address || 'unknown';
  
  return dashboardRateLimiter.check(identifier);
}

/**
 * Rate limit middleware for API endpoints
 * 
 * @param req - Request object
 * @param server - Server object for IP extraction
 * @returns Rate limit check result or null if not rate limited
 */
export function checkApiRateLimit(req: Request, server: any): { allowed: boolean; remaining: number; resetAt: number } | null {
  const clientIP = server?.requestIP?.(req);
  const identifier = clientIP?.address || 'unknown';
  
  return apiRateLimiter.check(identifier);
}

/**
 * Per-worker snapshot rate limiter
 * TES-SEC: Max 1 snapshot request per worker per 10 seconds
 */
const workerSnapshotRateLimiter = new RateLimiter(1, 10000); // 1 request per 10 seconds

/**
 * Check rate limit for worker snapshot requests
 * TES-SEC: Prevents abuse of snapshot generation
 * 
 * @param workerId - Worker ID to check rate limit for
 * @returns Rate limit result
 */
export function checkWorkerSnapshotRateLimit(workerId: string): { allowed: boolean; remaining: number; resetAt: number } {
  return workerSnapshotRateLimiter.check(`worker-snapshot:${workerId}`);
}

/**
 * Create rate-limited handler wrapper
 * 
 * @param handler - Original handler function
 * @param rateLimiter - Rate limiter function
 * @returns Wrapped handler with rate limiting
 */
export function withRateLimit<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  rateLimiterFn: (req: Request, server: any) => { allowed: boolean; remaining: number; resetAt: number } | null
): T {
  return (async (req: Request, server: any) => {
    const rateLimitResult = rateLimiterFn(req, server);
    
    if (rateLimitResult && !rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimitResult.resetAt),
          },
        }
      );
    }
    
    const response = await handler(req, server);
    
    // Add rate limit headers to response
    if (rateLimitResult) {
      const headers = new Headers(response.headers);
      headers.set('X-RateLimit-Limit', '60');
      headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
      headers.set('X-RateLimit-Reset', String(rateLimitResult.resetAt));
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }
    
    return response;
  }) as T;
}

export { dashboardRateLimiter, apiRateLimiter };

