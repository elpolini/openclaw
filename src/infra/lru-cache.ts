/**
 * Bounded LRU cache with optional TTL expiry.
 *
 * Evicts the least-recently-used entry when capacity is reached.
 * Uses a plain `Map` for O(1) insertion-order iteration (oldest-first).
 */

export type LruCacheOptions = {
  /** Maximum number of entries before eviction. */
  maxSize: number;
  /** Time-to-live in milliseconds. 0 or omitted = no expiry. */
  ttlMs?: number;
  /** Optional clock override for testing. */
  now?: () => number;
};

export type LruCache<V> = {
  get: (key: string) => V | undefined;
  set: (key: string, value: V) => void;
  has: (key: string) => boolean;
  delete: (key: string) => boolean;
  clear: () => void;
  size: () => number;
  keys: () => string[];
};

type Entry<V> = { value: V; expiresAt: number };

export function createLruCache<V>(options: LruCacheOptions): LruCache<V> {
  const maxSize = Math.max(1, Math.floor(options.maxSize));
  const ttlMs = options.ttlMs != null && options.ttlMs > 0 ? Math.floor(options.ttlMs) : 0;
  const now = options.now ?? Date.now;

  const map = new Map<string, Entry<V>>();

  function isExpired(entry: Entry<V>): boolean {
    return entry.expiresAt > 0 && now() >= entry.expiresAt;
  }

  function touch(key: string, entry: Entry<V>) {
    map.delete(key);
    map.set(key, entry);
  }

  function evictOldest() {
    const oldest = map.keys().next();
    if (!oldest.done) {
      map.delete(oldest.value);
    }
  }

  return {
    get(key) {
      const entry = map.get(key);
      if (!entry) {
        return undefined;
      }
      if (isExpired(entry)) {
        map.delete(key);
        return undefined;
      }
      touch(key, entry);
      return entry.value;
    },

    set(key, value) {
      const existing = map.get(key);
      if (existing) {
        map.delete(key);
      }
      const expiresAt = ttlMs > 0 ? now() + ttlMs : 0;
      map.set(key, { value, expiresAt });
      while (map.size > maxSize) {
        evictOldest();
      }
    },

    /** Check existence without updating LRU order (read-only probe). */
    has(key) {
      const entry = map.get(key);
      if (!entry) {
        return false;
      }
      if (isExpired(entry)) {
        map.delete(key);
        return false;
      }
      return true;
    },

    delete(key) {
      return map.delete(key);
    },

    clear() {
      map.clear();
    },

    size() {
      return map.size;
    },

    keys() {
      return [...map.keys()];
    },
  };
}
