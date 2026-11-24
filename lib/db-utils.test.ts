import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildIlikeSearchPattern,
  DatabaseNotConfiguredError,
  DatabaseUnavailableError,
  escapeLikePattern,
  isMissingSchemaError,
  isValidPostgresUrl,
  isValidViewerId,
  mapApiError,
} from './db-utils';
import { withNeonSchemaRecovery } from './neon-init';

test('isValidPostgresUrl accepts valid postgres/postgresql URLs and rejects invalid values', () => {
  assert.equal(
    isValidPostgresUrl('postgresql://user:pass@ep-cool-123.us-east-2.aws.neon.tech/neondb?sslmode=require'),
    true
  );
  assert.equal(isValidPostgresUrl('postgres://localhost:5432/kinship'), true);
  assert.equal(isValidPostgresUrl(''), false);
  assert.equal(isValidPostgresUrl(undefined), false);
  assert.equal(isValidPostgresUrl('mysql://localhost:3306/db'), false);
  assert.equal(isValidPostgresUrl('https://example.com'), false);
  assert.equal(isValidPostgresUrl('postgresql://'), false);
});

test('escapeLikePattern and buildIlikeSearchPattern neutralize SQL LIKE wildcards', () => {
  assert.equal(escapeLikePattern('100%_test\\path'), '100\\%\\_test\\\\path');
  assert.equal(buildIlikeSearchPattern('   '), null);
  assert.equal(buildIlikeSearchPattern('attachment 50%'), '%attachment 50\\%%');
});

test('isValidViewerId enforces strict anonymous viewer cookie format', () => {
  assert.equal(isValidViewerId('viewer-a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'), true);
  assert.equal(isValidViewerId('viewer-deadbeef'), true);
  assert.equal(isValidViewerId(''), false);
  assert.equal(isValidViewerId('00000000-0000-4000-8000-000000000001'), false);
  assert.equal(isValidViewerId("viewer-abc'; DROP TABLE users;--"), false);
});

test('mapApiError returns sanitized status codes without exposing raw internals', () => {
  const notConfigured = mapApiError(new DatabaseNotConfiguredError(), 'Fallback');
  assert.equal(notConfigured.status, 503);
  assert.match(notConfigured.message, /DATABASE_URL/);

  const unavailable = mapApiError(new DatabaseUnavailableError(), 'Fallback');
  assert.equal(unavailable.status, 503);

  const unknown = mapApiError(
    new Error('password authentication failed for postgres://secret@host'),
    'Unable to load videos.'
  );
  assert.equal(unknown.status, 500);
  assert.equal(unknown.message, 'Unable to load videos.');
});

test('isMissingSchemaError detects PostgreSQL 42P01/42703 and wrapped missing-relation errors', () => {
  assert.equal(isMissingSchemaError({ code: '42P01', message: 'relation "categories" does not exist' }), true);
  assert.equal(isMissingSchemaError({ code: '42703', message: 'column "likes" of relation "videos" does not exist' }), true);
  assert.equal(isMissingSchemaError(new Error('NeonDbError: relation "categories" does not exist')), true);
  assert.equal(
    isMissingSchemaError({ message: 'Query failed', sourceError: { code: '42P01' } }),
    true
  );
  assert.equal(isMissingSchemaError({ code: '23505', message: 'duplicate key value violates unique constraint' }), false);
  assert.equal(isMissingSchemaError(new Error('Connection timeout')), false);
  assert.equal(isMissingSchemaError(null), false);
});

test('withNeonSchemaRecovery re-bootstraps and retries once on missing relation error', async () => {
  let ensureCalls = 0;
  let recoverCalls = 0;
  let attempts = 0;

  const result = await withNeonSchemaRecovery(
    async () => {
      attempts += 1;
      if (attempts === 1) {
        const err = Object.assign(new Error('relation "categories" does not exist'), {
          code: '42P01',
        });
        throw err;
      }
      return ['recovered-row'];
    },
    {
      ensure: async () => {
        ensureCalls += 1;
      },
      recover: async () => {
        recoverCalls += 1;
      },
    }
  );

  assert.deepEqual(result, ['recovered-row']);
  assert.equal(ensureCalls, 1);
  assert.equal(recoverCalls, 1);
  assert.equal(attempts, 2);
});

test('withNeonSchemaRecovery does not retry unrelated database errors', async () => {
  let recoverCalls = 0;
  let attempts = 0;

  await assert.rejects(
    () =>
      withNeonSchemaRecovery(
        async () => {
          attempts += 1;
          throw Object.assign(new Error('duplicate key value'), { code: '23505' });
        },
        {
          ensure: async () => {},
          recover: async () => {
            recoverCalls += 1;
          },
        }
      ),
    /duplicate key value/
  );

  assert.equal(recoverCalls, 0);
  assert.equal(attempts, 1);
});
