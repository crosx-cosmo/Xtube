import test from 'node:test';
import assert from 'node:assert/strict';
import { generateOrbParticles, projectOrbParticles } from './particle-orb';

test('generateOrbParticles creates deterministic shell, band, and halo layers', () => {
  const first = generateOrbParticles(200, 42);
  const second = generateOrbParticles(200, 42);

  assert.equal(first.length, 200);
  assert.deepEqual(first, second);

  const layers = new Set(first.map((p) => p.layer));
  assert.equal(layers.has('shell'), true);
  assert.equal(layers.has('band'), true);
  assert.equal(layers.has('halo'), true);
});

test('generateOrbParticles clamps extreme counts to safe performance bounds', () => {
  assert.equal(generateOrbParticles(5).length, 24);
  assert.equal(generateOrbParticles(99999).length, 1800);
});

test('projectOrbParticles sorts back-to-front and stays within valid canvas bounds', () => {
  const particles = generateOrbParticles(180);
  const size = 96;
  const projected = projectOrbParticles(particles, {
    size,
    angleY: 0.75,
    time: 1.5,
  });

  assert.equal(projected.length, 180);

  for (let i = 1; i < projected.length; i += 1) {
    assert.ok(projected[i].z >= projected[i - 1].z, 'particles must be sorted back-to-front');
  }

  for (const pt of projected) {
    assert.ok(Number.isFinite(pt.px) && pt.px >= -16 && pt.px <= size + 16);
    assert.ok(Number.isFinite(pt.py) && pt.py >= -16 && pt.py <= size + 16);
    assert.ok(pt.alpha >= 0.08 && pt.alpha <= 1);
    assert.ok(pt.radius > 0);
  }
});
