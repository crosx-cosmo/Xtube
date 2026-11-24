import test from 'node:test';
import assert from 'node:assert/strict';
import { getExpectedAdminToken, isValidAdminToken } from './admin-auth';

test('isValidAdminToken validates matching HMAC tokens and rejects invalid candidates', () => {
  const expected = getExpectedAdminToken();
  assert.ok(expected.length === 64, 'HMAC-SHA256 hex token should be 64 characters');
  assert.equal(isValidAdminToken(expected, expected), true);
  assert.equal(isValidAdminToken(`  ${expected}  `, expected), true);
  assert.equal(isValidAdminToken('', expected), false);
  assert.equal(isValidAdminToken(null, expected), false);
  assert.equal(isValidAdminToken(undefined, expected), false);
  assert.equal(isValidAdminToken('wrong-token', expected), false);
  assert.equal(isValidAdminToken('0'.repeat(64), expected), false);
});
