import { APIError } from "encore.dev/api";

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private userLimits = new Map<string, RateLimitInfo>();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  checkRateLimit(userId: string): void {
    const now = Date.now();
    const userInfo = this.userLimits.get(userId);

    if (!userInfo || now > userInfo.resetTime) {
      // First request or window has expired, reset
      this.userLimits.set(userId, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return;
    }

    if (userInfo.count >= this.maxRequests) {
      const remainingTime = Math.ceil((userInfo.resetTime - now) / 1000);
      throw APIError.resourceExhausted(
        `Rate limit exceeded. You can create ${this.maxRequests} comments per minute. Try again in ${remainingTime} seconds.`
      );
    }

    userInfo.count++;
    this.userLimits.set(userId, userInfo);
  }

  // Clean up expired entries periodically to prevent memory leaks
  cleanup(): void {
    const now = Date.now();
    const usersToDelete: string[] = [];
    
    this.userLimits.forEach((info, userId) => {
      if (now > info.resetTime) {
        usersToDelete.push(userId);
      }
    });
    
    usersToDelete.forEach(userId => {
      this.userLimits.delete(userId);
    });
  }
}

// Create rate limiter instance: 10 requests per 60 seconds (1 minute)
export const commentRateLimiter = new RateLimiter(10, 60 * 1000);

// Clean up expired entries every 5 minutes
setInterval(() => {
  commentRateLimiter.cleanup();
}, 5 * 60 * 1000);