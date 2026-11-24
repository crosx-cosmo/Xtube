import { NextResponse } from 'next/server';

/**
 * Shared HTTP Caching, Traffic Control (Rate Limiting), CSRF Origin Validation,
 * and Bounded Payload Parsing helpers for high-concurrency edge/serverless traffic.
 */
export const PUBLIC_COLLECTION_CACHE_CONTROL =
  'public, s-maxage=30, stale-while-revalidate=120';

export const PUBLIC_DETAIL_CACHE_CONTROL =
  'public, s-maxage=15, stale-while-revalidate=60';

export const PRIVATE_NO_STORE_CACHE_CONTROL =
  'private, no-store, no-cache, must-revalidate';

export const PUBLIC_IMMUTABLE_ASSET_CACHE_CONTROL =
  'public, max-age=31536000, s-maxage=31536000, immutable';

/**
 * Determines whether a request arrived over HTTPS (either directly or behind a TLS reverse proxy).
 */
export function isSecureRequest(request: Request): boolean {
  const forwardedProto = request.headers
    .get('x-forwarded-proto')
    ?.split(',')[0]
    ?.trim()
    .toLowerCase();
  if (forwardedProto === 'https') return true;
  if (forwardedProto === 'http') return false;
  try {
    return new URL(request.url).protocol === 'https:';
  } catch {
    return process.env.NODE_ENV === 'production';
  }
}

/**
 * Returns private no-store caching when viewer-specific state is hydrated,
 * or shared CDN stale-while-revalidate caching for anonymous read traffic.
 */
export function getPublicReadCacheControl(hasViewerSession: boolean): string {
  return hasViewerSession
    ? 'private, no-store'
    : PUBLIC_COLLECTION_CACHE_CONTROL;
}

export interface RateLimitTierConfig {
  id: string;
  limit: number;
  windowMs: number;
}

export const RATE_LIMIT_TIERS = {
  AUTH_STRICT: { id: 'auth', limit: 12, windowMs: 60_000 },
  WRITE_MUTATION: { id: 'write', limit: 45, windowMs: 60_000 },
  ADMIN_MUTATION: { id: 'admin', limit: 60, windowMs: 60_000 },
  PUBLIC_READ: { id: 'read', limit: 180, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitTierConfig>;

export interface RateLimitCheckResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAtMs: number;
  retryAfterSeconds: number;
}

interface RateBucket {
  timestamps: number[];
  expiresAtMs: number;
}

/**
 * Memory-bounded sliding-window rate limiter to protect API endpoints and Neon DB
 * against brute-force attacks, comment/like flooding, and scraping bursts.
 */
export class SlidingWindowRateLimiter {
  private readonly buckets = new Map<string, RateBucket>();
  private readonly maxBuckets: number;

  constructor(options?: { maxBuckets?: number }) {
    this.maxBuckets = Math.max(64, options?.maxBuckets ?? 5000);
  }

  check(
    key: string,
    tier: RateLimitTierConfig,
    nowMs = Date.now()
  ): RateLimitCheckResult {
    const windowStart = nowMs - tier.windowMs;
    const existing = this.buckets.get(key);
    const activeTimestamps = existing
      ? existing.timestamps.filter((t) => t > windowStart)
      : [];

    if (activeTimestamps.length >= tier.limit) {
      const oldestInWindow = activeTimestamps[0] ?? nowMs;
      const resetAtMs = oldestInWindow + tier.windowMs;
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((resetAtMs - nowMs) / 1000)
      );
      return {
        allowed: false,
        limit: tier.limit,
        remaining: 0,
        resetAtMs,
        retryAfterSeconds,
      };
    }

    activeTimestamps.push(nowMs);
    // Refresh insertion order for LRU-style bounded eviction
    if (existing) {
      this.buckets.delete(key);
    } else if (this.buckets.size >= this.maxBuckets) {
      this.evictExpiredOrOldest(nowMs);
    }

    const resetAtMs = (activeTimestamps[0] ?? nowMs) + tier.windowMs;
    this.buckets.set(key, {
      timestamps: activeTimestamps,
      expiresAtMs: nowMs + tier.windowMs,
    });

    return {
      allowed: true,
      limit: tier.limit,
      remaining: Math.max(0, tier.limit - activeTimestamps.length),
      resetAtMs,
      retryAfterSeconds: 0,
    };
  }

  get size(): number {
    return this.buckets.size;
  }

  clear(): void {
    this.buckets.clear();
  }

  private evictExpiredOrOldest(nowMs: number): void {
    for (const [k, bucket] of this.buckets) {
      if (bucket.expiresAtMs <= nowMs) {
        this.buckets.delete(k);
      }
      if (this.buckets.size < this.maxBuckets) {
        return;
      }
    }
    const oldestKey = this.buckets.keys().next().value;
    if (oldestKey !== undefined) {
      this.buckets.delete(oldestKey);
    }
  }
}

