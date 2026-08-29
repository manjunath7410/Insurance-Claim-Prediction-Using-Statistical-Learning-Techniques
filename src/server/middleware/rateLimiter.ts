import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/auditService';
import { logger } from '../logger';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export interface RateLimiterOptions {
  windowMs: number; // e.g. 60000 (1 minute)
  maxRequests: number; // e.g. 100 requests per window
  endpointCategory?: string;
  skipFailedRequests?: boolean;
}

/**
 * High-performance in-memory sliding window rate limiter
 * Protects against brute-force attacks and denial-of-service attempts
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, maxRequests, endpointCategory = 'general' } = options;
  const ipRecords = new Map<string, RateLimitRecord>();

  // Periodic cleanup of stale IP records every 5 minutes to prevent memory leaks
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipRecords.entries()) {
      if (now > record.resetTime) {
        ipRecords.delete(ip);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1';
    const now = Date.now();

    let record = ipRecords.get(clientIp);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      ipRecords.set(clientIp, record);
    } else {
      record.count++;
    }

    const remaining = Math.max(0, maxRequests - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    // Set standard rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    if (record.count > maxRequests) {
      logger.warn(`Rate limit exceeded for IP ${clientIp} on category '${endpointCategory}'`, {
        ip: clientIp,
        category: endpointCategory,
        url: req.originalUrl,
      });

      AuditService.logEvent({
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: 'RATE_LIMIT_EXCEEDED',
        resource: `${req.method} ${req.originalUrl}`,
        details: { category: endpointCategory, maxRequests, windowMs },
        ipAddress: clientIp,
        success: false,
        errorMessage: `Too many requests. Limit of ${maxRequests} requests per ${windowMs / 1000}s exceeded.`,
      });

      return res.status(429).json({
        error: 'TooManyRequests',
        message: `Too many requests for ${endpointCategory} operations. Please retry in ${resetSeconds} seconds.`,
        retryAfter: resetSeconds,
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };
}

// Pre-configured rate limiters for key application domains
export const authRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 15, // 15 login/register attempts per 5 minutes per IP
  endpointCategory: 'authentication',
});

export const predictionRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 120, // 120 predictions per minute per IP
  endpointCategory: 'ml_inference',
});

export const explainabilityRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 40, // 40 AI explanations / reports per minute per IP
  endpointCategory: 'gemini_ai',
});
