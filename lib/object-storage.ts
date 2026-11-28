import crypto from 'node:crypto';

export const DEFAULT_THUMBNAIL_BUCKET = 'hey-lady';
export const DEFAULT_STORAGE_REGION = 'ap-southeast-1';
export const MAX_STORAGE_THUMBNAIL_BYTES = 5 * 1024 * 1024; // 5 MB

export type AllowedThumbnailMime =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/gif';

const MIME_TO_EXT: Record<AllowedThumbnailMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const EXT_TO_MIME: Record<string, AllowedThumbnailMime> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

export interface ObjectStorageConfig {
  configured: boolean;
  bucket: string;
  region: string;
  endpoint: string | null;
  accessKeyId: string | null;
  secretAccessKey: string | null;
  publicRead: boolean;
  publicBaseUrl: string | null;
  endpointIssue: string | null;
}

function isBlockedPrivateHost(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    lower === 'localhost' ||
    lower === '::1' ||
    lower === '0.0.0.0' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal')
  ) {
    return true;
  }
  const ipv4 = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const a = Number(ipv4[1]);
  const b = Number(ipv4[2]);
  if (a === 127 || a === 10 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

/**
 * Validates that an S3 endpoint URL is a safe public HTTPS storage endpoint
 * and detects accidental Neon PostgREST Data API (`*.apirest.*`) URLs.
 */
export function validateStorageEndpointUrl(
  rawUrl: string | null | undefined
): { valid: boolean; normalized: string | null; issue: string | null } {
  const trimmed = rawUrl?.trim() ?? '';
  if (!trimmed) {
    return { valid: false, normalized: null, issue: null };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      normalized: null,
      issue: 'AWS_ENDPOINT_URL_S3 must be a valid HTTPS URL.',
    };
  }

  if (parsed.protocol !== 'https:') {
    return {
      valid: false,
      normalized: null,
      issue: 'AWS_ENDPOINT_URL_S3 must use HTTPS.',
    };
  }

  if (isBlockedPrivateHost(parsed.hostname)) {
    return {
      valid: false,
      normalized: null,
      issue: 'AWS_ENDPOINT_URL_S3 cannot point to a private or loopback host.',
    };
  }

  if (
    parsed.hostname.includes('.apirest.') ||
    parsed.pathname.includes('/rest/v1')
  ) {
    return {
      valid: false,
      normalized: null,
      issue:
        'Detected a Neon Data API (PostgREST) URL instead of the Neon Object Storage S3 endpoint. Copy AWS_ENDPOINT_URL_S3 (https://<branch>.storage.<cell>.<region>.aws.neon.tech) from Neon Console -> Storage -> hey-lady.',
    };
  }

  const normalized = `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}`;
  return { valid: true, normalized, issue: null };
}

/**
 * Resolves Neon Object Storage S3 settings strictly from server-side environment variables.
 */
export function resolveObjectStorageConfig(
  env: Record<string, string | undefined> = process.env
): ObjectStorageConfig {
  const bucket =
    env.NEON_STORAGE_BUCKET?.trim() || DEFAULT_THUMBNAIL_BUCKET;
  const region =
    env.AWS_REGION?.trim() ||
    env.NEON_STORAGE_REGION?.trim() ||
    DEFAULT_STORAGE_REGION;
  const rawEndpoint =
    env.AWS_ENDPOINT_URL_S3?.trim() ||
    env.NEON_STORAGE_ENDPOINT?.trim() ||
    '';
  const accessKeyId =
    env.AWS_ACCESS_KEY_ID?.trim() ||
    env.NEON_STORAGE_ACCESS_KEY_ID?.trim() ||
    null;
  const secretAccessKey =
    env.AWS_SECRET_ACCESS_KEY?.trim() ||
    env.NEON_STORAGE_SECRET_ACCESS_KEY?.trim() ||
    null;
  const publicRead =
    (env.NEON_STORAGE_PUBLIC_READ?.trim().toLowerCase() ?? 'false') === 'true';

  const rawPublicBase = env.NEON_STORAGE_PUBLIC_BASE_URL?.trim() || '';
  const publicBaseValidation = rawPublicBase
    ? validateStorageEndpointUrl(rawPublicBase)
    : { valid: false, normalized: null, issue: null };

  const endpointValidation = validateStorageEndpointUrl(rawEndpoint);
  const configured = Boolean(
    endpointValidation.valid &&
      endpointValidation.normalized &&
      accessKeyId &&
      secretAccessKey &&
      /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)
  );

  return {
    configured,
    bucket,
    region,
    endpoint: endpointValidation.normalized,
    accessKeyId,
    secretAccessKey,
    publicRead,
    publicBaseUrl: publicBaseValidation.valid
      ? publicBaseValidation.normalized
      : null,
    endpointIssue: endpointValidation.issue,
  };
}

/**
 * Inspects binary magic bytes to strictly verify raster image formats
 * (JPEG, PNG, WebP, GIF) and reject SVG, HTML, or polyglot files.
 */
