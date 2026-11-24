import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RTA_COMPLIANCE_CODE,
  isValidContentRating,
  resolveContentRating,
} from './content-rating';

test('resolveContentRating defaults safely to 18+ with RTA compliance metadata', () => {
  const fromUndefined = resolveContentRating(undefined);
  const fromNull = resolveContentRating(null);
  const fromUnknown = resolveContentRating('unknown-tier');

  for (const info of [fromUndefined, fromNull, fromUnknown]) {
    assert.equal(info.code, '18+');
    assert.equal(info.compactLabel, '18+');
    assert.equal(info.headerLabel, '18+ Adults Only');
    assert.equal(info.minAge, 18);
    assert.equal(info.rtaCode, RTA_COMPLIANCE_CODE);
    assert.match(info.ariaLabel, /18\+/);
  }
});

test('resolveContentRating normalizes case-insensitive aliases cleanly', () => {
  assert.equal(resolveContentRating('  rta-18+ ').code, 'RTA-18+');
  assert.equal(resolveContentRating('rta').compactLabel, '18+ RTA');
  assert.equal(resolveContentRating('21+').minAge, 21);
  assert.equal(resolveContentRating('21').code, '21+');
  assert.equal(resolveContentRating('mature').code, 'MATURE');
  assert.equal(resolveContentRating('nc-17').code, '18+');
  assert.equal(resolveContentRating('Adults   Only').code, '18+');
});

test('isValidContentRating validates supported adult rating strings accurately', () => {
  assert.equal(isValidContentRating('18+'), true);
  assert.equal(isValidContentRating('RTA-18+'), true);
  assert.equal(isValidContentRating('21+'), true);
  assert.equal(isValidContentRating('mature'), true);
  assert.equal(isValidContentRating(''), false);
  assert.equal(isValidContentRating(null), false);
  assert.equal(isValidContentRating('G'), false);
});
