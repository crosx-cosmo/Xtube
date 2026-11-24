import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_TTL_SECONDS,
  getActiveAdminAuthProvider,
  getCurrentAdminUser,
  revokeCurrentAdminSession,
  signInAdminWithEmailPassword,
} from '@/lib/admin-auth';
import { isNeonConfigured } from '@/lib/db';
import {
  RATE_LIMIT_TIERS,
  enforceRateLimit,
  isSecureRequest,
  parseJsonBody,
  verifySameOriginMutation,
} from '@/lib/http-utils';
import { isNeonAuthServiceConfigured } from '@/lib/user-auth-utils';

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, RATE_LIMIT_TIERS.PUBLIC_READ, 'admin-auth-status');
  if (limited) return limited;

  try {
    const admin = await getCurrentAdminUser();
    return NextResponse.json(
      {
        authenticated: Boolean(admin),
        admin,
        provider: getActiveAdminAuthProvider(),
        neonConfigured: isNeonConfigured(),
        neonAuthManaged: isNeonAuthServiceConfigured(),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[GET /api/admin/auth] Error:', error);
    return NextResponse.json(
      {
        authenticated: false,
        admin: null,
        provider: getActiveAdminAuthProvider(),
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function POST(request: NextRequest) {
  const originError = verifySameOriginMutation(request);
  if (originError) return originError;

  const limited = enforceRateLimit(request, RATE_LIMIT_TIERS.AUTH_STRICT, 'admin-login');
  if (limited) return limited;

  try {
    const parsed = await parseJsonBody<{
      email?: string;
      password?: string;
    }>(request, 8192);
    if (parsed.errorResponse) return parsed.errorResponse;
    const body = parsed.data!;

    const requestOrigin = request.headers.get('origin') || request.nextUrl.origin;

    const result = await signInAdminWithEmailPassword(
      {
        email: body.email,
        password: body.password,
      },
      requestOrigin
    );

    if (result.error || !result.admin || !result.token) {
      return NextResponse.json(
        {
          error: result.error || 'Invalid admin email or password.',
          fieldErrors: result.fieldErrors,
        },
        {
          status: result.status ?? 401,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }

    const secure = isSecureRequest(request);
    const response = NextResponse.json(
      {
        authenticated: true,
        token: result.token,
        admin: result.admin,
        provider: result.provider,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );

    response.cookies.set(ADMIN_COOKIE_NAME, result.token, {
      httpOnly: true,
      sameSite: secure ? 'none' : 'lax',
      secure,
      partitioned: secure,
      path: '/',
      maxAge: ADMIN_SESSION_TTL_SECONDS,
    });

    return response;
  } catch (error) {
    console.error('[POST /api/admin/auth] Error:', error);
    return NextResponse.json(
      { error: 'Unable to verify admin credentials.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const originError = verifySameOriginMutation(request);
  if (originError) return originError;

  try {
    await revokeCurrentAdminSession();
  } catch (error) {
    console.error('[DELETE /api/admin/auth] Error:', error);
  }

  const secure = isSecureRequest(request);
  const response = NextResponse.json(
    { authenticated: false, admin: null },
    { headers: { 'Cache-Control': 'no-store' } }
  );
  response.cookies.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: secure ? 'none' : 'lax',
    secure,
    partitioned: secure,
    path: '/',
    maxAge: 0,
  });
  return response;
}
