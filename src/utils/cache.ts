  // src/utils/cache.ts
  const cache = new Map<string, { value: any; expiry: number }>();

  export function getCache<T>(key: string): T | null {
    const entry = cache.get(key);
    if (entry && entry.expiry > Date.now()) {
      return entry.value as T;
    }
    cache.delete(key);
    return null;
  }

  export function setCache(key: string, value: any, ttl: number) {
    cache.set(key, { value, expiry: Date.now() + ttl });
  }