export function detectImageContentType(
  buffer: Uint8Array
): AllowedThumbnailMime | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // GIF: GIF87a or GIF89a
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return 'image/gif';
  }

  // WebP: RIFF....WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * Decodes a validated raster image base64 data URL into raw bytes and verified MIME type.
 */
export function decodeImageDataUrl(
  dataUrl: string
): { bytes: Buffer; contentType: AllowedThumbnailMime } | null {
  const match = dataUrl
    .trim()
    .match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) return null;

  const bytes = Buffer.from(match[2].replace(/\s+/g, ''), 'base64');
  if (bytes.length === 0 || bytes.length > MAX_STORAGE_THUMBNAIL_BYTES) {
    return null;
  }

  const detected = detectImageContentType(bytes);
  if (!detected) return null;

  return { bytes, contentType: detected };
}

/**
 * Generates a collision-free, strictly confined object key inside `thumbnails/`.
 */
export function createThumbnailObjectKey(
  contentType: AllowedThumbnailMime,
  now: Date = new Date()
): string {
  const ext = MIME_TO_EXT[contentType];
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const id = crypto.randomUUID().replace(/-/g, '');
  return `thumbnails/${year}/${month}/${id}.${ext}`;
}

export const ALLOWED_PUBLIC_OBJECT_PREFIXES = new Set([
  'thumbnails',
  'bg-images',
]);

export const STUDIO_GATE_BG_OBJECT_KEY = 'bg-images/1000294410.jpg';
export const STUDIO_GATE_BG_IMAGE_URL = `/api/thumbnails/${STUDIO_GATE_BG_OBJECT_KEY}`;

/**
 * Validates and normalizes incoming route segments for `/api/thumbnails/[...key]`.
 * Prevents path traversal and limits access strictly to raster images under `thumbnails/` or `bg-images/`.
 */
export function sanitizeThumbnailObjectKey(
  segments: readonly string[]
): { key: string; contentType: AllowedThumbnailMime } | null {
  if (!Array.isArray(segments) || segments.length < 2 || segments.length > 5) {
    return null;
  }

  const cleaned: string[] = [];
  for (const raw of segments) {
    const part = raw.trim();
    if (!part || part === '.' || part === '..' || part.includes('..')) {
      return null;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(part)) {
      return null;
    }
    cleaned.push(part);
  }

  if (!ALLOWED_PUBLIC_OBJECT_PREFIXES.has(cleaned[0])) {
    return null;
  }

  const filename = cleaned[cleaned.length - 1];
  const extMatch = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  if (!extMatch) return null;

  const contentType = EXT_TO_MIME[extMatch[1]];
  if (!contentType) return null;

  return {
    key: cleaned.join('/'),
    contentType,
  };
}

