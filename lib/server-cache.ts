/**
 * Lightweight bounded in-memory server cache with:
 * - Short TTL expiration
 * - In-flight promise coalescing (prevents thundering herds on Render/Neon)
 * - Prefix & exact-key invalidation on writes
 * - Hard max-entry cap so memory usage stays flat on Render instances
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class ServerCache {
  private readonly entries = new Map<string, CacheEntry<unknown>>();
  private readonly inflight = new Map<string, Promise<unknown>>();
  private readonly maxEntries: number;

  constructor(maxEntries = 200) {
    this.maxEntries = Math.max(10, maxEntries);
  }

  get<T>(key: string, now = Date.now()): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number, now = Date.now()): void {
    if (ttlMs <= 0) return;

    // Refresh insertion order on update
    if (this.entries.has(key)) {
      this.entries.delete(key);
    }

    this.entries.set(key, { value, expiresAt: now + ttlMs });

    // Evict expired first, then oldest entries if still above cap
    if (this.entries.size > this.maxEntries) {
      for (const [k, v] of this.entries) {
        if (v.expiresAt <= now) {
          this.entries.delete(k);
        }
      }
      while (this.entries.size > this.maxEntries) {
        const oldestKey = this.entries.keys().next().value;
        if (oldestKey === undefined) break;
        this.entries.delete(oldestKey);
      }
    }
  }

  /**
   * Returns cached data if fresh, coalesces concurrent in-flight requests
   * for the same key into a single loader execution, and stores the resolved
   * result for `ttlMs`. Failed promises are never cached.
   */
  async getOrLoad<T>(
    key: string,
    ttlMs: number,
    loader: () => Promise<T>,
    options?: { cacheNull?: boolean }
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const existingPromise = this.inflight.get(key) as Promise<T> | undefined;
    if (existingPromise) {
      return existingPromise;
    }

    const promise = loader()
      .then((value) => {
        if (value !== null && value !== undefined) {
          this.set(key, value, ttlMs);
        } else if (options?.cacheNull) {
          this.set(key, value, ttlMs);
        }
        return value;
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, promise);
    return promise;
  }

  invalidate(key: string): void {
    this.entries.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) {
        this.entries.delete(key);
      }
    }
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}

declare global {
  var _kinshipServerCache: ServerCache | undefined;
}

export function getServerCache(): ServerCache {
  if (!globalThis._kinshipServerCache) {
    globalThis._kinshipServerCache = new ServerCache(250);
  }
  return globalThis._kinshipServerCache;
}

export const CACHE_TTL_MS = {
  CATEGORIES: 30_000,
  VIDEOS_LIST: 20_000,
  VIDEO_DETAIL: 15_000,
  EDUCATORS: 30_000,
  CREATOR_PROFILE: 20_000,
} as const;

export function invalidateCatalogCaches(videoId?: string): void {
  const cache = getServerCache();
  cache.invalidatePrefix('videos:');
  cache.invalidatePrefix('educators:');
  cache.invalidatePrefix('creator:');
  if (videoId) {
    cache.invalidatePrefix(`video:${videoId}`);
  } else {
    cache.invalidatePrefix('video:');
  }
}

export function invalidateCategoryCaches(): void {
  const cache = getServerCache();
  cache.invalidatePrefix('categories:');
  cache.invalidatePrefix('videos:');
  cache.invalidatePrefix('video:');
}
