import { NextRequest, NextResponse } from 'next/server';
import {
  confirmAdminPasswordReset,
  requestAdminPasswordReset,
} from '@/lib/admin-auth';
import {
  RATE_LIMIT_TIERS,
  enforceRateLimit,
  parseJsonBody,
  verifySameOriginMutation,
} from '@/lib/http-utils';

function resolveTrustedAppOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();

  if (forwardedHost) {
    const proto = forwardedProto === 'http' || forwardedProto === 'https' ? forwardedProto : 'https';
    try {
      return new URL(`${proto}://${forwardedHost}`).origin;
    } catch {
      // Fall through to next candidate
    }
  }

  const configuredAppUrl = process.env.APP_URL?.trim();
  if (configuredAppUrl) {
    try {
      const parsed = new URL(configuredAppUrl);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed.origin;
      }
    } catch {
      // Fall through to next candidate
    }
  }

  const originHeader = request.headers.get('origin')?.trim();
  if (originHeader) {
    try {
      const parsed = new URL(originHeader);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed.origin;
      }
    } catch {
      // Fall through to request.nextUrl.origin
    }
  }

  return request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  const originError = verifySameOriginMutation(request);
  if (originError) return originError;

  const limited = enforceRateLimit(
    request,
    RATE_LIMIT_TIERS.AUTH_STRICT,
    'admin-reset-password'
  );
  if (limited) return limited;

  const parsed = await parseJsonBody<{
    action?: string;
    email?: string;
    otp?: string;
    token?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>(request, 8192);
  if (parsed.errorResponse) {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON request payload.' },
      { status: parsed.errorResponse.status }
    );
  }
  const body = parsed.data!;

  const action = typeof body.action === 'string' ? body.action.trim().toLowerCase() : '';
  const appOrigin = resolveTrustedAppOrigin(request);

  if (action === 'request') {
    const result = await requestAdminPasswordReset(
      { email: body.email },
      appOrigin
    );

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error || 'Unable to send password reset OTP email.',
          fieldErrors: result.fieldErrors,
        },
        { status: result.status }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        message: result.message,
      },
      { status: 200 }
    );
  }

  if (action === 'confirm') {
    const result = await confirmAdminPasswordReset(
      {
        email: body.email,
        otp: body.otp ?? body.token,
        newPassword: body.newPassword,
        confirmPassword: body.confirmPassword,
      },
      appOrigin
    );

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error || 'Unable to reset password.',
          fieldErrors: result.fieldErrors,
        },
        { status: result.status }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        message: result.message,
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { ok: false, error: 'Unsupported password reset action.' },
    { status: 400 }
  );
}
