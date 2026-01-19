/**
 * Shared cache utilities for global caching patterns
 */

// Default cache TTL (5 minutes)
const DEFAULT_TTL_MS = 5 * 60 * 1000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Create a global cache with a specific name
 * Useful for caching data that should persist across component re-renders
 */
export function createGlobalCache<T>(cacheName: string): {
  get: () => T;
  set: (value: T) => void;
  has: () => boolean;
} {
  const globalKey = `__clarify${cacheName}Cache__` as keyof typeof globalThis;

  // Use a mutable global store
  type GlobalStore = { [key: string]: T };
  const getGlobal = (): GlobalStore => {
    if (typeof globalThis === "undefined") {
      throw new Error("Global cache can only be used in browser environment");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = globalThis as any;
    if (!g.__clarifyGlobalStore__) {
      g.__clarifyGlobalStore__ = {};
    }
    return g.__clarifyGlobalStore__;
  };

  return {
    get: () => getGlobal()[globalKey] as T,
    set: (value: T) => {
      if (typeof globalThis === "undefined") return;
      getGlobal()[globalKey] = value;
    },
    has: () => {
      if (typeof globalThis === "undefined") return false;
      return globalKey in getGlobal() && getGlobal()[globalKey] !== undefined;
    },
  };
}

/**
 * Create a typed global Map cache
 */
export function createGlobalMapCache<K, V>(cacheName: string): Map<K, V> {
  if (typeof globalThis === "undefined") {
    return new Map<K, V>();
  }

  const globalKey = `__clarify${cacheName}Cache__`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;

  if (!g.__clarifyMapStore__) {
    g.__clarifyMapStore__ = {};
  }

  if (!g.__clarifyMapStore__[globalKey]) {
    g.__clarifyMapStore__[globalKey] = new Map<K, V>();
  }

  return g.__clarifyMapStore__[globalKey];
}

/**
 * Create a global cache with get/set/has methods for a Map
 * Includes TTL-based cache invalidation
 */
export function createMapCacheManager<K, V>(cacheName: string, ttlMs: number = DEFAULT_TTL_MS) {
  const getCache = () => createGlobalMapCache<K, CacheEntry<V>>(`${cacheName}WithTTL`);
  const getTimestamps = () => createGlobalMapCache<K, number>(`${cacheName}Timestamps`);

  // Clean up expired entries periodically
  const cleanupExpired = () => {
    const cache = getCache();
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (entry.expiresAt <= now) {
        cache.delete(key);
      }
    }
  };

  return {
    get: (key: K): V | undefined => {
      const cache = getCache();
      const entry = cache.get(key);
      if (!entry) return undefined;

      // Check if expired
      if (entry.expiresAt <= Date.now()) {
        cache.delete(key);
        return undefined;
      }

      return entry.value;
    },
    set: (key: K, value: V, customTtlMs?: number) => {
      const cache = getCache();
      const effectiveTtl = customTtlMs ?? ttlMs;
      cache.set(key, {
        value,
        expiresAt: Date.now() + effectiveTtl,
      });
      getTimestamps().set(key, Date.now());
    },
    has: (key: K): boolean => {
      const entry = getCache().get(key);
      if (!entry) return false;
      if (entry.expiresAt <= Date.now()) {
        getCache().delete(key);
        return false;
      }
      return true;
    },
    delete: (key: K) => {
      getCache().delete(key);
      getTimestamps().delete(key);
    },
    clear: () => {
      getCache().clear();
      getTimestamps().clear();
    },
    getAll: () => {
      cleanupExpired();
      const result = new Map<K, V>();
      for (const [key, entry] of getCache().entries()) {
        result.set(key, entry.value);
      }
      return result;
    },
    /**
     * Check if cache entry is stale (past TTL but still accessible)
     */
    isStale: (key: K): boolean => {
      const timestamp = getTimestamps().get(key);
      if (!timestamp) return true;
      return Date.now() - timestamp > ttlMs;
    },
    /**
     * Invalidate cache for a specific key
     */
    invalidate: (key: K) => {
      getCache().delete(key);
      getTimestamps().delete(key);
    },
    /**
     * Invalidate all cache entries matching a predicate
     */
    invalidateWhere: (predicate: (key: K) => boolean) => {
      const cache = getCache();
      const timestamps = getTimestamps();
      for (const key of cache.keys()) {
        if (predicate(key)) {
          cache.delete(key);
          timestamps.delete(key);
        }
      }
    },
  };
}
