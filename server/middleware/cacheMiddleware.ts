/**
 * Cache Middleware for Hono
 * Provides response caching for API endpoints
 */

import { createMiddleware } from 'hono/factory';
import { cache, cacheTTL } from '../lib/cache';
import { logger } from '../lib/logger';

/**
 * Creates a cache middleware with configurable TTL
 * Only caches GET requests with 200 status
 */
export function createCacheMiddleware(ttlSeconds: number = cacheTTL.medium) {
  return createMiddleware(async (c, next) => {
    // Only cache GET requests
    if (c.req.method !== 'GET') {
      await next();
      return;
    }

    // Generate cache key from URL
    const cacheKey = `api:${c.req.url}`;

    // Check cache
    const cached = cache.get<{ body: string; contentType: string }>(cacheKey);
    if (cached) {
      logger.debug({ cacheKey }, 'Cache hit');
      c.res.headers.set('X-Cache', 'HIT');
      c.res.headers.set('Content-Type', cached.contentType);
      return c.body(cached.body);
    }

    // Cache miss - proceed with request
    await next();

    // Only cache successful responses
    if (c.res.status === 200) {
      const contentType = c.res.headers.get('Content-Type') || 'application/json';

      // Clone response body
      const clonedResponse = c.res.clone();
      const body = await clonedResponse.text();

      // Store in cache
      cache.set(cacheKey, { body, contentType }, ttlSeconds);
      logger.debug({ cacheKey, ttl: ttlSeconds }, 'Cache miss - stored');
      c.res.headers.set('X-Cache', 'MISS');
    }
  });
}

/**
 * Cache invalidation middleware
 * Clears relevant cache entries when data is modified
 */
export function invalidateCache(pattern: string) {
  return createMiddleware(async (c, next) => {
    await next();

    // Only invalidate on successful mutations
    if (c.res.status >= 200 && c.res.status < 300) {
      const deleted = cache.deletePattern(pattern);
      if (deleted > 0) {
        logger.debug({ pattern, deleted }, 'Cache invalidated');
      }
    }
  });
}

/**
 * Pre-defined cache middleware for common use cases
 */
export const apiCache = {
  // Short cache for frequently changing data
  short: createCacheMiddleware(cacheTTL.short),

  // Medium cache for semi-static data
  medium: createCacheMiddleware(cacheTTL.medium),

  // Long cache for mostly static data
  long: createCacheMiddleware(cacheTTL.long),

  // No cache (for mutations or real-time data)
  none: createMiddleware(async (c, next) => {
    await next();
    c.res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  }),
};

/**
 * Cache control headers for client-side caching
 */
export function setCacheHeaders(maxAge: number = 0, staleWhileRevalidate: number = 0) {
  return createMiddleware(async (c, next) => {
    await next();

    if (c.res.status === 200) {
      if (maxAge > 0) {
        const directive =
          staleWhileRevalidate > 0
            ? `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
            : `public, max-age=${maxAge}`;
        c.res.headers.set('Cache-Control', directive);
      } else {
        c.res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      }
    }
  });
}

export default apiCache;
