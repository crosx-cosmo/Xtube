import { NextRequest, NextResponse } from 'next/server';
import { mapApiError } from '@/lib/db-utils';
import {
  PRIVATE_NO_STORE_CACHE_CONTROL,
  RATE_LIMIT_TIERS,
  enforceRateLimit,
  isSecureRequest,
  parseJsonBody,
  verifySameOriginMutation,
} from '@/lib/http-utils';
import { getVideoReactions, toggleVideoReaction } from '@/lib/repository';
import { isValidVideoReactionType } from '@/lib/video-reactions';
import {
  attachViewerCookie,
  getOptionalViewerId,
  resolveOrCreateViewerId,
} from '@/lib/viewer-session';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const limited = enforceRateLimit(
    request,
    RATE_LIMIT_TIERS.PUBLIC_READ,
    'video-reactions-get'
  );
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const viewerId = await getOptionalViewerId();
    const state = await getVideoReactions(id, viewerId);
    return NextResponse.json(
      { videoId: id, ...state },
      { headers: { 'Cache-Control': PRIVATE_NO_STORE_CACHE_CONTROL } }
    );
  } catch (error) {
    console.error('[GET /api/videos/[id]/reactions] Error:', error);
    const { status, message } = mapApiError(
      error,
      'Unable to load video reactions.'
    );
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const originError = verifySameOriginMutation(request);
  if (originError) return originError;

  const limited = enforceRateLimit(
    request,
    RATE_LIMIT_TIERS.WRITE_MUTATION,
    'video-reactions-post'
  );
  if (limited) return limited;

  const { data: body, errorResponse } = await parseJsonBody<{
    reactionType?: unknown;
  }>(request, 4096);
  if (errorResponse) return errorResponse;

  const reactionType = body?.reactionType;
  if (!isValidVideoReactionType(reactionType)) {
    return NextResponse.json(
      { error: 'Invalid emoji reaction type.' },
      {
        status: 400,
        headers: { 'Cache-Control': PRIVATE_NO_STORE_CACHE_CONTROL },
      }
    );
  }

  try {
    const { id } = await context.params;
    const { viewerId, isNew } = await resolveOrCreateViewerId();
    const result = await toggleVideoReaction(id, viewerId, reactionType);
    if (!result) {
      return NextResponse.json(
        { error: 'Video not found.' },
        {
          status: 404,
          headers: { 'Cache-Control': PRIVATE_NO_STORE_CACHE_CONTROL },
        }
      );
    }

    const response = NextResponse.json(result, {
      headers: { 'Cache-Control': PRIVATE_NO_STORE_CACHE_CONTROL },
    });
    if (isNew) {
      attachViewerCookie(response, viewerId, isSecureRequest(request));
    }
    return response;
  } catch (error) {
    console.error('[POST /api/videos/[id]/reactions] Error:', error);
    const { status, message } = mapApiError(
      error,
      'Unable to update emoji reaction.'
    );
    return NextResponse.json({ error: message }, { status });
  }
}
