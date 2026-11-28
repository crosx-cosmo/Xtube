import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KEEP_ALIVE_INTERVAL_MINUTES,
  RENDER_KEEP_ALIVE_INTERVAL_MS,
  RENDER_SLEEP_THRESHOLD_MINUTES,
  isKeepAliveDue,
  recordKeepAlivePing,
  resolveExternalKeepAliveOrigin,
} from './keep-alive';

test('Render keep-alive interval is strictly 10 minutes (600,000 ms) below Render 15-minute sleep threshold', () => {
  assert.equal(KEEP_ALIVE_INTERVAL_MINUTES, 10);
  assert.equal(RENDER_SLEEP_THRESHOLD_MINUTES, 15);
  assert.equal(RENDER_KEEP_ALIVE_INTERVAL_MS, 600_000);
  assert.ok(RENDER_KEEP_ALIVE_INTERVAL_MS < RENDER_SLEEP_THRESHOLD_MINUTES * 60 * 1000);
});

test('resolveExternalKeepAliveOrigin prioritizes RENDER_EXTERNAL_URL then APP_URL then localhost fallback', () => {
  assert.equal(
    resolveExternalKeepAliveOrigin({
      RENDER_EXTERNAL_URL: 'https://heylady-on-render.onrender.com/some/path',
      APP_URL: 'https://custom.domain.com',
    }),
    'https://heylady-on-render.onrender.com'
  );

  assert.equal(
    resolveExternalKeepAliveOrigin({
      RENDER_EXTERNAL_URL: '',
      APP_URL: 'https://custom.domain.com/watch',
    }),
    'https://custom.domain.com'
  );

  assert.equal(
    resolveExternalKeepAliveOrigin({
      RENDER_EXTERNAL_URL: '',
      APP_URL: 'MY_APP_URL',
      PORT: '3000',
    }),
    'http://127.0.0.1:3000'
  );
});

test('isKeepAliveDue and recordKeepAlivePing track 10-minute heartbeat schedule accurately', () => {
  assert.equal(isKeepAliveDue(null, 1_000_000), true);
  assert.equal(isKeepAliveDue(1_000_000, 1_000_000 + 599_999), false);
  assert.equal(isKeepAliveDue(1_000_000, 1_000_000 + 600_000), true);

  const state = recordKeepAlivePing('client-heartbeat', 2_000_000);
  assert.equal(state.lastSource, 'client-heartbeat');
  assert.equal(state.intervalMs, 600_000);
  assert.ok(state.totalPings >= 1);
  assert.equal(state.lastPingAt, new Date(2_000_000).toISOString());
  assert.equal(state.nextPingAt, new Date(2_600_000).toISOString());
});
