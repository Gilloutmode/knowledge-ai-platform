/**
 * Cache Service
 * In-memory cache with TTL support
 * Can be replaced with Redis in production
 */

import { logger } from './logger';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class CacheService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    logger.info('Cache service initialized');
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set a value in cache with TTL (in seconds)
   */
  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Delete all keys matching a pattern (prefix)
   */
  deletePattern(prefix: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  /**
   * Get cache stats
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let expired = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        expired++;
      }
    }
    if (expired > 0) {
      logger.debug({ expired }, 'Cache cleanup completed');
    }
  }

  /**
   * Shutdown cache service
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
    logger.info('Cache service shut down');
  }
}

// Singleton instance
export const cache = new CacheService();

/**
 * Cache key generators for consistent key naming
 */
export const cacheKeys = {
  channels: {
    list: () => 'channels:list',
    detail: (id: string) => `channels:${id}`,
    videos: (id: string) => `channels:${id}:videos`,
  },
  videos: {
    list: () => 'videos:list',
    detail: (id: string) => `videos:${id}`,
    analyses: (id: string) => `videos:${id}:analyses`,
  },
  analyses: {
    list: () => 'analyses:list',
    detail: (id: string) => `analyses:${id}`,
    byVideo: (videoId: string) => `analyses:video:${videoId}`,
  },
};

/**
 * Cache TTL values (in seconds)
 */
export const cacheTTL = {
  short: 60, // 1 minute
  medium: 300, // 5 minutes
  long: 900, // 15 minutes
  hour: 3600, // 1 hour
};

export default cache;
