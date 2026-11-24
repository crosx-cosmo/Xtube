import { NextRequest, NextResponse } from 'next/server';
import { mapApiError } from '@/lib/db-utils';
import {
  RATE_LIMIT_TIERS,
  enforceRateLimit,
  getPublicReadCacheControl,
  isSecureRequest,
  verifySameOriginMutation,
} from '@/lib/http-utils';
import { getCreatorProfile, toggleFollowCreator } from '@/lib/repository';
import {
  attachViewerCookie,
  getOptionalViewerId,
  resolveOrCreateViewerId,
} from '@/lib/viewer-session';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  const limited = enforceRateLimit(request, RATE_LIMIT_TIERS.PUBLIC_READ, 'creator-profile');
  if (limited) return limited;

  try {
    const { username } = await context.params;
    const viewerId = await getOptionalViewerId();
    const profile = await getCreatorProfile(username);
    if (!profile) {
      return NextResponse.json({ error: 'Creator not found.' }, { status: 404 });
    }
    return NextResponse.json(profile, {
      headers: {
        'Cache-Control': getPublicReadCacheControl(Boolean(viewerId)),
      },
    });
  } catch (error) {
    console.error('[GET /api/creators/[username]] Error:', error);
    const { status, message } = mapApiError(
      error,
      'Unable to load creator profile.'
    );
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  const originError = verifySameOriginMutation(request);
  if (originError) return originError;

  const limited = enforceRateLimit(request, RATE_LIMIT_TIERS.WRITE_MUTATION, 'creator-follow');
  if (limited) return limited;

  try {
    const { username } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { creatorId?: string };

    let targetId = typeof body?.creatorId === 'string' ? body.creatorId.trim() : '';
    if (!targetId) {
      const profile = await getCreatorProfile(username);
      if (!profile) {
        return NextResponse.json({ error: 'Creator not found.' }, { status: 404 });
      }
      targetId = profile.creator.id;
    }

    const { viewerId, isNew } = await resolveOrCreateViewerId();
    const result = await toggleFollowCreator(targetId, viewerId);
    if (!result) {
      return NextResponse.json({ error: 'Creator not found.' }, { status: 404 });
    }

    const response = NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
    if (isNew) {
      attachViewerCookie(response, viewerId, isSecureRequest(request));
    }
    return response;
  } catch (error) {
    console.error('[POST /api/creators/[username]] Error:', error);
    const { status, message } = mapApiError(
      error,
      'Unable to update follow status.'
    );
    return NextResponse.json({ error: message }, { status });
  }
}
