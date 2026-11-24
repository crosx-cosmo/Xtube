import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEngagementBars,
  computeViewSharePercent,
  filterAdminVideos,
  getCollectionDotClass,
  getEducatorInitials,
  getTimeOfDayGreeting,
} from './admin-studio-utils';

test('getTimeOfDayGreeting returns accurate greetings across all hours', () => {
  assert.equal(getTimeOfDayGreeting(6), 'Good morning');
  assert.equal(getTimeOfDayGreeting(11), 'Good morning');
  assert.equal(getTimeOfDayGreeting(12), 'Good afternoon');
  assert.equal(getTimeOfDayGreeting(17), 'Good afternoon');
  assert.equal(getTimeOfDayGreeting(18), 'Good evening');
  assert.equal(getTimeOfDayGreeting(23), 'Good evening');
});

test('computeViewSharePercent handles zero totals and clamps safely', () => {
  assert.equal(computeViewSharePercent(50, 0), 0);
  assert.equal(computeViewSharePercent(0, 100), 1);
  assert.equal(computeViewSharePercent(50, 200), 25);
  assert.equal(computeViewSharePercent(250, 200), 100);
});

test('buildEngagementBars normalizes bar heights and highlights peak video', () => {
  const bars = buildEngagementBars([
    {
      id: 'v1',
      title: 'Intro Talk',
      views: 25000,
      category: { id: 'c1', name: 'Attachment Theory', slug: 'attachment-theory', description: '' },
    },
    {
      id: 'v2',
      title: 'Repair Guide',
      views: 100000,
      category: { id: 'c2', name: 'Conflict Resolution', slug: 'conflict-resolution', description: '' },
    },
    {
      id: 'v3',
      title: 'Daily Calm',
      views: 50000,
      category: { id: 'c3', name: 'Co-Regulation', slug: 'co-regulation', description: '' },
    },
  ]);

  assert.equal(bars.length, 3);
  assert.equal(bars[0].isPeak, false);
  assert.equal(bars[1].isPeak, true);
  assert.equal(bars[1].heightPercent, 100);
  assert.equal(bars[0].heightPercent, 40);
  assert.equal(bars[2].heightPercent, 60);
  assert.deepEqual(buildEngagementBars([]), []);
});

test('filterAdminVideos filters by category slug and search query together', () => {
  const sample = [
    {
      title: 'Earned Security',
      description: 'Attachment lecture',
      videoUrl: 'https://youtube.com/watch?v=1',
      category: { id: 'c1', name: 'Attachment Theory', slug: 'attachment-theory', description: '' },
      creator: {
        id: 'u1',
        name: 'Dr. Clara Lindholm',
        username: 'clara',
        avatarUrl: '',
        bio: '',
        credentials: '',
        isEducator: true,
        followersCount: 10,
      },
    },
    {
      title: 'Repair After Conflict',
      description: 'De-escalation steps',
      videoUrl: 'https://vimeo.com/123',
      category: { id: 'c2', name: 'Conflict Resolution', slug: 'conflict-resolution', description: '' },
      creator: {
        id: 'u2',
        name: 'Dr. Amara Okafor',
        username: 'amara',
        avatarUrl: '',
        bio: '',
        credentials: '',
        isEducator: true,
        followersCount: 20,
      },
    },
  ];

  assert.equal(filterAdminVideos(sample, { categorySlug: 'all' }).length, 2);
  assert.equal(filterAdminVideos(sample, { categorySlug: 'conflict-resolution' }).length, 1);
  assert.equal(filterAdminVideos(sample, { query: 'amara' }).length, 1);
  assert.equal(filterAdminVideos(sample, { query: 'vimeo.com' }).length, 1);
  assert.equal(
    filterAdminVideos(sample, { categorySlug: 'attachment-theory', query: 'amara' }).length,
    0
  );
});

test('getEducatorInitials strips academic prefixes and returns clean monograms', () => {
  assert.equal(getEducatorInitials('Dr. Amara Okafor'), 'AO');
  assert.equal(getEducatorInitials('Prof. Julian Vance'), 'JV');
  assert.equal(getEducatorInitials('Elena Morales'), 'EM');
  assert.equal(getEducatorInitials(''), 'AD');
});

test('getCollectionDotClass cycles cleanly for any index', () => {
  assert.ok(getCollectionDotClass(0).startsWith('bg-'));
  assert.equal(getCollectionDotClass(0), getCollectionDotClass(6));
});
