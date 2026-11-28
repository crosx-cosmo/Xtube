import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBustKinematics,
  generateOrbParticles,
  projectOrbParticles,
} from './particle-orb';

test('generateOrbParticles creates deterministic twin-bust shell, band, and halo layers with left/right lobes', () => {
  const first = generateOrbParticles(200, 42);
  const second = generateOrbParticles(200, 42);

  assert.equal(first.length, 200);
  assert.deepEqual(first, second);

  const layers = new Set(first.map((p) => p.layer));
  assert.equal(layers.has('shell'), true);
  assert.equal(layers.has('band'), true);
  assert.equal(layers.has('halo'), true);

  const sides = new Set(first.map((p) => p.side));
  assert.equal(sides.has('left'), true);
  assert.equal(sides.has('right'), true);
  assert.equal(sides.has('center'), true);
});

test('generateOrbParticles clamps extreme counts to safe performance bounds', () => {
  assert.equal(generateOrbParticles(5).length, 24);
  assert.equal(generateOrbParticles(99999).length, 1800);
});

test('computeBustKinematics produces counter-phase vertical bounce and volume-conserving jiggle deformation', () => {
  const k0 = computeBustKinematics({ time: 0.25, boost: 1, impulse: 0 });
  const kBoosted = computeBustKinematics({ time: 0.25, boost: 1.8, impulse: 1.2 });

  assert.ok(Number.isFinite(k0.leftOffsetY));
  assert.ok(Number.isFinite(k0.rightOffsetY));
  assert.notEqual(
    k0.leftOffsetY,
    k0.rightOffsetY,
    'left and right bust lobes should have counter-phase jiggle offset'
  );
  assert.ok(
    Math.abs(kBoosted.leftOffsetY) > Math.abs(k0.leftOffsetY),
    'hover/click impulse should amplify twerk/jiggle bounce amplitude'
  );
  // Squash & stretch volume conservation: when scaleX > 1, scaleY < 1
  if (k0.leftScaleX > 1) {
    assert.ok(k0.leftScaleY < 1);
  } else if (k0.leftScaleX < 1) {
    assert.ok(k0.leftScaleY > 1);
  }
});

test('projectOrbParticles sorts back-to-front and stays within valid canvas bounds', () => {
  const particles = generateOrbParticles(180);
  const size = 96;
  const projected = projectOrbParticles(particles, {
    size,
    angleY: 0.75,
    time: 1.5,
    boost: 1.4,
    impulse: 0.5,
  });

  assert.equal(projected.length, 180);

  for (let i = 1; i < projected.length; i += 1) {
    assert.ok(projected[i].z >= projected[i - 1].z, 'particles must be sorted back-to-front');
  }

  for (const pt of projected) {
    assert.ok(Number.isFinite(pt.px) && pt.px >= -24 && pt.px <= size + 24);
    assert.ok(Number.isFinite(pt.py) && pt.py >= -24 && pt.py <= size + 24);
    assert.ok(pt.alpha >= 0.08 && pt.alpha <= 1);
    assert.ok(pt.radius > 0);
  }
});
