/**
 * Cache Plugin
 *
 * This plugin demonstrates how to extend the context with utility helpers
 * that provide caching functionality. It adds a `cache` object with methods:
 *   - get(key): retrieve a cached value by key
 *   - set(key, value, ttl?): store a value with optional TTL (time-to-live)
 *   - del(key): remove a cached value
 *   - clear(): remove all cached values
 *
 * CACHING STRATEGY:
 * This example uses an in-memory Map with TTL support. In a production
 * environment, you might replace the internal storage with Redis, Memcached,
 * or another distributed cache.
 */

import { plugin } from "@deessejs/server";
import type { AppContext } from "@/api";

/**
 * Entry in the cache store with optional expiration time.
 */
interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number | null; // Unix timestamp (ms), null = never expires
}

/**
 * In-memory cache store. Persists across requests within the same process.
 * For multi-instance deployments, use a distributed cache (Redis, etc.).
 */
const cacheStore = new Map<string, CacheEntry>();

/**
 * Default TTL for cached items (in milliseconds).
 * 60 seconds * 5 = 5 seconds for this example (intentionally short to demo expiration).
 */
const DEFAULT_TTL_MS = 60 * 1000;

/**
 * Cache plugin that adds caching helpers to the context.
 */
export const cachePlugin = plugin("cache", () => ({
  cache: {
    /**
     * Retrieve a cached value by key.
     *
     * @param key - The cache key to look up
     * @returns The cached value, or undefined if not found or expired
     *
     * @example
     * const users = ctx.cache.get("users:list");
     * if (users) {
     *   return ok(users);
     * }
     */
    get: <T = unknown>(key: string): T | undefined => {
      const entry = cacheStore.get(key);
      if (!entry) return undefined;

      // Check if entry has expired
      if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
        cacheStore.delete(key);
        return undefined;
      }

      return entry.value as T;
    },

    /**
     * Store a value in the cache.
     *
     * @param key - The cache key
     * @param value - The value to cache
     * @param ttl - Optional TTL in milliseconds (default: 5 seconds)
     *
     * @example
     * ctx.cache.set("users:list", users, 60 * 1000); // Cache for 60 seconds
     */
    set: <T = unknown>(key: string, value: T, ttl: number = DEFAULT_TTL_MS): void => {
      const expiresAt = ttl > 0 ? Date.now() + ttl : null;
      cacheStore.set(key, { value, expiresAt });
    },

    /**
     * Remove a specific key from the cache.
     *
     * @param key - The cache key to delete
     */
    del: (key: string): void => {
      cacheStore.delete(key);
    },

    /**
     * Clear all entries from the cache.
     * Useful for testing or manual cache invalidation.
     */
    clear: (): void => {
      cacheStore.clear();
    },
  },
}));