export const globalRateLimiter = new SlidingWindowRateLimiter({
  maxBuckets: 5000,
});

/**
 * Extracts a normalized client identifier from reverse-proxy headers.
 */
export function extractClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first && first.length <= 64) return first;
  }
  const realIp =
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    '127.0.0.1';
  return realIp.trim().slice(0, 64) || '127.0.0.1';
}

/**
 * Enforces sliding-window rate limits per client IP and endpoint scope.
 * Returns a 429 NextResponse if rate-limited, or null if allowed.
 */
export function enforceRateLimit(
  request: Request,
  tier: RateLimitTierConfig,
  scope: string,
  limiter: SlidingWindowRateLimiter = globalRateLimiter
): NextResponse | null {
  const ip = extractClientIp(request);
  const key = `${tier.id}:${scope}:${ip}`;
  const result = limiter.check(key, tier);
  if (result.allowed) {
    return null;
  }
  return NextResponse.json(
    {
      error: `Too many requests. Please wait ${result.retryAfterSeconds}s before retrying.`,
      retryAfterSeconds: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        'Cache-Control': PRIVATE_NO_STORE_CACHE_CONTROL,
        'Retry-After': String(result.retryAfterSeconds),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(result.resetAtMs / 1000)),
      },
    }
  );
}

/**
 * Validates that state-changing requests (POST, PUT, PATCH, DELETE) with an Origin
 * header originate from the same host or configured APP_URL to block cross-site CSRF.
 */
export function verifySameOriginMutation(request: Request): NextResponse | null {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return null;
  }

  const originHeader = request.headers.get('origin');
  if (!originHeader) {
    return null;
  }

  let originHost = '';
  try {
    originHost = new URL(originHeader).host.toLowerCase();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request Origin header.' },
      { status: 403, headers: { 'Cache-Control': PRIVATE_NO_STORE_CACHE_CONTROL } }
    );
  }

  const allowedHosts = new Set<string>();
  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedHost) {
    for (const h of forwardedHost.split(',')) {
      const trimmed = h.trim().toLowerCase();
      if (trimmed) allowedHosts.add(trimmed);
    }
  }
  const hostHeader = request.headers.get('host')?.trim().toLowerCase();
  if (hostHeader) {
    allowedHosts.add(hostHeader);
  }
  try {
    const reqUrlHost = new URL(request.url).host.toLowerCase();
    if (reqUrlHost) allowedHosts.add(reqUrlHost);
  } catch {
    // Ignore malformed request.url in synthetic tests
  }
  const configuredAppUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configuredAppUrl) {
    try {
      allowedHosts.add(new URL(configuredAppUrl).host.toLowerCase());
    } catch {
      // Ignore placeholder env var
    }
  }

  if (allowedHosts.size > 0 && !allowedHosts.has(originHost)) {
    return NextResponse.json(
      { error: 'Cross-origin mutation request denied.' },
      { status: 403, headers: { 'Cache-Control': PRIVATE_NO_STORE_CACHE_CONTROL } }
    );
  }

  return null;
}

/**
 * Safely reads and parses a JSON request body with strict byte-length protection.
 */
export async function parseJsonBody<T = Record<string, unknown>>(
  request: Request,
  maxBytes = 65_536
): Promise<{ data?: T; errorResponse?: NextResponse }> {
  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader) {
    const declaredBytes = Number(contentLengthHeader);
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      return {
        errorResponse: NextResponse.json(
          { error: 'Request payload exceeds maximum allowed size.' },
          {
            status: 413,
            headers: { 'Cache-Control': PRIVATE_NO_STORE_CACHE_CONTROL },
          }
        ),
      };
    }
  }

  try {
    const rawText = await request.text();
    if (Buffer.byteLength(rawText, 'utf8') > maxBytes) {
      return {
        errorResponse: NextResponse.json(
          { error: 'Request payload exceeds maximum allowed size.' },
          {
            status: 413,
            headers: { 'Cache-Control': PRIVATE_NO_STORE_CACHE_CONTROL },
          }
        ),
      };
    }
    if (!rawText.trim()) {
      return {
        errorResponse: NextResponse.json(
          { error: 'Request body must be valid non-empty JSON.' },
          {
            status: 400,
            headers: { 'Cache-Control': PRIVATE_NO_STORE_CACHE_CONTROL },
          }
        ),
      };
    }
    const parsed = JSON.parse(rawText) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        errorResponse: NextResponse.json(
          { error: 'Request body must be a JSON object.' },
          {
            status: 400,
            headers: { 'Cache-Control': PRIVATE_NO_STORE_CACHE_CONTROL },
          }
        ),
      };
    }
    return { data: parsed as T };
  } catch {
    return {
      errorResponse: NextResponse.json(
        { error: 'Malformed JSON request payload.' },
        {
          status: 400,
          headers: { 'Cache-Control': PRIVATE_NO_STORE_CACHE_CONTROL },
        }
      ),
    };
  }
}
