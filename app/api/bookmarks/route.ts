import { NextRequest, NextResponse } from 'next/server';
import { mapApiError } from '@/lib/db-utils';
import {
  RATE_LIMIT_TIERS,
  enforceRateLimit,
  isSecureRequest,
  parseJsonBody,
  verifySameOriginMutation,
} from '@/lib/http-utils';
import {
  clearWatchHistory,
  getUserLibrary,
  recordWatchHistory,
  toggleBookmark,
} from '@/lib/repository';
import {
  attachViewerCookie,
  getOptionalViewerId,
  resolveOrCreateViewerId,
} from '@/lib/viewer-session';

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, RATE_LIMIT_TIERS.PUBLIC_READ, 'library-read');
  if (limited) return limited;

  try {
    const viewerId = await getOptionalViewerId();
    const library = await getUserLibrary(viewerId);
    return NextResponse.json(library, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[GET /api/bookmarks] Error:', error);
    const { status, message } = mapApiError(error, 'Unable to load library.');
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  const originError = verifySameOriginMutation(request);
  if (originError) return originError;

  const limited = enforceRateLimit(request, RATE_LIMIT_TIERS.WRITE_MUTATION, 'bookmark-toggle');
  if (limited) return limited;

  try {
    const parsed = await parseJsonBody<{ videoId?: string }>(request, 4096);
    if (parsed.errorResponse) return parsed.errorResponse;
    const videoId = typeof parsed.data?.videoId === 'string' ? parsed.data.videoId.trim() : '';
    if (!videoId || videoId.length > 64) {
      return NextResponse.json({ error: 'Valid videoId is required.' }, { status: 400 });
    }
    const { viewerId, isNew } = await resolveOrCreateViewerId();
    const result = await toggleBookmark(videoId, viewerId);
    const response = NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
    if (isNew) {
      attachViewerCookie(response, viewerId, isSecureRequest(request));
    }
    return response;
  } catch (error) {
    console.error('[POST /api/bookmarks] Error:', error);
    const { status, message } = mapApiError(error, 'Unable to update bookmark.');
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest) {
  const originError = verifySameOriginMutation(request);
  if (originError) return originError;

  const limited = enforceRateLimit(request, RATE_LIMIT_TIERS.WRITE_MUTATION, 'history-record');
  if (limited) return limited;

  try {
    const parsed = await parseJsonBody<{
      videoId?: string;
      progressSeconds?: number;
    }>(request, 4096);
    if (parsed.errorResponse) return parsed.errorResponse;
    const videoId = typeof parsed.data?.videoId === 'string' ? parsed.data.videoId.trim() : '';
    if (!videoId || videoId.length > 64) {
      return NextResponse.json({ error: 'Valid videoId is required.' }, { status: 400 });
    }
    const progress =
      typeof parsed.data?.progressSeconds === 'number' &&
      Number.isFinite(parsed.data.progressSeconds)
        ? Math.min(86_400, Math.max(0, parsed.data.progressSeconds))
        : 0;
    const { viewerId, isNew } = await resolveOrCreateViewerId();
    await recordWatchHistory(videoId, progress, viewerId);
    const response = NextResponse.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store' } }
    );
    if (isNew) {
      attachViewerCookie(response, viewerId, isSecureRequest(request));
    }
    return response;
  } catch (error) {
    console.error('[PUT /api/bookmarks] Error:', error);
    const { status, message } = mapApiError(error, 'Unable to update watch history.');
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  const originError = verifySameOriginMutation(request);
  if (originError) return originError;

  const limited = enforceRateLimit(request, RATE_LIMIT_TIERS.WRITE_MUTATION, 'history-clear');
  if (limited) return limited;

  try {
    const viewerId = await getOptionalViewerId();
    if (viewerId) {
      await clearWatchHistory(viewerId);
    }
    return NextResponse.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[DELETE /api/bookmarks] Error:', error);
    const { status, message } = mapApiError(error, 'Unable to clear watch history.');
    return NextResponse.json({ error: message }, { status });
  }
}
