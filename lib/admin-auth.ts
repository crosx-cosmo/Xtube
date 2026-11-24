import crypto from 'node:crypto';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { getNeonSql, isNeonConfigured } from './db';
import {
  withNeonSchemaRecovery,
  withOptionalNeonRead,
} from './neon-init';
import type { AuthProviderKind, AuthUser } from './types';
import {
  USER_SESSION_TTL_SECONDS,
  generateSessionToken,
  generateUsernameSlug,
  getNeonAuthBaseUrl,
  hashSessionToken,
  isNeonAuthServiceConfigured,
  normalizeEmail,
  validatePasswordResetOtpConfirmInput,
  validatePasswordResetRequestInput,
  validateSignInInput,
  verifyPassword,
} from './user-auth-utils';

export const ADMIN_COOKIE_NAME = 'kinship_admin_session';
export const ADMIN_TOKEN_HEADER = 'x-admin-token';
export const ADMIN_SESSION_TTL_SECONDS = USER_SESSION_TTL_SECONDS; // 30 days

interface RawAdminUserRow {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar_url: string | null;
  is_educator: boolean;
  is_admin: boolean;
  password_hash?: string | null;
  created_at: string | Date;
}

function toIso(val: string | Date): string {
  return val instanceof Date ? val.toISOString() : new Date(val).toISOString();
}

function mapAdminUserRow(row: RawAdminUserRow): AuthUser {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    avatarUrl: row.avatar_url,
    isEducator: Boolean(row.is_educator),
    isAdmin: Boolean(row.is_admin),
    createdAt: toIso(row.created_at),
  };
}

function getConfiguredPasscode(): string {
  const configured = process.env.ADMIN_PASSCODE?.trim();
  return configured && configured.length > 0 ? configured : 'kinship-admin-2026';
}

function createSessionToken(passcode: string): string {
  return crypto
    .createHmac('sha256', passcode)
    .update('kinship-admin-v1-session')
    .digest('hex');
}

export function getExpectedAdminToken(): string {
  return createSessionToken(getConfiguredPasscode());
}

