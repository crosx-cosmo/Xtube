import { NextRequest, NextResponse } from 'next/server';
import { mapApiError } from '@/lib/db-utils';
import {
  RATE_LIMIT_TIERS,
  enforceRateLimit,
  isSecureRequest,
  parseJsonBody,
  verifySameOriginMutation,
} from '@/lib/http-utils';
import { addComment } from '@/lib/repository';
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

  const limited = enforceRateLimit(request, RATE_LIMIT_TIERS.WRITE_MUTATION, 'video-comment');
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const parsed = await parseJsonBody<{
      content?: string;
      isAnonymous?: boolean;
      parentId?: string | null;
    }>(request, 16_384);
    if (parsed.errorResponse) return parsed.errorResponse;
    const body = parsed.data!;

    const { viewerId, isNew } = await resolveOrCreateViewerId();
    const result = await addComment({
      videoId: id,
      viewerId,
      content: typeof body.content === 'string' ? body.content : '',
      isAnonymous: Boolean(body.isAnonymous),
      parentId: typeof body.parentId === 'string' ? body.parentId : null,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const response = NextResponse.json(
      { comment: result.comment },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    );
    if (isNew) {
      attachViewerCookie(response, viewerId, isSecureRequest(request));
    }
    return response;
  } catch (error) {
    console.error('[POST /api/videos/[id]/comments] Error:', error);
    const { status, message } = mapApiError(error, 'Unable to post comment.');
    return NextResponse.json({ error: message }, { status });
  }
}
