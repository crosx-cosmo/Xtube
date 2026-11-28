import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_STORAGE_REGION,
  DEFAULT_THUMBNAIL_BUCKET,
  buildPublicThumbnailUrl,
  buildSignedS3Request,
  createThumbnailObjectKey,
  detectImageContentType,
  resolveObjectStorageConfig,
  sanitizeThumbnailObjectKey,
  validateStorageEndpointUrl,
} from './object-storage';

test('resolveObjectStorageConfig defaults to hey-lady bucket in ap-southeast-1', () => {
  const cfg = resolveObjectStorageConfig({});
  assert.equal(cfg.bucket, DEFAULT_THUMBNAIL_BUCKET);
  assert.equal(cfg.bucket, 'hey-lady');
  assert.equal(cfg.region, DEFAULT_STORAGE_REGION);
  assert.equal(cfg.region, 'ap-southeast-1');
  assert.equal(cfg.configured, false);
});

test('validateStorageEndpointUrl accepts Neon S3 endpoints and flags PostgREST Data API or private hosts', () => {
  const valid = validateStorageEndpointUrl(
    'https://br-steep-boat-123.storage.c-4.ap-southeast-1.aws.neon.tech/'
  );
  assert.equal(valid.valid, true);
  assert.equal(
    valid.normalized,
    'https://br-steep-boat-123.storage.c-4.ap-southeast-1.aws.neon.tech'
  );

  const dataApi = validateStorageEndpointUrl(
    'https://ep-steep-boat-b36pece5.apirest.c-4.ap-southeast-1.aws.neon.tech/neondb/rest/v1'
  );
  assert.equal(dataApi.valid, false);
  assert.match(dataApi.issue ?? '', /Data API/);

  const loopback = validateStorageEndpointUrl('https://127.0.0.1:9000');
  assert.equal(loopback.valid, false);

  const metadataIp = validateStorageEndpointUrl('https://169.254.169.254/latest');
  assert.equal(metadataIp.valid, false);
});

test('detectImageContentType verifies raster magic bytes and rejects SVG/HTML payloads', () => {
  const pngHeader = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
  assert.equal(detectImageContentType(pngHeader), 'image/png');

  const jpgHeader = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);
  assert.equal(detectImageContentType(jpgHeader), 'image/jpeg');

  const webpHeader = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]);
  assert.equal(detectImageContentType(webpHeader), 'image/webp');

  const svgPayload = new TextEncoder().encode('<svg onload="alert(1)"></svg>');
  assert.equal(detectImageContentType(svgPayload), null);
});

test('sanitizeThumbnailObjectKey allows strictly confined thumbnail and bg-images keys and blocks traversal', () => {
  const ok = sanitizeThumbnailObjectKey(['thumbnails', '2026', '11', 'abc123.webp']);
  assert.deepEqual(ok, {
    key: 'thumbnails/2026/11/abc123.webp',
    contentType: 'image/webp',
  });

  const bgOk = sanitizeThumbnailObjectKey(['bg-images', '1000294410.jpg']);
  assert.deepEqual(bgOk, {
    key: 'bg-images/1000294410.jpg',
    contentType: 'image/jpeg',
  });

  assert.equal(sanitizeThumbnailObjectKey(['thumbnails', '..', 'secret.jpg']), null);
  assert.equal(sanitizeThumbnailObjectKey(['bg-images', '..', 'secret.jpg']), null);
  assert.equal(sanitizeThumbnailObjectKey(['private', '2026', 'cover.jpg']), null);
  assert.equal(sanitizeThumbnailObjectKey(['thumbnails', '2026', 'evil.svg']), null);
  assert.equal(sanitizeThumbnailObjectKey(['thumbnails']), null);
});

test('buildSignedS3Request emits path-style hey-lady URL and AWS4-HMAC-SHA256 signature', () => {
  const cfg = resolveObjectStorageConfig({
    NEON_STORAGE_BUCKET: 'hey-lady',
    AWS_REGION: 'ap-southeast-1',
    AWS_ENDPOINT_URL_S3:
      'https://br-steep-boat-123.storage.c-4.ap-southeast-1.aws.neon.tech',
    AWS_ACCESS_KEY_ID: 'TESTACCESSKEY123456',
    AWS_SECRET_ACCESS_KEY: 'TESTSECRETKEY9876543210',
  });
  assert.equal(cfg.configured, true);

  const key = createThumbnailObjectKey('image/webp', new Date('2026-11-23T00:00:00Z'));
  assert.match(key, /^thumbnails\/2026\/11\/[a-f0-9]{32}\.webp$/);

  const signed = buildSignedS3Request({
    method: 'PUT',
    config: cfg,
    objectKey: key,
    body: new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
    contentType: 'image/webp',
    date: new Date('2026-11-23T10:00:00Z'),
  });

  assert.equal(
    signed.url,
    `https://br-steep-boat-123.storage.c-4.ap-southeast-1.aws.neon.tech/hey-lady/${key}`
  );
  assert.match(
    signed.headers.Authorization,
    /^AWS4-HMAC-SHA256 Credential=TESTACCESSKEY123456\/20261123\/ap-southeast-1\/s3\/aws4_request, SignedHeaders=.*Signature=[a-f0-9]{64}$/
  );
  assert.equal(signed.headers['x-amz-date'], '20261123T100000Z');

  // Private bucket uses safe same-origin proxy URL; public bucket uses direct endpoint URL
  assert.equal(buildPublicThumbnailUrl(key, cfg), `/api/thumbnails/${key}`);
  assert.equal(
    buildPublicThumbnailUrl(key, { ...cfg, publicRead: true }),
    `https://br-steep-boat-123.storage.c-4.ap-southeast-1.aws.neon.tech/hey-lady/${key}`
  );
});
