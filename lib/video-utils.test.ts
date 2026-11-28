import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCommentTree,
  buildShareLinks,
  combineHmsToSeconds,
  extractSourceHost,
  formatDuration,
  formatViews,
  getActiveChapterIndex,
  getInitials,
  isValidExternalVideoUrl,
  isValidThumbnailUrl,
  parseTimestampToSeconds,
  slugifyCategory,
  sortChapters,
  splitDurationToHms,
  validateCategoryPayload,
  validateUploadPayload,
} from './video-utils';
import type { CommentItem } from './types';

test('formatDuration formats seconds into MM:SS and H:MM:SS accurately', () => {
  assert.equal(formatDuration(0), '0:00');
  assert.equal(formatDuration(80), '1:20');
  assert.equal(formatDuration(605), '10:05');
  assert.equal(formatDuration(3725), '1:02:05');
  assert.equal(formatDuration(-12), '0:00');
});

test('parseTimestampToSeconds parses valid timestamps and rejects malformed ones', () => {
  assert.equal(parseTimestampToSeconds('00:00'), 0);
  assert.equal(parseTimestampToSeconds('01:20'), 80);
  assert.equal(parseTimestampToSeconds('1:02:05'), 3725);
  assert.equal(parseTimestampToSeconds('01:60'), null);
  assert.equal(parseTimestampToSeconds('abc'), null);
  assert.equal(parseTimestampToSeconds(''), null);
});

test('isValidExternalVideoUrl and extractSourceHost allow safe http(s) links and reject unsafe schemes', () => {
  assert.equal(isValidExternalVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), true);
  assert.equal(isValidExternalVideoUrl('http://vimeo.com/123456'), true);
  assert.equal(isValidExternalVideoUrl('javascript:alert(1)'), false);
  assert.equal(isValidExternalVideoUrl('data:text/html,hi'), false);
  assert.equal(isValidExternalVideoUrl('http://127.0.0.1:3000/admin'), false);
  assert.equal(isValidExternalVideoUrl('http://169.254.169.254/latest/meta-data'), false);
  assert.equal(isValidExternalVideoUrl('http://192.168.1.1/video.mp4'), false);
  assert.equal(isValidExternalVideoUrl('http://internal.service.local/stream'), false);
  assert.equal(isValidExternalVideoUrl('https://user:pass@vimeo.com/123456'), false);
  assert.equal(isValidExternalVideoUrl('/local/file.mp4'), false);
  assert.equal(isValidExternalVideoUrl(''), false);

  assert.equal(extractSourceHost('https://www.youtube.com/watch?v=abc'), 'youtube.com');
  assert.equal(extractSourceHost('https://ted.com/talks/sample'), 'ted.com');
  assert.equal(extractSourceHost('not-a-url'), 'external source');

  assert.equal(isValidThumbnailUrl('/images/thumb_conflict_repair_1795107900131.jpg'), true);
  assert.equal(isValidThumbnailUrl('/api/thumbnails/thumbnails/2026/11/abc123.webp'), true);
  assert.equal(isValidThumbnailUrl('/api/thumbnails/thumbnails/../secret.jpg'), false);
  assert.equal(isValidThumbnailUrl('/api/thumbnails/other/abc123.jpg'), false);
  assert.equal(isValidThumbnailUrl('/api/thumbnails/thumbnails/2026/11/xss.svg'), false);
  assert.equal(isValidThumbnailUrl('https://images.example.com/thumb.jpg'), true);
  assert.equal(
    isValidThumbnailUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='),
    true
  );
  assert.equal(isValidThumbnailUrl('data:image/jpeg;base64,/9j/4AAQSkZJRg=='), true);
  assert.equal(isValidThumbnailUrl('data:image/webp;base64,UklGRh4AAABXRUJQ'), true);
  assert.equal(isValidThumbnailUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='), false);
  assert.equal(isValidThumbnailUrl('data:text/html;base64,PGgxPkJhZDwvaDE+'), false);
  assert.equal(isValidThumbnailUrl('javascript:void(0)'), false);
});

