type CacheEntry<T> = {
  value: T;
  createdAt: number;
};

/**
 * Creates a typed in-memory cache with max size, TTL expiration and LRU eviction.
 *
 * @param maxSize - Maximum number of entries before LRU eviction triggers
 * @param ttl - Time to live in milliseconds before an entry is considered stale
 */

export function createCache<T>(maxSize: number, ttl: number) {
  const cache = new Map<string, CacheEntry<T>>();

  function setCache(key: string, value: T): void {
    if (!cache.has(key) && cache.size >= maxSize) deleteOldestEntry(cache);

    const entry: CacheEntry<T> = { value, createdAt: Date.now() };

    cache.set(key, entry);
  }

  function getCache(key: string): T | undefined {
    const data = cache.get(key);

    if (!data) return undefined;

    if (isExpired(data)) {
      cache.delete(key);

      return undefined;
    }

    refreshEntry(key, data);

    return data.value;
  }

  function clear(): void {
    cache.clear();
  }

  /** HELPERS **/
  function deleteOldestEntry(cache: Map<string, CacheEntry<T>>) {
    const oldestKey = cache.keys().next().value;

    if (oldestKey) cache.delete(oldestKey);
  }

  function isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.createdAt > ttl;
  }

  function refreshEntry(key: string, entry: CacheEntry<T>): void {
    cache.delete(key);
    cache.set(key, entry);
  }

  return { getCache, setCache, clear };
}
