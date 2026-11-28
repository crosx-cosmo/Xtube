import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AGE_VERIFICATION_TTL_MS,
  parseAgeVerificationRecord,
  serializeAgeVerificationRecord,
} from './age-verification';

test('parseAgeVerificationRecord returns false for null, empty, or malformed values', () => {
  assert.equal(parseAgeVerificationRecord(null), false);
  assert.equal(parseAgeVerificationRecord(undefined), false);
  assert.equal(parseAgeVerificationRecord(''), false);
  assert.equal(parseAgeVerificationRecord('false'), false);
  assert.equal(parseAgeVerificationRecord('{not-json'), false);
  assert.equal(parseAgeVerificationRecord(JSON.stringify({ verified: false })), false);
});

test('serializeAgeVerificationRecord and parseAgeVerificationRecord round-trip and enforce TTL expiry', () => {
  const now = 1_700_000_000_000;
  const serialized = serializeAgeVerificationRecord(now, AGE_VERIFICATION_TTL_MS);

  // Valid within TTL window
  assert.equal(parseAgeVerificationRecord(serialized, now + 1000), true);

  // Expired after TTL window
  assert.equal(
    parseAgeVerificationRecord(serialized, now + AGE_VERIFICATION_TTL_MS + 1),
    false
  );
});

test('parseAgeVerificationRecord accepts simple legacy boolean strings', () => {
  assert.equal(parseAgeVerificationRecord('true'), true);
  assert.equal(parseAgeVerificationRecord('1'), true);
});