test('splitDurationToHms and combineHmsToSeconds round-trip hours, minutes, and seconds', () => {
  assert.deepEqual(splitDurationToHms(0), { hours: 0, minutes: 0, seconds: 0 });
  assert.deepEqual(splitDurationToHms(725), { hours: 0, minutes: 12, seconds: 5 });
  assert.deepEqual(splitDurationToHms(5110), { hours: 1, minutes: 25, seconds: 10 });
  assert.deepEqual(splitDurationToHms(-50), { hours: 0, minutes: 0, seconds: 0 });

  assert.equal(combineHmsToSeconds(0, 12, 5), 725);
  assert.equal(combineHmsToSeconds(1, 25, 10), 5110);
  assert.equal(combineHmsToSeconds(-1, 2, 30), 150);
  assert.equal(formatDuration(combineHmsToSeconds(1, 25, 10)), '1:25:10');
});

test('formatViews formats compact view counts cleanly', () => {
  assert.equal(formatViews(842), '842');
  assert.equal(formatViews(14200), '14.2K');
  assert.equal(formatViews(10000), '10K');
  assert.equal(formatViews(1250000), '1.3M');
});

test('sortChapters and getActiveChapterIndex track playback accurately', () => {
  const chapters = [
    { timestampSeconds: 240, title: 'Repair' },
    { timestampSeconds: 0, title: 'Intro' },
    { timestampSeconds: 95, title: 'Triggers' },
  ];
  const sorted = sortChapters(chapters);
  assert.deepEqual(
    sorted.map((c) => c.timestampSeconds),
    [0, 95, 240]
  );

  assert.equal(getActiveChapterIndex(sorted, 0), 0);
  assert.equal(getActiveChapterIndex(sorted, 94), 0);
  assert.equal(getActiveChapterIndex(sorted, 95), 1);
  assert.equal(getActiveChapterIndex(sorted, 300), 2);
  assert.equal(getActiveChapterIndex([], 10), -1);
});

test('buildCommentTree nests replies under parents and sorts top-level by upvotes', () => {
  const author = {
    id: 'u1',
    name: 'Dr. Clara Lindholm',
    username: 'clara-lindholm',
    avatarUrl: null,
    isEducator: true,
  };

  const comments: CommentItem[] = [
    {
      id: 'c1',
      videoId: 'v1',
      userId: 'u1',
      parentId: null,
      content: 'Lower upvoted root',
      isAnonymous: false,
      upvotes: 2,
      createdAt: '2026-10-01T10:00:00Z',
      author,
    },
    {
      id: 'c2',
      videoId: 'v1',
      userId: 'u1',
      parentId: null,
      content: 'Higher upvoted root',
      isAnonymous: true,
      upvotes: 14,
      createdAt: '2026-10-01T09:00:00Z',
      author,
    },
    {
      id: 'c3',
      videoId: 'v1',
      userId: 'u1',
      parentId: 'c2',
      content: 'Second reply',
      isAnonymous: false,
      upvotes: 1,
      createdAt: '2026-10-01T12:00:00Z',
      author,
    },
    {
      id: 'c4',
      videoId: 'v1',
      userId: 'u1',
      parentId: 'c2',
      content: 'First reply',
      isAnonymous: false,
      upvotes: 0,
      createdAt: '2026-10-01T11:00:00Z',
      author,
    },
  ];

  const tree = buildCommentTree(comments);
  assert.equal(tree.length, 2);
  assert.equal(tree[0].id, 'c2');
  assert.equal(tree[0].replies.length, 2);
  assert.equal(tree[0].replies[0].id, 'c4');
  assert.equal(tree[0].replies[1].id, 'c3');
});

