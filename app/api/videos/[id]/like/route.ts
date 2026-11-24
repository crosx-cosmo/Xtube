import { NextRequest, NextResponse } from 'next/server';
import { mapApiError } from '@/lib/db-utils';
import {
  RATE_LIMIT_TIERS,
  enforceRateLimit,
  isSecureRequest,
  verifySameOriginMutation,
} from '@/lib/http-utils';
import { toggleVideoLike } from '@/lib/repository';
import {
  attachViewerCookie,
  resolveOrCreateViewerId,
} from '@/lib/viewer-session';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const originError = verifySameOriginMutation(request);
  if (originError) return originError;

  const limited = enforceRateLimit(request, RATE_LIMIT_TIERS.WRITE_MUTATION, 'video-like');
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const { viewerId, isNew } = await resolveOrCreateViewerId();
    const result = await toggleVideoLike(id, viewerId);
    if (!result) {
      return NextResponse.json({ error: 'Video not found.' }, { status: 404 });
    }
    const response = NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
    if (isNew) {
      attachViewerCookie(response, viewerId, isSecureRequest(request));
    }
    return response;
  } catch (error) {
    console.error('[POST /api/videos/[id]/like] Error:', error);
    const { status, message } = mapApiError(error, 'Unable to update like.');
    return NextResponse.json({ error: message }, { status });
  }
}
