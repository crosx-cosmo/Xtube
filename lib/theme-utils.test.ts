import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBoudoirVelvetTransitionSpec,
  buildDiamondPrismClipKeyframes,
  computeDiagonalSweepAngle,
  computePrismSparkVectors,
  computeRippleRadius,
  getHomeFeedSkeletonCounts,
  getNextTheme,
  resolveInitialTheme,
} from './theme-utils';

test('resolveInitialTheme parses stored values and falls back safely', () => {
  assert.equal(resolveInitialTheme('light'), 'light');
  assert.equal(resolveInitialTheme('dark'), 'dark');
  assert.equal(resolveInitialTheme(null), 'light');
  assert.equal(resolveInitialTheme(undefined), 'light');
  assert.equal(resolveInitialTheme('sepia'), 'light');
  assert.equal(resolveInitialTheme('', 'dark'), 'dark');
});

test('getNextTheme alternates cleanly between dark and light', () => {
  assert.equal(getNextTheme('dark'), 'light');
  assert.equal(getNextTheme('light'), 'dark');
});

test('computeRippleRadius covers the farthest viewport corner from click origin', () => {
  const topRight = computeRippleRadius(1400, 28, 1440, 900);
  assert.ok(Math.abs(topRight - Math.hypot(1400, 872)) < 0.001);

  const center = computeRippleRadius(500, 400, 1000, 800);
  assert.ok(Math.abs(center - Math.hypot(500, 400)) < 0.001);
});

test('buildDiamondPrismClipKeyframes produces 4 valid 8-vertex CSS polygon keyframes', () => {
  const frames = buildDiamondPrismClipKeyframes(1320, 32, 1440, 900);
  assert.equal(frames.length, 4);

  for (const frame of frames) {
    assert.ok(frame.startsWith('polygon(') && frame.endsWith(')'));
    const vertices = frame
      .slice('polygon('.length, -1)
      .split(',')
      .map((v) => v.trim());
    assert.equal(vertices.length, 8);
  }
});

test('computeDiagonalSweepAngle points toward the farthest opposite viewport corner', () => {
  const fromTopRight = computeDiagonalSweepAngle(1380, 30, 1440, 900);
  assert.ok(fromTopRight > 90 && fromTopRight < 180);

  const fromTopLeft = computeDiagonalSweepAngle(40, 30, 1440, 900);
  assert.ok(fromTopLeft > 0 && fromTopLeft < 90);
});

test('computePrismSparkVectors generates deterministic alternating diamond spark vectors', () => {
  const sparks = computePrismSparkVectors(8, 100);
  assert.equal(sparks.length, 8);
  assert.equal(sparks[0]?.scale, 1.15);
  assert.equal(sparks[1]?.scale, 0.78);
  assert.ok(Math.hypot(sparks[0]!.dx, sparks[0]!.dy) > Math.hypot(sparks[1]!.dx, sparks[1]!.dy));
});

test('buildBoudoirVelvetTransitionSpec returns GPU-optimized 18+ velvet night and champagne light specs', () => {
  const nightSpec = buildBoudoirVelvetTransitionSpec('dark', 1320, 36, 1440, 900);
  assert.equal(nightSpec.mode, 'velvet-night');
  assert.equal(nightSpec.badgeText, '18+ VELVET NIGHT');
  assert.ok(nightSpec.endRadius > 1000);
  assert.ok(nightSpec.themeCommitDelayMs < nightSpec.durationMs);
  assert.equal(nightSpec.sparks.length, 8);

  const lightSpec = buildBoudoirVelvetTransitionSpec('light', 1320, 36, 1440, 900);
  assert.equal(lightSpec.mode, 'champagne-light');
  assert.equal(lightSpec.badgeText, '18+ SILK LOUNGE');
});

test('getHomeFeedSkeletonCounts returns balanced 3-column row counts', () => {
  assert.deepEqual(getHomeFeedSkeletonCounts(true), {
    trendingCount: 3,
    discoveryCount: 6,
  });
  assert.deepEqual(getHomeFeedSkeletonCounts(false), {
    trendingCount: 0,
    discoveryCount: 6,
  });
});