test('validateUploadPayload validates external source links, rejects invalid payloads, and sorts chapters', () => {
  const invalid = validateUploadPayload({
    title: 'Hi',
    description: 'Too short',
    categoryId: '',
    videoUrl: 'javascript:alert(1)',
    thumbnailUrl: '',
    durationSeconds: 300,
    reflectionPrompt: 'Short',
    chapters: [{ timestamp: '99:99', title: 'Bad' }],
  });

  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.title);
  assert.ok(invalid.errors.description);
  assert.ok(invalid.errors.categoryId);
  assert.ok(invalid.errors.videoUrl);
  assert.ok(invalid.errors.thumbnailUrl);
  assert.ok(invalid.errors.reflectionPrompt);
  assert.ok(invalid.errors.chapters);

  const valid = validateUploadPayload({
    title: 'De-escalating Conflict in High-Stress Moments',
    description:
      'A clinical guide to recognizing physiological flooding and taking structured repair pauses.',
    categoryId: 'cat-conflict',
    videoUrl: 'https://www.youtube.com/watch?v=example123',
    thumbnailUrl: '/images/thumb_conflict_repair_1795107900131.jpg',
    durationSeconds: 720,
    reflectionPrompt: 'When do you first notice tension rising in your body during a disagreement?',
    chapters: [
      { timestamp: '03:15', title: 'The 20-Minute Reset' },
      { timestamp: '00:45', title: 'Recognizing Flooding' },
    ],
  });

  assert.equal(valid.valid, true);
  assert.deepEqual(valid.parsedChapters, [
    { timestampSeconds: 45, title: 'Recognizing Flooding' },
    { timestampSeconds: 195, title: 'The 20-Minute Reset' },
  ]);

  const textBasedValid = validateUploadPayload({
    title: 'Mindful Listening Foundations for Partners',
    description:
      'Practical exercises for staying present and reflective during difficult conversations.',
    categoryName: 'Mindful Listening',
    educatorName: 'Dr. Maya Patel',
    videoUrl: 'https://www.youtube.com/watch?v=mindful123',
    thumbnailUrl: 'data:image/webp;base64,UklGRh4AAABXRUJQ',
    durationSeconds: combineHmsToSeconds(1, 15, 30),
    reflectionPrompt: 'What helps you pause before reacting defensively in a tough talk?',
    chapters: [{ timestamp: '00:00', title: 'Introduction' }],
  });
  assert.equal(textBasedValid.valid, true);

  const missingDurationAndEdu = validateUploadPayload({
    title: 'Valid Video Title Here',
    description: 'A long enough description explaining the educational video clearly.',
    categoryName: 'A',
    educatorName: '',
    videoUrl: 'https://www.youtube.com/watch?v=ok',
    thumbnailUrl: 'data:image/png;base64,AAAA',
    durationSeconds: 0,
    reflectionPrompt: 'What is one insight you want to remember?',
    chapters: [],
  });
  assert.equal(missingDurationAndEdu.valid, false);
  assert.ok(missingDurationAndEdu.errors.categoryId);
  assert.ok(missingDurationAndEdu.errors.educatorName);
  assert.ok(missingDurationAndEdu.errors.durationSeconds);
});

test('getInitials strips academic prefixes cleanly', () => {
  assert.equal(getInitials('Dr. Clara Lindholm'), 'CL');
  assert.equal(getInitials('Prof. Julian Vance'), 'JV');
  assert.equal(getInitials('Elena'), 'EL');
});

test('slugifyCategory and validateCategoryPayload normalize and validate category tags', () => {
  assert.equal(slugifyCategory('Communication & Trust!'), 'communication-and-trust');
  assert.equal(slugifyCategory('  Mindful   Dating  '), 'mindful-dating');

  const invalid = validateCategoryPayload({ name: 'A', slug: '---' });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.name);
  assert.ok(invalid.errors.slug);

  const valid = validateCategoryPayload({
    name: 'Repair & Forgiveness',
    description: 'Guided exercises on rebuilding relational trust.',
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.normalized.slug, 'repair-and-forgiveness');
  assert.equal(valid.normalized.name, 'Repair & Forgiveness');
});

test('buildShareLinks generates properly encoded social and email share URLs', () => {
  const links = buildShareLinks({
    url: 'https://kinship.app/watch/vid-earned-security',
    title: 'Earned Security & Trust',
  });
  assert.ok(links.whatsapp.startsWith('https://wa.me/?text='));
  assert.ok(links.twitter.includes('twitter.com/intent/tweet'));
  assert.ok(links.telegram.includes('t.me/share/url'));
  assert.ok(links.reddit.includes('reddit.com/submit'));
  assert.ok(links.linkedin.includes('linkedin.com/sharing'));
  assert.ok(links.email.startsWith('mailto:?subject='));
  assert.ok(links.twitter.includes(encodeURIComponent('https://kinship.app/watch/vid-earned-security')));
});

