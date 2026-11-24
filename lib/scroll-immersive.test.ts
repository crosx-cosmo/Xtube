import test from 'node:test';
import assert from 'node:assert/strict';
import { computeImmersiveScrollState } from './scroll-immersive';

test('computeImmersiveScrollState stays non-immersive near the top of the page', () => {
  assert.equal(computeImmersiveScrollState(false, 0, 0), false);
  assert.equal(computeImmersiveScrollState(false, 40, 10), false);
  assert.equal(computeImmersiveScrollState(true, 45, 90), false);
  assert.equal(computeImmersiveScrollState(true, 0, 120), false);
});

test('computeImmersiveScrollState enters full-screen mode on deliberate downward scroll', () => {
  // Below enter threshold
  assert.equal(computeImmersiveScrollState(false, 65, 40), false);
  // Past enter threshold but tiny downward jitter (< 10px)
  assert.equal(computeImmersiveScrollState(false, 105, 100), false);
  // Deliberate downward scroll past threshold
  assert.equal(computeImmersiveScrollState(false, 120, 80), true);
});

test('computeImmersiveScrollState restores chrome on deliberate upward scroll and ignores tiny jitter', () => {
  // Tiny upward bounce (< 14px) keeps full-screen mode stable
  assert.equal(computeImmersiveScrollState(true, 292, 300), true);
  // Continuing downward stays full-screen
  assert.equal(computeImmersiveScrollState(true, 360, 300), true);
  // Deliberate upward scroll (>= 14px) restores header & sidebar
  assert.equal(computeImmersiveScrollState(true, 270, 300), false);
});
