import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { mapApiError } from '@/lib/db-utils';
import {
  RATE_LIMIT_TIERS,
  enforceRateLimit,
  getPublicReadCacheControl,
  parseJsonBody,
  verifySameOriginMutation,
} from '@/lib/http-utils';
import { deleteVideo, getVideoDetail, updateVideo } from '@/lib/repository';
import { getOptionalViewerId } from '@/lib/viewer-session';
import type { AdminVideoLinkPayload } from '@/lib/types';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const limited = enforceRateLimit(request, RATE_LIMIT_TIERS.PUBLIC_READ, 'video-detail');
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const viewerId = await getOptionalViewerId();
    const detail = await getVideoDetail(id, false, viewerId);
    if (!detail) {
      return NextResponse.json({ error: 'Video not found.' }, { status: 404 });
    }
    return NextResponse.json(
      { video: detail },
      {
        headers: {
          'Cache-Control': getPublicReadCacheControl(Boolean(viewerId)),
        },
      }
    );
  } catch (error) {
    console.error('[GET /api/videos/[id]] Error:', error);
    const { status, message } = mapApiError(error, 'Unable to load video.');
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const originError = verifySameOriginMutation(request);
  if (originError) return originError;

  const limited = enforceRateLimit(request, RATE_LIMIT_TIERS.ADMIN_MUTATION, 'video-update');
  if (limited) return limited;

  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin authorization required to edit video links.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { id } = await context.params;
    const parsed = await parseJsonBody<AdminVideoLinkPayload>(request, 4 * 1024 * 1024);
    if (parsed.errorResponse) return parsed.errorResponse;

    const result = await updateVideo(id, parsed.data!);

    if (result.notFound) {
      return NextResponse.json({ error: 'Video not found.' }, { status: 404 });
    }
    if (result.errors) {
      return NextResponse.json({ errors: result.errors }, { status: 400 });
    }

    revalidatePath('/');
    revalidatePath('/educators');
    revalidatePath('/sitemap.xml');
    revalidatePath(`/watch/${id}`);

    return NextResponse.json(
      { video: result.video },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[PATCH /api/videos/[id]] Error:', error);
    const { status, message } = mapApiError(error, 'Unable to update video link.');
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const originError = verifySameOriginMutation(request);
  if (originError) return originError;

  const limited = enforceRateLimit(request, RATE_LIMIT_TIERS.ADMIN_MUTATION, 'video-delete');
  if (limited) return limited;

  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin authorization required to delete video links.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { id } = await context.params;
    const deleted = await deleteVideo(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Video not found.' }, { status: 404 });
    }

    revalidatePath('/');
    revalidatePath('/educators');
    revalidatePath('/sitemap.xml');
    revalidatePath(`/watch/${id}`);

    return NextResponse.json(
      { deleted: true, id },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[DELETE /api/videos/[id]] Error:', error);
    const { status, message } = mapApiError(error, 'Unable to delete video link.');
    return NextResponse.json({ error: message }, { status });
  }
}
