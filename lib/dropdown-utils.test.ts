import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findSelectedOptionIndex,
  getNextDropdownIndex,
} from './dropdown-utils';

test('getNextDropdownIndex wraps around with ArrowDown and ArrowUp', () => {
  assert.equal(getNextDropdownIndex(0, 'ArrowDown', 3), 1);
  assert.equal(getNextDropdownIndex(2, 'ArrowDown', 3), 0);
  assert.equal(getNextDropdownIndex(0, 'ArrowUp', 3), 2);
  assert.equal(getNextDropdownIndex(1, 'ArrowUp', 3), 0);
});

test('getNextDropdownIndex handles Home, End, empty lists, and out-of-range indices', () => {
  assert.equal(getNextDropdownIndex(2, 'Home', 4), 0);
  assert.equal(getNextDropdownIndex(0, 'End', 4), 3);
  assert.equal(getNextDropdownIndex(-1, 'ArrowDown', 3), 1);
  assert.equal(getNextDropdownIndex(99, 'ArrowUp', 3), 2);
  assert.equal(getNextDropdownIndex(0, 'ArrowDown', 0), -1);
});

test('findSelectedOptionIndex locates active value and falls back safely', () => {
  const options = [
    { value: 'recommended', label: 'Recommended' },
    { value: 'most-viewed', label: 'Most Viewed' },
    { value: 'newest', label: 'Newest First' },
  ] as const;

  assert.equal(findSelectedOptionIndex(options, 'most-viewed'), 1);
  assert.equal(findSelectedOptionIndex(options, 'newest'), 2);
  assert.equal(
    findSelectedOptionIndex(options, 'unknown' as (typeof options)[number]['value']),
    0
  );
  assert.equal(findSelectedOptionIndex([], 'recommended'), -1);
});