test('computeWatchProgress calculates clamped percentages, minimum visibility, and completion states', async () => {
  const { computeWatchProgress } = await import('./video-utils');

  const unwatched = computeWatchProgress(0, 1000);
  assert.equal(unwatched.hasProgress, false);
  assert.equal(unwatched.percent, 0);
  assert.equal(unwatched.isCompleted, false);
  assert.equal(unwatched.remainingSeconds, 1000);
  assert.equal(unwatched.statusLabel, '');

  const invalid = computeWatchProgress(undefined, 0);
  assert.equal(invalid.hasProgress, false);
  assert.equal(invalid.percent, 0);

  // Tiny non-zero progress stays visually visible at 3% minimum
  const justStarted = computeWatchProgress(5, 1000);
  assert.equal(justStarted.hasProgress, true);
  assert.equal(justStarted.percent, 3);
  assert.equal(justStarted.isCompleted, false);
  assert.equal(justStarted.remainingSeconds, 995);
  assert.equal(justStarted.statusLabel, '3% watched');

  // Mid-video progress (e.g., 495 / 948 = 52.2%)
  const half = computeWatchProgress(495, 948);
  assert.equal(half.hasProgress, true);
  assert.equal(half.percent, 52);
  assert.equal(half.isCompleted, false);
  assert.equal(half.remainingSeconds, 453);
  assert.equal(half.statusLabel, '52% watched');

  // >= 95% snaps to completed (100% / Watched)
  const completed = computeWatchProgress(910, 948);
  assert.equal(completed.hasProgress, true);
  assert.equal(completed.percent, 100);
  assert.equal(completed.isCompleted, true);
  assert.equal(completed.remainingSeconds, 0);
  assert.equal(completed.statusLabel, 'Watched');

  // Clamps overshoot beyond duration
  const overshoot = computeWatchProgress(2500, 948);
  assert.equal(overshoot.clampedSeconds, 948);
  assert.equal(overshoot.percent, 100);
  assert.equal(overshoot.isCompleted, true);
});

test('isLegacyMockCategory identifies legacy mock categories and preserves real adult categories', async () => {
  const { isLegacyMockCategory } = await import('./video-utils');

  assert.equal(
    isLegacyMockCategory({
      id: 'cat-attachment',
      name: 'Attachment Theory',
      slug: 'attachment-theory',
    }),
    true
  );
  assert.equal(
    isLegacyMockCategory({
      id: 'cat-coregulation',
      name: 'Co-Regulation',
      slug: 'co-regulation',
    }),
    true
  );
  assert.equal(
    isLegacyMockCategory({
      id: 'cat-conflict',
      name: 'Conflict Resolution',
      slug: 'conflict-resolution',
    }),
    true
  );
  assert.equal(
    isLegacyMockCategory({
      id: 'cat-dating',
      name: 'Dating Dynamics',
      slug: 'dating-dynamics',
    }),
    true
  );
  assert.equal(
    isLegacyMockCategory({
      id: 'cat-boundaries',
      name: 'Emotional Boundaries',
      slug: 'emotional-boundaries',
    }),
    true
  );
  assert.equal(
    isLegacyMockCategory({
      id: 'cat-philosophy',
      name: 'Philosophy of Love',
      slug: 'philosophy-of-love',
    }),
    true
  );

  // Authentic adult categories created by the studio owner remain visible
  assert.equal(
    isLegacyMockCategory({
      id: 'cat-2f5b8c33',
      name: 'Hardcore',
      slug: 'hardcore',
    }),
    false
  );
  assert.equal(
    isLegacyMockCategory({
      id: 'cat-a31b637c',
      name: 'Xxx',
      slug: 'xxx',
    }),
    false
  );
});



