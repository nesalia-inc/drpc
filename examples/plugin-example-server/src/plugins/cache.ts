/**
 * Cache Plugin
 *
 * Adds an in-memory cache helper to the context. Works identically in
 * server-only and HTTP modes - it has no dependency on request objects.
 *
 * The cache store is a module-level Map so it persists across multiple
 * procedure calls within the same process. In a production system you
 * would swap the internal store for Redis or another distributed cache.
 *
 * The plugin adds a `cache` object with:
 *   - get(key): retrieve a cached value (returns undefined if missing/expired)
 *   - set(key, value, ttl?): store a value with optional TTL in milliseconds
 *   - del(key): remove one entry
 *   - clear(): remove all entries
 */

import { plugin } from "@deessejs/server";
import type { AppContext } from "../api/index.js";

/**
 * Internal entry stored in the cache map.
 */
interface CacheEntry<T = unknown> {
  value: T;
  /** Unix timestamp (ms) at which this entry expires, or null for no expiry. */
  expiresAt: number | null;
}

/**
 * Module-level cache store. Shared across all API calls in the same process.
 *
 * Because this is server-side only code there is no concern about the store
 * leaking between browser tabs or clients - it simply lives in Node memory.
 */
const cacheStore = new Map<string, CacheEntry>();

/**
 * Default TTL applied when set() is called without an explicit ttl argument.
 * Intentionally short (60 s) so you can observe expiry in a demo session.
 */
const DEFAULT_TTL_MS = 60 * 1000;

/**
 * Cache plugin - attaches the cache helper object to every procedure context.
 */
export const cachePlugin = plugin("cache", () => ({
  cache: {
    /**
     * Retrieve a cached value.
     *
     * Returns undefined when the key does not exist or has expired.
     * Expired entries are lazily evicted on read.
     *
     * @example
     * const users = ctx.cache.get<User[]>("users:list");
     * if (users) return ok(users);
     */
    get: <T = unknown>(key: string): T | undefined => {
      const entry = cacheStore.get(key);
      if (!entry) return undefined;

      if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
        cacheStore.delete(key);
        return undefined;
      }

      return entry.value as T;
    },

    /**
     * Store a value in the cache.
     *
     * @param key   - Cache key
     * @param value - Value to store
     * @param ttl   - Time-to-live in milliseconds (default: 60 seconds)
     *
     * @example
     * ctx.cache.set("users:list", users, 10 * 1000); // 10-second TTL
     */
    set: <T = unknown>(key: string, value: T, ttl: number = DEFAULT_TTL_MS): void => {
      const expiresAt = ttl > 0 ? Date.now() + ttl : null;
      cacheStore.set(key, { value, expiresAt });
    },

    /**
     * Remove a single entry from the cache.
     * Call this after a write to invalidate stale cached reads.
     */
    del: (key: string): void => {
      cacheStore.delete(key);
    },

    /**
     * Remove every entry from the cache.
     * Useful in tests or when you want a clean slate.
     */
    clear: (): void => {
      cacheStore.clear();
    },
  },
}));