function sha256Hex(data: Uint8Array | string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function encodeRfc3986Segment(segment: string): string {
  return encodeURIComponent(segment).replace(
    /[!'()*]/g,
    (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

/**
 * Builds an S3 path-style URL (`https://<endpoint>/<bucket>/<key>`) as required by
 * Neon Object Storage and signs the request using AWS Signature Version 4.
 */
export function buildSignedS3Request(params: {
  method: 'GET' | 'PUT' | 'DELETE';
  config: ObjectStorageConfig;
  objectKey: string;
  body?: Uint8Array;
  contentType?: string;
  cacheControl?: string;
  date?: Date;
}): { url: string; headers: Record<string, string> } {
  const { method, config, objectKey, body, contentType, cacheControl } = params;
  if (!config.endpoint || !config.accessKeyId || !config.secretAccessKey) {
    throw new Error('Neon Object Storage credentials are not configured.');
  }

  const endpointUrl = new URL(config.endpoint);
  const basePath = endpointUrl.pathname.replace(/\/+$/, '');
  const keySegments = objectKey
    .replace(/^\/+/, '')
    .split('/')
    .map(encodeRfc3986Segment);
  const encodedBucket = encodeRfc3986Segment(config.bucket);
  const canonicalUri = `${basePath}/${encodedBucket}/${keySegments.join('/')}`;
  const fullUrl = `${endpointUrl.origin}${canonicalUri}`;

  const now = params.date ?? new Date();
  const isoCompact = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const amzDate = isoCompact.slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = body ? sha256Hex(body) : sha256Hex('');

  const signHeaders: Record<string, string> = {
    host: endpointUrl.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (contentType) {
    signHeaders['content-type'] = contentType;
  }
  if (cacheControl) {
    signHeaders['cache-control'] = cacheControl;
  }

  const sortedHeaderKeys = Object.keys(signHeaders).sort();
  const canonicalHeaders = sortedHeaderKeys
    .map((k) => `${k}:${signHeaders[k].trim()}\n`)
    .join('');
  const signedHeaders = sortedHeaderKeys.join(';');

  const canonicalRequest = [
    method,
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = hmacSha256(`AWS4${config.secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, config.region);
  const kService = hmacSha256(kRegion, 's3');
  const kSigning = hmacSha256(kService, 'aws4_request');
  const signature = crypto
    .createHmac('sha256', kSigning)
    .update(stringToSign, 'utf8')
    .digest('hex');

  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const requestHeaders: Record<string, string> = {
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    Authorization: authorization,
  };
  if (contentType) {
    requestHeaders['Content-Type'] = contentType;
  }
  if (cacheControl) {
    requestHeaders['Cache-Control'] = cacheControl;
  }

  return { url: fullUrl, headers: requestHeaders };
}

/**
 * Resolves the public URL saved in `videos.thumbnail_url` after uploading to `hey-lady`.
 * - Uses direct public bucket URL when `NEON_STORAGE_PUBLIC_BASE_URL` or `NEON_STORAGE_PUBLIC_READ=true` is enabled.
 * - Defaults to `/api/thumbnails/<key>` so private buckets still serve thumbnails reliably to public visitors.
 */
export function buildPublicThumbnailUrl(
  objectKey: string,
  config: ObjectStorageConfig
): string {
  const cleanKey = objectKey.replace(/^\/+/, '');
  if (config.publicBaseUrl) {
    return `${config.publicBaseUrl.replace(/\/+$/, '')}/${cleanKey}`;
  }
  if (config.publicRead && config.endpoint) {
    return `${config.endpoint.replace(/\/+$/, '')}/${encodeRfc3986Segment(config.bucket)}/${cleanKey}`;
  }
  return `/api/thumbnails/${cleanKey}`;
}

export async function uploadThumbnailToObjectStorage(params: {
  bytes: Buffer;
  contentType: AllowedThumbnailMime;
  config?: ObjectStorageConfig;
}): Promise<{
  url: string;
  key: string;
  bucket: string;
  byteSize: number;
  contentType: AllowedThumbnailMime;
}> {
  const config = params.config ?? resolveObjectStorageConfig();
  if (!config.configured) {
    throw new Error(
      config.endpointIssue ||
        `Neon Object Storage credentials are not configured for bucket "${config.bucket}".`
    );
  }

  const key = createThumbnailObjectKey(params.contentType);
  const cacheControl = 'public, max-age=31536000, immutable';
  const signed = buildSignedS3Request({
    method: 'PUT',
    config,
    objectKey: key,
    body: params.bytes,
    contentType: params.contentType,
    cacheControl,
  });

  const response = await fetch(signed.url, {
    method: 'PUT',
    headers: signed.headers,
    body: new Uint8Array(params.bytes),
  });

  if (!response.ok) {
    const errSnippet = (await response.text().catch(() => '')).slice(0, 240);
    throw new Error(
      `Object storage upload failed (${response.status}) for bucket "${config.bucket}": ${errSnippet || response.statusText}`
    );
  }

  return {
    url: buildPublicThumbnailUrl(key, config),
    key,
    bucket: config.bucket,
    byteSize: params.bytes.length,
    contentType: params.contentType,
  };
}

interface CachedStorageObject {
  body: ArrayBuffer;
  contentType: string | null;
  etag: string | null;
  expiresAt: number;
}

const OBJECT_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_CACHED_OBJECTS = 16;
const objectMemoryCache = new Map<string, CachedStorageObject>();

export async function fetchThumbnailFromObjectStorage(
  objectKey: string,
  config: ObjectStorageConfig = resolveObjectStorageConfig()
): Promise<{
  status: number;
  body: ArrayBuffer | null;
  contentType: string | null;
  etag: string | null;
}> {
  if (!config.configured) {
    return { status: 503, body: null, contentType: null, etag: null };
  }

  const cacheKey = `${config.bucket}:${objectKey}`;
  const cached = objectMemoryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      status: 200,
      body: cached.body,
      contentType: cached.contentType,
      etag: cached.etag,
    };
  }

  const signed = buildSignedS3Request({
    method: 'GET',
    config,
    objectKey,
  });

  const response = await fetch(signed.url, {
    method: 'GET',
    headers: signed.headers,
  });

  if (!response.ok) {
    return {
      status: response.status === 404 ? 404 : 502,
      body: null,
      contentType: null,
      etag: null,
    };
  }

  const body = await response.arrayBuffer();
  const contentType = response.headers.get('content-type');
  const etag = response.headers.get('etag');

  if (body.byteLength <= 10 * 1024 * 1024) {
    if (objectMemoryCache.size >= MAX_CACHED_OBJECTS) {
      const oldestKey = objectMemoryCache.keys().next().value;
      if (oldestKey) objectMemoryCache.delete(oldestKey);
    }
    objectMemoryCache.set(cacheKey, {
      body,
      contentType,
      etag,
      expiresAt: Date.now() + OBJECT_CACHE_TTL_MS,
    });
  }

  return {
    status: 200,
    body,
    contentType,
    etag,
  };
}
