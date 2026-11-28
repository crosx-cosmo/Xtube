import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FLOATING_ADULT_STICKER_NODES,
  computeStickerParallaxOffset,
  normalizePointerCoordinates,
} from './adult-sticker-parallax';

test('normalizePointerCoordinates maps viewport center to (0, 0) and clamps edges to [-1, 1]', () => {
  assert.deepEqual(normalizePointerCoordinates(640, 400, 1280, 800), {
    nx: 0,
    ny: 0,
  });

  assert.deepEqual(normalizePointerCoordinates(0, 0, 1280, 800), {
    nx: -1,
    ny: -1,
  });

  assert.deepEqual(normalizePointerCoordinates(1280, 800, 1280, 800), {
    nx: 1,
    ny: 1,
  });

  // Out of bounds clamping
  assert.deepEqual(normalizePointerCoordinates(2000, -500, 1280, 800), {
    nx: 1,
    ny: -1,
  });

  // Invalid dimensions fallback
  assert.deepEqual(normalizePointerCoordinates(100, 100, 0, 800), {
    nx: 0,
    ny: 0,
  });
});

test('computeStickerParallaxOffset calculates smooth parallax x, y, and rotation from normalized mouse input', () => {
  const sampleNode = FLOATING_ADULT_STICKER_NODES[0];

  const center = computeStickerParallaxOffset(sampleNode, 0, 0, 16);
  assert.equal(center.xPx, 0);
  assert.equal(center.yPx, 0);
  assert.equal(center.rotateDeg, sampleNode.baseRotateDeg);

  const bottomRight = computeStickerParallaxOffset(sampleNode, 1, 1, 16);
  assert.equal(bottomRight.xPx, Number((sampleNode.depthRem * 16).toFixed(2)));
  assert.equal(
    bottomRight.yPx,
    Number((sampleNode.depthRem * 16 * 0.85).toFixed(2))
  );
  assert.equal(
    bottomRight.rotateDeg,
    sampleNode.baseRotateDeg + sampleNode.rotateSensitivityDeg
  );
});

test('FLOATING_ADULT_STICKER_NODES defines 6 unique adult-themed stickers across layout margins', () => {
  assert.equal(FLOATING_ADULT_STICKER_NODES.length, 6);
  const ids = new Set(FLOATING_ADULT_STICKER_NODES.map((n) => n.id));
  assert.equal(ids.size, 6);
  for (const node of FLOATING_ADULT_STICKER_NODES) {
    assert.ok(node.topPct >= 5 && node.topPct <= 95);
    assert.ok(node.leftPct >= 2 && node.leftPct <= 96);
  }
});