export function isValidAdminToken(
  candidate: string | null | undefined,
  expected: string = getExpectedAdminToken()
): boolean {
  if (!candidate) return false;
  const trimmed = candidate.trim();
  if (!trimmed) return false;
  const a = Buffer.from(trimmed, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function getActiveAdminAuthProvider(): AuthProviderKind {
  if (isNeonAuthServiceConfigured()) return 'neon-auth';
  if (isNeonConfigured()) return 'neon-postgres';
  return 'unconfigured';
}

async function createAdminSession(userId: string): Promise<string> {
  return withNeonSchemaRecovery(async () => {
    const rawToken = generateSessionToken();
    const tokenHash = hashSessionToken(rawToken);
    const sessionId = `asess-${crypto.randomUUID().slice(0, 12)}`;
    const expiresAtDate = new Date(Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000);

    const sql = getNeonSql();
    await sql`
      INSERT INTO auth_sessions (id, user_id, token_hash, expires_at)
      VALUES (${sessionId}, ${userId}, ${tokenHash}, ${expiresAtDate.toISOString()})
    `;
    return rawToken;
  });
}

async function upsertSyncedNeonAdminUser(params: {
  neonAuthId?: string | null;
  name: string;
  email: string;
  avatarUrl?: string | null;
}): Promise<AuthUser> {
  return withNeonSchemaRecovery(async () => {
    const email = normalizeEmail(params.email);
    const displayName = params.name.trim() || email.split('@')[0] || 'Admin';

    const sql = getNeonSql();
    const existing = (await sql`
      SELECT id, name, username, email, avatar_url, is_educator, is_admin, created_at
      FROM users
      WHERE LOWER(email) = LOWER(${email})
         OR (${params.neonAuthId ?? null}::text IS NOT NULL AND neon_auth_id = ${params.neonAuthId ?? null})
      LIMIT 1
    `) as unknown as RawAdminUserRow[];

    if (existing.length > 0) {
      const row = existing[0];
      await sql`
        UPDATE users
        SET neon_auth_id = COALESCE(neon_auth_id, ${params.neonAuthId ?? null}),
            is_admin = TRUE,
            name = CASE WHEN char_length(trim(name)) = 0 THEN ${displayName} ELSE name END
        WHERE id = ${row.id}
      `;
      return {
        ...mapAdminUserRow(row),
        isAdmin: true,
      };
    }

    const shortId = crypto.randomUUID().slice(0, 8);
    const userId = `adm-${shortId}`;
    const baseSlug = generateUsernameSlug(displayName, email);
    const slugCollision = await sql`
      SELECT id FROM users WHERE LOWER(username) = LOWER(${baseSlug}) LIMIT 1
    `;
    const username =
      slugCollision.length > 0 ? `${baseSlug}-${shortId.slice(0, 4)}` : baseSlug;
    const now = new Date().toISOString();

    await sql`
      INSERT INTO users (id, name, username, email, avatar_url, bio, credentials, is_educator, is_admin, followers_count, neon_auth_id, created_at)
      VALUES (${userId}, ${displayName}, ${username}, ${email}, ${params.avatarUrl ?? null}, '', '', FALSE, TRUE, 0, ${params.neonAuthId ?? null}, ${now})
    `;

    return {
      id: userId,
      name: displayName,
      username,
      email,
      avatarUrl: params.avatarUrl ?? null,
      isEducator: false,
      isAdmin: true,
      createdAt: now,
    };
  });
}

async function postToNeonBetterAuth(
  endpointUrl: string,
  payload: Record<string, unknown>,
  originHeader?: string
): Promise<{
  ok: boolean;
  status: number;
  user?: { id?: string; name?: string; email?: string; image?: string | null };
  error?: string;
}> {
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (originHeader) {
    reqHeaders.Origin = originHeader;
    reqHeaders.Referer = `${originHeader}/`;
  }

  const res = await fetch(endpointUrl, {
    method: 'POST',
    headers: reqHeaders,
    body: JSON.stringify(payload),
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });

  const data = (await res.json().catch(() => ({}))) as {
    user?: { id?: string; name?: string; email?: string; image?: string | null };
    message?: string;
    code?: string;
    error?: string | { message?: string };
  };

  if (!res.ok) {
    const msg =
      (typeof data.message === 'string' && data.message) ||
      (typeof data.error === 'string' && data.error) ||
      (typeof data.error === 'object' && data.error?.message) ||
      (res.status === 401
        ? 'Invalid admin email or password.'
        : 'Authentication request failed.');
    return { ok: false, status: res.status, error: msg };
  }

  return { ok: true, status: res.status, user: data.user };
}

async function postToNeonBetterAuthWithOriginRetry(
  endpointPath: string,
  payload: Record<string, unknown>,
  requestOrigin?: string
): Promise<{
  ok: boolean;
  status: number;
  user?: { id?: string; name?: string; email?: string; image?: string | null };
  error?: string;
}> {
  const baseUrl = getNeonAuthBaseUrl();
  if (!baseUrl) {
    return { ok: false, status: 500, error: 'Neon Auth base URL is not configured.' };
  }

  const normalizedPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  const endpointUrl = `${baseUrl}${normalizedPath}`;
  const neonSelfOrigin = new URL(baseUrl).origin;

  const candidateOrigins: Array<string | undefined> = [
    neonSelfOrigin,
    undefined,
    requestOrigin && requestOrigin !== neonSelfOrigin ? requestOrigin : undefined,
    process.env.APP_URL?.trim() || undefined,
    'http://localhost:3000',
  ];

  const tried = new Set<string>();
  let lastResult: {
    ok: boolean;
    status: number;
    user?: { id?: string; name?: string; email?: string; image?: string | null };
    error?: string;
  } = { ok: false, status: 500, error: 'Unable to reach Neon Auth service.' };

  for (const candidate of candidateOrigins) {
    const key = candidate ?? '__none__';
    if (tried.has(key)) continue;
    tried.add(key);

    const attempt = await postToNeonBetterAuth(endpointUrl, payload, candidate);
    lastResult = attempt;

    if (attempt.ok) {
      return attempt;
    }

    const isOriginRejection =
      attempt.status === 403 &&
      typeof attempt.error === 'string' &&
      /origin/i.test(attempt.error);

    if (!isOriginRejection) {
      return attempt;
    }
  }

  return lastResult;
}

async function callManagedNeonAuthSignIn(
  payload: { email: string; password: string },
  requestOrigin?: string
) {
  return postToNeonBetterAuthWithOriginRetry('/sign-in/email', payload, requestOrigin);
}

export async function requestAdminPasswordReset(
  input: { email?: string },
  appOrigin?: string
): Promise<{
  ok: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  status: number;
}> {
  const validation = validatePasswordResetRequestInput(input);
  if (!validation.valid) {
    return {
      ok: false,
      error: Object.values(validation.errors)[0] || 'Enter a valid administrator email address.',
      fieldErrors: validation.errors,
      status: 400,
    };
  }

  if (!isNeonAuthServiceConfigured()) {
    return {
      ok: false,
      error:
        'Password reset OTP emails require Neon Better Auth (NEON_AUTH_BASE_URL) to be configured.',
      status: 400,
    };
  }

  const email = validation.normalized.email;

  try {
    let neonRes = await postToNeonBetterAuthWithOriginRetry(
      '/email-otp/send-verification-otp',
      { email, type: 'forget-password' },
      appOrigin
    );

    if (!neonRes.ok && neonRes.status === 404) {
      neonRes = await postToNeonBetterAuthWithOriginRetry(
        '/email-otp/request-password-reset',
        { email },
        appOrigin
      );
    }

    if (!neonRes.ok && neonRes.status === 404) {
      neonRes = await postToNeonBetterAuthWithOriginRetry(
        '/forget-password/email-otp',
        { email },
        appOrigin
      );
    }

    if (!neonRes.ok) {
      const errMsg =
        neonRes.status === 404
          ? 'Email OTP password reset is not enabled on your Neon Auth server. Enable Email OTP in Neon Auth settings.'
          : neonRes.error ||
            'Could not send password reset OTP email. Check your Neon Better Auth email settings.';

      return {
        ok: false,
        error: errMsg,
        status: neonRes.status >= 400 && neonRes.status < 600 ? neonRes.status : 400,
      };
    }

    return {
      ok: true,
      message:
        'A 6-digit password reset OTP code has been sent to your email. Check your inbox and spam folder.',
      status: 200,
    };
  } catch (error) {
    console.error('[AdminAuth] Password reset OTP request error:', error);
    return {
      ok: false,
      error: 'Could not reach Neon Auth service. Verify NEON_AUTH_BASE_URL in your environment.',
      status: 502,
    };
  }
}

export async function confirmAdminPasswordReset(
  input: {
    email?: string;
    otp?: string;
    newPassword?: string;
    confirmPassword?: string;
  },
  requestOrigin?: string
): Promise<{
  ok: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  status: number;
}> {
  const validation = validatePasswordResetOtpConfirmInput(input);
  if (!validation.valid) {
    return {
      ok: false,
      error: Object.values(validation.errors)[0] || 'Check your email, OTP code, and new password.',
      fieldErrors: validation.errors,
      status: 400,
    };
  }

  if (!isNeonAuthServiceConfigured()) {
    return {
      ok: false,
      error:
        'Password reset requires Neon Better Auth (NEON_AUTH_BASE_URL) to be configured.',
      status: 400,
    };
  }

  const { email, otp, newPassword } = validation.normalized;

  try {
    let neonRes = await postToNeonBetterAuthWithOriginRetry(
      '/email-otp/reset-password',
      {
        email,
        otp,
        password: newPassword,
      },
      requestOrigin
    );

    if (
      !neonRes.ok &&
      neonRes.status === 400 &&
      typeof neonRes.error === 'string' &&
      /newPassword/i.test(neonRes.error)
    ) {
      neonRes = await postToNeonBetterAuthWithOriginRetry(
        '/email-otp/reset-password',
        {
          email,
          otp,
          newPassword,
        },
        requestOrigin
      );
    }

    if (!neonRes.ok) {
      const normalizedErr =
        neonRes.error && /invalid|expired|otp|code|too_many/i.test(neonRes.error)
          ? 'This OTP code is invalid or has expired. Request a fresh OTP code and try again.'
          : neonRes.error || 'Unable to reset password. Please request a new OTP code.';

      return {
        ok: false,
        error: normalizedErr,
        status: neonRes.status === 401 || neonRes.status === 400 ? 400 : neonRes.status,
      };
    }

    return {
      ok: true,
      message: 'Your admin password has been updated. Sign in with your new password.',
      status: 200,
    };
  } catch (error) {
    console.error('[AdminAuth] Password reset OTP confirmation error:', error);
    return {
      ok: false,
      error: 'Could not reach Neon Auth service. Verify NEON_AUTH_BASE_URL in your environment.',
      status: 502,
    };
  }
}

export async function signInAdminWithEmailPassword(
  input: { email?: string; password?: string },
  requestOrigin?: string
): Promise<{
  admin?: AuthUser;
  token?: string;
  provider?: AuthProviderKind;
  error?: string;
  fieldErrors?: Record<string, string>;
  status?: number;
}> {
  const validation = validateSignInInput(input);
  if (!validation.valid) {
    return {
      error: Object.values(validation.errors)[0] || 'Enter your admin email and password.',
      fieldErrors: validation.errors,
      status: 400,
    };
  }

  if (!isNeonConfigured()) {
    return {
      error:
        'Database connection is not configured. Set DATABASE_URL in your server environment.',
      status: 503,
    };
  }

  const email = validation.normalized.email;
  const password = validation.normalized.password;

  // Path 1: Managed Neon Auth (Better Auth) when NEON_AUTH_BASE_URL is configured
  if (isNeonAuthServiceConfigured()) {
    try {
      const neonRes = await callManagedNeonAuthSignIn({ email, password }, requestOrigin);
      if (!neonRes.ok) {
        return {
          error: neonRes.error || 'Invalid admin email or password.',
          status:
            neonRes.status === 401 || neonRes.status === 400
              ? 401
              : neonRes.status,
        };
      }

      const syncedAdmin = await upsertSyncedNeonAdminUser({
        neonAuthId: neonRes.user?.id ?? null,
        name: neonRes.user?.name || email.split('@')[0] || 'Admin',
        email: neonRes.user?.email || email,
        avatarUrl: neonRes.user?.image ?? null,
      });

      const token = await createAdminSession(syncedAdmin.id);
      return { admin: syncedAdmin, token, provider: 'neon-auth' };
    } catch (error) {
      console.error('[AdminAuth] Managed Neon Auth sign-in error:', error);
      return {
        error:
          'Could not reach Neon Auth or PostgreSQL. Verify DATABASE_URL and NEON_AUTH_BASE_URL.',
        status: 502,
      };
    }
  }

  // Path 2: Direct Neon PostgreSQL authentication
  const rows = await withNeonSchemaRecovery(async () => {
    const sql = getNeonSql();
    return (await sql`
      SELECT id, name, username, email, avatar_url, is_educator, is_admin, password_hash, created_at
      FROM users
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `) as unknown as RawAdminUserRow[];
  });

  const row = rows[0];
  if (!row || !verifyPassword(password, row.password_hash)) {
    return {
      error: 'Invalid admin email or password.',
      status: 401,
    };
  }

  if (!row.is_admin) {
    return {
      error: 'This account does not have administrator access.',
      status: 403,
    };
  }

  const admin = mapAdminUserRow(row);
  const token = await createAdminSession(admin.id);
  return { admin, token, provider: 'neon-postgres' };
}

async function readIncomingAdminToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const fromCookie = cookieStore.get(ADMIN_COOKIE_NAME)?.value?.trim();
    if (fromCookie) return fromCookie;

    const headerStore = await headers();
    const fromCustomHeader = headerStore.get(ADMIN_TOKEN_HEADER)?.trim();
    if (fromCustomHeader) return fromCustomHeader;

    const authHeader = headerStore.get('authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      const bearer = authHeader.slice(7).trim();
      if (bearer) return bearer;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Per-request memoized admin session lookup via React cache().
 * Queries Neon PostgreSQL auth_sessions strictly — zero local-memory fallback.
 */
export const getCurrentAdminUser = cache(async (): Promise<AuthUser | null> => {
  const rawToken = await readIncomingAdminToken();
  if (!rawToken) return null;

  return withOptionalNeonRead<AuthUser | null>(null, async () => {
    const tokenHash = hashSessionToken(rawToken);
    const sql = getNeonSql();
    const rows = (await sql`
      SELECT
        u.id,
        u.name,
        u.username,
        u.email,
        u.avatar_url,
        u.is_educator,
        u.is_admin,
        u.created_at
      FROM auth_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ${tokenHash}
        AND u.is_admin = TRUE
        AND s.expires_at > NOW()
      LIMIT 1
    `) as unknown as RawAdminUserRow[];

    if (rows.length === 0) return null;
    return mapAdminUserRow(rows[0]);
  });
});

export async function isAdminAuthenticated(): Promise<boolean> {
  const admin = await getCurrentAdminUser();
  return Boolean(admin);
}

export async function revokeCurrentAdminSession(): Promise<void> {
  const rawToken = await readIncomingAdminToken();
  if (!rawToken) return;

  await withOptionalNeonRead(undefined, async () => {
    const tokenHash = hashSessionToken(rawToken);
    const sql = getNeonSql();
    await sql`DELETE FROM auth_sessions WHERE token_hash = ${tokenHash}`;
  });
}
