import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeRippleRadius,
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
