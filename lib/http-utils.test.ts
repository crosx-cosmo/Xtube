import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SlidingWindowRateLimiter,
  RATE_LIMIT_TIERS,
  extractClientIp,
  enforceRateLimit,
  verifySameOriginMutation,
  parseJsonBody,
} from './http-utils';

test('SlidingWindowRateLimiter enforces per-window quotas and recovers after window expiry', () => {
  const limiter = new SlidingWindowRateLimiter({ maxBuckets: 100 });
  const tier = { id: 'test', limit: 3, windowMs: 10_000 };

  const r1 = limiter.check('client-1', tier, 1000);
  const r2 = limiter.check('client-1', tier, 2000);
  const r3 = limiter.check('client-1', tier, 3000);
  const r4 = limiter.check('client-1', tier, 4000);

  assert.equal(r1.allowed, true);
  assert.equal(r1.remaining, 2);
  assert.equal(r2.allowed, true);
  assert.equal(r3.allowed, true);
  assert.equal(r3.remaining, 0);
  assert.equal(r4.allowed, false);
  assert.equal(r4.retryAfterSeconds, 7);

  // Once the 10s window passes from timestamp 1000 -> 11001, requests are allowed again
  const r5 = limiter.check('client-1', tier, 11_001);
  assert.equal(r5.allowed, true);
  assert.equal(r5.remaining, 0);
});

test('SlidingWindowRateLimiter bounds memory via maxBuckets eviction', () => {
  const limiter = new SlidingWindowRateLimiter({ maxBuckets: 64 });
  const tier = { id: 'burst', limit: 2, windowMs: 60_000 };

  for (let i = 0; i < 120; i += 1) {
    limiter.check(`ip-${i}`, tier, 1000 + i);
  }
  assert.equal(limiter.size <= 64, true);
});

test('extractClientIp and enforceRateLimit return 429 when threshold is exceeded', async () => {
  const limiter = new SlidingWindowRateLimiter();
  const makeReq = () =>
    new Request('https://heylady.example/api/admin/auth', {
      method: 'POST',
      headers: { 'x-forwarded-for': '203.0.113.42, 10.0.0.1' },
    });

  assert.equal(extractClientIp(makeReq()), '203.0.113.42');

  const strictTier = { id: 'strict', limit: 2, windowMs: 60_000 };
  assert.equal(enforceRateLimit(makeReq(), strictTier, 'login', limiter), null);
  assert.equal(enforceRateLimit(makeReq(), strictTier, 'login', limiter), null);

  const blocked = enforceRateLimit(makeReq(), strictTier, 'login', limiter);
  assert.ok(blocked);
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get('Retry-After')) >= 1);
  assert.equal(RATE_LIMIT_TIERS.AUTH_STRICT.limit, 12);
});

test('verifySameOriginMutation allows matching origin and blocks cross-site origin', () => {
  const validReq = new Request('https://heylady.example/api/bookmarks', {
    method: 'POST',
    headers: {
      host: 'heylady.example',
      origin: 'https://heylady.example',
    },
  });
  assert.equal(verifySameOriginMutation(validReq), null);

  const crossSiteReq = new Request('https://heylady.example/api/bookmarks', {
    method: 'POST',
    headers: {
      host: 'heylady.example',
      origin: 'https://evil-attacker.example',
    },
  });
  const blocked = verifySameOriginMutation(crossSiteReq);
  assert.ok(blocked);
  assert.equal(blocked.status, 403);
});

test('parseJsonBody parses valid objects, rejects oversized payloads, and handles invalid JSON safely', async () => {
  const okReq = new Request('https://heylady.example/api/test', {
    method: 'POST',
    body: JSON.stringify({ videoId: 'v1' }),
  });
  const okResult = await parseJsonBody<{ videoId: string }>(okReq, 1024);
  assert.deepEqual(okResult.data, { videoId: 'v1' });
  assert.equal(okResult.errorResponse, undefined);

  const malformedReq = new Request('https://heylady.example/api/test', {
    method: 'POST',
    body: '{broken-json',
  });
  const malformedResult = await parseJsonBody(malformedReq, 1024);
  assert.equal(malformedResult.errorResponse?.status, 400);

  const hugeReq = new Request('https://heylady.example/api/test', {
    method: 'POST',
    body: JSON.stringify({ data: 'x'.repeat(2048) }),
  });
  const hugeResult = await parseJsonBody(hugeReq, 256);
  assert.equal(hugeResult.errorResponse?.status, 413);
});

test('isSecureRequest and getPublicReadCacheControl inspect TLS headers and viewer state', async () => {
  const { isSecureRequest, getPublicReadCacheControl, PUBLIC_COLLECTION_CACHE_CONTROL } =
    await import('./http-utils');

  const httpsProxyReq = new Request('http://localhost:3000/api/videos', {
    headers: { 'x-forwarded-proto': 'https' },
  });
  const httpDirectReq = new Request('http://localhost:3000/api/videos');

  assert.equal(isSecureRequest(httpsProxyReq), true);
  assert.equal(isSecureRequest(httpDirectReq), false);
  assert.equal(getPublicReadCacheControl(true), 'private, no-store');
  assert.equal(getPublicReadCacheControl(false), PUBLIC_COLLECTION_CACHE_CONTROL);
});
