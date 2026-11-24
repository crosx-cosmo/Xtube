import { NextRequest, NextResponse } from 'next/server';
import {
  fetchThumbnailFromObjectStorage,
  sanitizeThumbnailObjectKey,
} from '@/lib/object-storage';

export const dynamic = 'force-dynamic';

/**
 * Public read-only proxy for thumbnails stored in the `hey-lady` Neon Object
 * Storage bucket. Keeps S3 credentials strictly server-side so visitors on public
 * pages can always view thumbnails even when the bucket access level is `private`.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key: rawSegments } = await context.params;
    const sanitized = sanitizeThumbnailObjectKey(rawSegments);
    if (!sanitized) {
      return NextResponse.json(
        { error: 'Invalid thumbnail path.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const fetched = await fetchThumbnailFromObjectStorage(sanitized.key);
    if (fetched.status !== 200 || !fetched.body) {
      return NextResponse.json(
        { error: 'Thumbnail not found.' },
        {
          status: fetched.status === 404 ? 404 : 503,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': sanitized.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
      'Cross-Origin-Resource-Policy': 'cross-origin',
    };
    if (fetched.etag) {
      headers.ETag = fetched.etag;
    }

    return new NextResponse(fetched.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('[GET /api/thumbnails] Error:', error);
    return NextResponse.json(
      { error: 'Unable to load thumbnail.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
