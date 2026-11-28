import test from 'node:test';
import assert from 'node:assert/strict';
import { isConfiguredPrimaryAdminCredential } from './admin-auth';

test('isConfiguredPrimaryAdminCredential rejects authentication when server env vars are unconfigured', () => {
  assert.equal(
    isConfiguredPrimaryAdminCredential('admin@heylady.vip', 'AnyPassword123', {}),
    false
  );
  assert.equal(
    isConfiguredPrimaryAdminCredential('admin@heylady.vip', 'AnyPassword123', {
      ADMIN_EMAIL: 'admin@heylady.vip',
      ADMIN_PASSWORD: '',
      ADMIN_PASSCODE: '',
    }),
    false
  );
  assert.equal(
    isConfiguredPrimaryAdminCredential('admin@heylady.vip', 'AnyPassword123', {
      ADMIN_EMAIL: '',
      ADMIN_PASSWORD: 'AnyPassword123',
    }),
    false
  );
});

test('isConfiguredPrimaryAdminCredential validates matching server-configured ADMIN_EMAIL and ADMIN_PASSWORD/ADMIN_PASSCODE', () => {
  const mockEnv = {
    ADMIN_EMAIL: 'studio-owner@heylady.vip',
    ADMIN_PASSWORD: 'TestOnlyEnvPassword!2026',
    ADMIN_PASSCODE: 'TestOnlyEnvPasscode!2026',
  };

  assert.equal(
    isConfiguredPrimaryAdminCredential(
      'studio-owner@heylady.vip',
      'TestOnlyEnvPassword!2026',
      mockEnv
    ),
    true
  );
  assert.equal(
    isConfiguredPrimaryAdminCredential(
      '  STUDIO-OWNER@HEYLADY.VIP ',
      'TestOnlyEnvPasscode!2026',
      mockEnv
    ),
    true
  );
  assert.equal(
    isConfiguredPrimaryAdminCredential(
      'studio-owner@heylady.vip',
      'WrongPassword123',
      mockEnv
    ),
    false
  );
  assert.equal(
    isConfiguredPrimaryAdminCredential(
      'unknown@example.com',
      'TestOnlyEnvPassword!2026',
      mockEnv
    ),
    false
  );
  assert.equal(isConfiguredPrimaryAdminCredential('', '', mockEnv), false);
});

