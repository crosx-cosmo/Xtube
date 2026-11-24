import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { isNeonConfigured } from '@/lib/db';
import { mapApiError } from '@/lib/db-utils';
import {
  RATE_LIMIT_TIERS,
  enforceRateLimit,
  getPublicReadCacheControl,
  parseJsonBody,
  verifySameOriginMutation,
} from '@/lib/http-utils';
import { createVideo, getCategories, listVideos } from '@/lib/repository';
import { getOptionalViewerId } from '@/lib/viewer-session';
import type { AdminVideoLinkPayload } from '@/lib/types';

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, RATE_LIMIT_TIERS.PUBLIC_READ, 'videos-list');
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') ?? undefined;
    const search = searchParams.get('search')?.slice(0, 120) ?? undefined;
    const viewerId = await getOptionalViewerId();

    const [videos, categories] = await Promise.all([
      listVideos({ categorySlug: category, search, viewerId }),
      getCategories(),
    ]);

    return NextResponse.json(
      {
        videos,
        categories,
        databaseConfigured: isNeonConfigured(),
      },
      {
        headers: {
          'Cache-Control': getPublicReadCacheControl(Boolean(viewerId)),
        },
      }
    );
  } catch (error) {
    console.error('[GET /api/videos] Error:', error);
    const { status, message } = mapApiError(error, 'Unable to load videos.');
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  const originError = verifySameOriginMutation(request);
  if (originError) return originError;

  const limited = enforceRateLimit(request, RATE_LIMIT_TIERS.ADMIN_MUTATION, 'videos-create');
  if (limited) return limited;

  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin authorization required to add video links.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const parsed = await parseJsonBody<AdminVideoLinkPayload>(request, 4 * 1024 * 1024);
    if (parsed.errorResponse) return parsed.errorResponse;

    const result = await createVideo(parsed.data!);

    if (result.errors) {
      return NextResponse.json({ errors: result.errors }, { status: 400 });
    }

    if (result.video?.id) {
      revalidatePath('/');
      revalidatePath('/educators');
      revalidatePath('/sitemap.xml');
      revalidatePath(`/watch/${result.video.id}`);
    }

    return NextResponse.json(
      { video: result.video },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[POST /api/videos] Error:', error);
    const { status, message } = mapApiError(error, 'Unable to save video link.');
    return NextResponse.json({ error: message }, { status });
  }
}
