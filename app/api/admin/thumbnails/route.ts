import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import {
  RATE_LIMIT_TIERS,
  enforceRateLimit,
  parseJsonBody,
  verifySameOriginMutation,
} from '@/lib/http-utils';
import {
  MAX_STORAGE_THUMBNAIL_BYTES,
  decodeImageDataUrl,
  detectImageContentType,
  resolveObjectStorageConfig,
  uploadThumbnailToObjectStorage,
} from '@/lib/object-storage';

export const dynamic = 'force-dynamic';

/**
 * Returns non-secret Neon Object Storage status for Admin Studio.
 */
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(
    request,
    RATE_LIMIT_TIERS.PUBLIC_READ,
    'admin-thumbnails-status'
  );
  if (limited) return limited;

  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) {
    return NextResponse.json(
      { error: 'Admin authorization required.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const config = resolveObjectStorageConfig();
  return NextResponse.json(
    {
      configured: config.configured,
      bucket: config.bucket,
      region: config.region,
      publicMode: Boolean(config.publicRead || config.publicBaseUrl),
      endpointIssue: config.endpointIssue,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

/**
 * Uploads an admin-submitted cover thumbnail directly into the `hey-lady`
 * Neon Object Storage bucket using server-side AWS SigV4 signing.
 * Supports either multipart FormData (`file`) or JSON (`{ dataUrl }`).
 */
export async function POST(request: NextRequest) {
  const originError = verifySameOriginMutation(request);
  if (originError) return originError;

  const limited = enforceRateLimit(
    request,
    RATE_LIMIT_TIERS.ADMIN_MUTATION,
    'admin-thumbnails-upload'
  );
  if (limited) return limited;

  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin authorization required to upload thumbnails.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const config = resolveObjectStorageConfig();
    if (!config.configured) {
      return NextResponse.json(
        {
          configured: false,
          bucket: config.bucket,
          storage: 'inline-fallback',
          message:
            config.endpointIssue ||
            `Object storage S3 credentials are not configured yet for bucket "${config.bucket}". Using optimized inline thumbnail fallback.`,
        },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    let bytes: Buffer | null = null;
    let detectedType: ReturnType<typeof detectImageContentType> = null;

    const reqContentType = request.headers.get('content-type') ?? '';
    if (reqContentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: 'Missing image file in upload request.' },
          { status: 400, headers: { 'Cache-Control': 'no-store' } }
        );
      }
      if (file.size <= 0 || file.size > MAX_STORAGE_THUMBNAIL_BYTES) {
        return NextResponse.json(
          { error: 'Thumbnail must be between 1 byte and 5 MB.' },
          { status: 400, headers: { 'Cache-Control': 'no-store' } }
        );
      }
      bytes = Buffer.from(await file.arrayBuffer());
      detectedType = detectImageContentType(bytes);
    } else {
      const parsed = await parseJsonBody<{ dataUrl?: string }>(
        request,
        8 * 1024 * 1024
      );
      if (parsed.errorResponse) return parsed.errorResponse;
      const body = parsed.data;
      if (!body?.dataUrl || typeof body.dataUrl !== 'string') {
        return NextResponse.json(
          { error: 'Missing thumbnail image payload.' },
          { status: 400, headers: { 'Cache-Control': 'no-store' } }
        );
      }
      const decoded = decodeImageDataUrl(body.dataUrl);
      if (!decoded) {
        return NextResponse.json(
          {
            error:
              'Invalid image format or file too large. Upload a PNG, JPG, WebP, or GIF under 5 MB.',
          },
          { status: 400, headers: { 'Cache-Control': 'no-store' } }
        );
      }
      bytes = decoded.bytes;
      detectedType = decoded.contentType;
    }

    if (!bytes || !detectedType) {
      return NextResponse.json(
        {
          error:
            'Unsupported or corrupted image. Only PNG, JPG, WebP, and GIF files are allowed.',
        },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const uploaded = await uploadThumbnailToObjectStorage({
      bytes,
      contentType: detectedType,
      config,
    });

    return NextResponse.json(
      {
        configured: true,
        storage: 'object-storage',
        url: uploaded.url,
        key: uploaded.key,
        bucket: uploaded.bucket,
        byteSize: uploaded.byteSize,
        contentType: uploaded.contentType,
      },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[POST /api/admin/thumbnails] Upload error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to upload thumbnail to object storage.',
      },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
