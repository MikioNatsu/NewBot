type CacheEntry<T> = { value: T; time: number };
const cacheStore = new Map<string, CacheEntry<any>>();

export function setCache<T>(key: string, value: T, ttl = 60_000) {
  cacheStore.set(key, { value, time: Date.now() + ttl });
}

export function getCache<T>(key: string): T | null {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.time) {
    cacheStore.delete(key);
    return null;
  }
  return entry.value;
}
