import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import {
  DatabaseNotConfiguredError,
  DatabaseUnavailableError,
  isValidPostgresUrl,
} from './db-utils';

/**
 * Singleton Neon Serverless SQL client cache keyed by DATABASE_URL.
 * Uses Neon's HTTP fetch transport (zero idle TCP connections, ideal for Render
 * and serverless/edge environments).
 */
declare global {
  var _neonSqlClient: NeonQueryFunction<false, false> | undefined;
  var _neonSqlConnectionUrl: string | undefined;
}

export { DatabaseNotConfiguredError, DatabaseUnavailableError };

export function isNeonConfigured(): boolean {
  return isValidPostgresUrl(process.env.DATABASE_URL);
}

/**
 * Returns a cached @neondatabase/serverless SQL tagged-template executor.
 * Throws DatabaseNotConfiguredError when DATABASE_URL is missing or invalid.
 */
export function getNeonSql(): NeonQueryFunction<false, false> {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!isValidPostgresUrl(connectionString)) {
    throw new DatabaseNotConfiguredError();
  }

  if (
    !globalThis._neonSqlClient ||
    globalThis._neonSqlConnectionUrl !== connectionString
  ) {
    globalThis._neonSqlClient = neon(connectionString!);
    globalThis._neonSqlConnectionUrl = connectionString!;
  }

  return globalThis._neonSqlClient;
}

export const EXPECTED_TABLES_COUNT = 11;
export const EXPECTED_FUNCTIONS_COUNT = 8;

export async function checkDatabaseHealth(): Promise<{
  ok: boolean;
  database: 'connected' | 'unconfigured' | 'error';
  schemaReady: boolean;
  tablesPresent: number;
  tablesExpected: number;
  functionsPresent: number;
  functionsExpected: number;
  adminViewReady: boolean;
  indexesCount: number;
  latencyMs: number | null;
}> {
  if (!isNeonConfigured()) {
    return {
      ok: false,
      database: 'unconfigured',
      schemaReady: false,
      tablesPresent: 0,
      tablesExpected: EXPECTED_TABLES_COUNT,
      functionsPresent: 0,
      functionsExpected: EXPECTED_FUNCTIONS_COUNT,
      adminViewReady: false,
      indexesCount: 0,
      latencyMs: null,
    };
  }

  const startedAt = Date.now();
  try {
    const sql = getNeonSql();
    const rows = (await sql`
      SELECT
        (
          (to_regclass('users') IS NOT NULL)::int +
          (to_regclass('categories') IS NOT NULL)::int +
          (to_regclass('videos') IS NOT NULL)::int +
          (to_regclass('video_chapters') IS NOT NULL)::int +
          (to_regclass('comments') IS NOT NULL)::int +
          (to_regclass('comment_upvotes') IS NOT NULL)::int +
          (to_regclass('bookmarks') IS NOT NULL)::int +
          (to_regclass('video_likes') IS NOT NULL)::int +
          (to_regclass('creator_follows') IS NOT NULL)::int +
          (to_regclass('watch_history') IS NOT NULL)::int +
          (to_regclass('auth_sessions') IS NOT NULL)::int
        )::int AS tables_present,
        (
          SELECT COUNT(DISTINCT p.proname)::int
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = current_schema()
            AND p.proname IN (
              'kinship_toggle_video_like',
              'kinship_toggle_comment_upvote',
              'kinship_toggle_bookmark',
              'kinship_toggle_creator_follow',
              'kinship_delete_comment_tree',
              'kinship_cleanup_expired_sessions',
              'kinship_recalculate_counters',
              'kinship_promote_admin_by_email'
            )
        ) AS functions_present,
        (to_regclass('v_admin_catalog_stats') IS NOT NULL) AS admin_view_ready,
        (
          SELECT COUNT(*)::int
          FROM pg_indexes
          WHERE schemaname = current_schema()
            AND tablename IN (
              'users', 'categories', 'videos', 'video_chapters', 'comments',
              'comment_upvotes', 'bookmarks', 'video_likes', 'creator_follows',
              'watch_history', 'auth_sessions'
            )
        ) AS indexes_count
    `) as unknown as Array<{
      tables_present: number;
      functions_present: number;
      admin_view_ready: boolean;
      indexes_count: number;
    }>;

    const row = rows[0];
    const tablesPresent = Number(row?.tables_present ?? 0);
    const functionsPresent = Number(row?.functions_present ?? 0);
    const adminViewReady = Boolean(row?.admin_view_ready);
    const indexesCount = Number(row?.indexes_count ?? 0);

    return {
      ok: true,
      database: 'connected',
      schemaReady: tablesPresent === EXPECTED_TABLES_COUNT,
      tablesPresent,
      tablesExpected: EXPECTED_TABLES_COUNT,
      functionsPresent,
      functionsExpected: EXPECTED_FUNCTIONS_COUNT,
      adminViewReady,
      indexesCount,
      latencyMs: Date.now() - startedAt,
    };
  } catch (err) {
    console.error(
      '[DB Health] Connection check failed:',
      err instanceof Error ? err.message : 'Unknown error'
    );
    return {
      ok: false,
      database: 'error',
      schemaReady: false,
      tablesPresent: 0,
      tablesExpected: EXPECTED_TABLES_COUNT,
      functionsPresent: 0,
      functionsExpected: EXPECTED_FUNCTIONS_COUNT,
      adminViewReady: false,
      indexesCount: 0,
      latencyMs: Date.now() - startedAt,
    };
  }
}
