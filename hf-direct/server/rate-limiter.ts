import type { ApiKey } from "@shared/schema";

interface RateLimitWindow {
  requests: number[];
  resetTime: number;
}

export class RateLimiter {
  private windows = new Map<string, RateLimitWindow>();
  private readonly windowMs = 60 * 60 * 1000; // 1 hour in milliseconds

  constructor() {
    // Clean up old windows every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  check(apiKey: ApiKey): {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    let window = this.windows.get(apiKey.id);
    
    // Initialize or reset window if needed
    if (!window || now >= window.resetTime) {
      window = {
        requests: [],
        resetTime: now + this.windowMs,
      };
      this.windows.set(apiKey.id, window);
    }

    // Remove requests outside the sliding window
    window.requests = window.requests.filter(timestamp => timestamp > windowStart);

    const currentCount = window.requests.length;
    const remaining = Math.max(0, apiKey.rateLimit - currentCount);
    const allowed = currentCount < apiKey.rateLimit;

    if (allowed) {
      window.requests.push(now);
    }

    return {
      allowed,
      limit: apiKey.rateLimit,
      remaining: allowed ? remaining - 1 : 0,
      resetTime: window.resetTime,
    };
  }

  private cleanup() {
    const now = Date.now();
    const entries = Array.from(this.windows.entries());
    for (const [key, window] of entries) {
      if (now >= window.resetTime && window.requests.length === 0) {
        this.windows.delete(key);
      }
    }
  }
}

export const rateLimiter = new RateLimiter();
