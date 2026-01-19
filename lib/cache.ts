/**
 * Shared cache utilities for global caching patterns
 */

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

  return {
    get: () => {
      if (typeof globalThis === "undefined") {
        throw new Error("Global cache can only be used in browser environment");
      }
      const global = globalThis as typeof globalThis & { [key: string]: T };
      return global[globalKey];
    },
    set: (value: T) => {
      if (typeof globalThis === "undefined") return;
      const global = globalThis as typeof globalThis & { [key: string]: T };
      global[globalKey] = value;
    },
    has: () => {
      if (typeof globalThis === "undefined") return false;
      const global = globalThis as typeof globalThis & { [key: string]: T };
      return globalKey in global && global[globalKey] !== undefined;
    },
  };
}

/**
 * Create a typed global Map cache
 */
export function createGlobalMapCache<K, V>(cacheName: string) {
  if (typeof globalThis === "undefined") {
    return new Map<K, V>();
  }

  const globalKey = `__clarify${cacheName}Cache__` as keyof typeof globalThis;
  const global = globalThis as typeof globalThis & { [key: string]: Map<K, V> };

  if (!global[globalKey]) {
    global[globalKey] = new Map<K, V>();
  }

  return global[globalKey];
}

/**
 * Create a global cache with get/set/has methods for a Map
 */
export function createMapCacheManager<K, V>(cacheName: string) {
  const getCache = () => createGlobalMapCache<K, V>(cacheName);

  return {
    get: (key: K) => getCache().get(key),
    set: (key: K, value: V) => getCache().set(key, value),
    has: (key: K) => getCache().has(key),
    delete: (key: K) => getCache().delete(key),
    clear: () => getCache().clear(),
    getAll: () => getCache(),
  };
}
