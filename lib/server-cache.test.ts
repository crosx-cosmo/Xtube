import test from 'node:test';
import assert from 'node:assert/strict';
import { ServerCache } from './server-cache';

test('ServerCache stores, retrieves, expires, and invalidates entries cleanly', () => {
  const cache = new ServerCache(10);
  const t0 = 1_000_000;

  cache.set('categories:all', ['a', 'b'], 5_000, t0);
  assert.deepEqual(cache.get('categories:all', t0 + 1_000), ['a', 'b']);
  assert.equal(cache.get('categories:all', t0 + 5_000), undefined);

  cache.set('videos:all', [1], 10_000, t0);
  cache.set('videos:cat:trust', [2], 10_000, t0);
  cache.set('educators:all', [3], 10_000, t0);

  cache.invalidatePrefix('videos:');
  assert.equal(cache.get('videos:all', t0 + 100), undefined);
  assert.equal(cache.get('videos:cat:trust', t0 + 100), undefined);
  assert.deepEqual(cache.get('educators:all', t0 + 100), [3]);
});

test('ServerCache enforces maxEntries cap to keep server memory bounded', () => {
  const cache = new ServerCache(10);
  const now = 5_000_000;

  for (let i = 0; i < 20; i++) {
    cache.set(`key:${i}`, i, 60_000, now);
  }

  assert.equal(cache.size, 10);
  assert.equal(cache.get('key:0', now + 1), undefined);
  assert.equal(cache.get('key:19', now + 1), 19);
});

test('ServerCache.getOrLoad coalesces concurrent in-flight requests into one loader call', async () => {
  const cache = new ServerCache(20);
  let loadCount = 0;

  const loader = async () => {
    loadCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 15));
    return { count: loadCount };
  };

  const results = await Promise.all([
    cache.getOrLoad('videos:all', 10_000, loader),
    cache.getOrLoad('videos:all', 10_000, loader),
    cache.getOrLoad('videos:all', 10_000, loader),
  ]);

  assert.equal(loadCount, 1);
  assert.deepEqual(results, [{ count: 1 }, { count: 1 }, { count: 1 }]);

  // Subsequent read hits cache without calling loader again
  const cached = await cache.getOrLoad('videos:all', 10_000, loader);
  assert.equal(loadCount, 1);
  assert.deepEqual(cached, { count: 1 });
});

test('ServerCache.getOrLoad does not cache rejected promises', async () => {
  const cache = new ServerCache(20);
  let attempts = 0;

  await assert.rejects(
    cache.getOrLoad('failing:key', 10_000, async () => {
      attempts += 1;
      throw new Error('transient db blip');
    }),
    /transient db blip/
  );

  const recovered = await cache.getOrLoad('failing:key', 10_000, async () => {
    attempts += 1;
    return 'ok';
  });

  assert.equal(attempts, 2);
  assert.equal(recovered, 'ok');
});
