import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWatchShareUrl, requestApiJson } from './api-client';

test('buildWatchShareUrl generates clean canonical watch links for clipboard sharing', () => {
  assert.equal(
    buildWatchShareUrl('vid-123', 'https://heylady.app/'),
    'https://heylady.app/watch/vid-123'
  );
  assert.equal(
    buildWatchShareUrl('vid-abc', 'http://localhost:3000'),
    'http://localhost:3000/watch/vid-abc'
  );
  assert.equal(
    buildWatchShareUrl(undefined, '', 'https://heylady.app/watch/fallback-id'),
    'https://heylady.app/watch/fallback-id'
  );
});

test('requestApiJson coalesces concurrent identical GET requests and parses JSON responses', async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;

  globalThis.fetch = (async () => {
    fetchCalls += 1;
    await new Promise((r) => setTimeout(r, 15));
    return new Response(JSON.stringify({ ok: true, count: 42 }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const [res1, res2] = await Promise.all([
      requestApiJson<{ ok: boolean; count: number }>('https://heylady.example/api/categories'),
      requestApiJson<{ ok: boolean; count: number }>('https://heylady.example/api/categories'),
    ]);

    assert.equal(fetchCalls, 1);
    assert.equal(res1.ok, true);
    assert.equal(res1.data?.count, 42);
    assert.equal(res2.data?.count, 42);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('requestApiJson serializes JSON payloads and surfaces structured API error messages', async () => {
  const originalFetch = globalThis.fetch;
  let capturedBody = '';
  let capturedContentType = '';

  globalThis.fetch = (async (_url, init) => {
    const headers = new Headers(init?.headers);
    capturedContentType = headers.get('content-type') ?? '';
    capturedBody = String(init?.body ?? '');
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const result = await requestApiJson('https://heylady.example/api/admin/auth', {
      method: 'POST',
      json: { email: 'admin@example.com' },
    });

    assert.equal(capturedContentType, 'application/json');
    assert.deepEqual(JSON.parse(capturedBody), { email: 'admin@example.com' });
    assert.equal(result.ok, false);
    assert.equal(result.status, 401);
    assert.equal(result.error, 'Invalid credentials');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
