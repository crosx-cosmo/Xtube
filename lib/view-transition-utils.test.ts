import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyTransitionRoute,
  extractVideoIdFromPath,
  isBrowsePath,
  normalizeInternalPathname,
  pickBestTargetIndex,
  shouldInterceptLinkClick,
} from './view-transition-utils';

test('normalizeInternalPathname strips queries, hashes, and origins cleanly', () => {
  assert.equal(normalizeInternalPathname('/watch/vid-123?t=45#top'), '/watch/vid-123');
  assert.equal(normalizeInternalPathname('/library?tab=history'), '/library');
  assert.equal(normalizeInternalPathname('https://example.com/creator/clara?sort=new'), '/creator/clara');
  assert.equal(normalizeInternalPathname(''), '/');
});

test('extractVideoIdFromPath parses /watch/[id] routes and ignores others', () => {
  assert.equal(extractVideoIdFromPath('/watch/vid-conflict-repair'), 'vid-conflict-repair');
  assert.equal(extractVideoIdFromPath('/watch/vid-123/?t=20'), 'vid-123');
  assert.equal(extractVideoIdFromPath('/'), null);
  assert.equal(extractVideoIdFromPath('/library'), null);
  assert.equal(extractVideoIdFromPath('/creator/amara-okafor'), null);
});

test('isBrowsePath identifies public browsing pages accurately', () => {
  assert.equal(isBrowsePath('/'), true);
  assert.equal(isBrowsePath('/library?tab=history'), true);
  assert.equal(isBrowsePath('/educators'), true);
  assert.equal(isBrowsePath('/creator/amara-okafor'), true);
  assert.equal(isBrowsePath('/watch/vid-conflict-repair'), false);
  assert.equal(isBrowsePath('/admin'), false);
});

test('classifyTransitionRoute classifies browse->watch, watch->browse, watch->watch, and admin', () => {
  const toWatch = classifyTransitionRoute('/', '/watch/vid-conflict-repair');
  assert.equal(toWatch.direction, 'to-watch');
  assert.equal(toWatch.activeVideoId, 'vid-conflict-repair');
  assert.equal(toWatch.shouldAnimate, true);

  const toBrowse = classifyTransitionRoute('/watch/vid-conflict-repair', '/');
  assert.equal(toBrowse.direction, 'to-browse');
  assert.equal(toBrowse.activeVideoId, 'vid-conflict-repair');
  assert.equal(toBrowse.shouldAnimate, true);

  const toVideo = classifyTransitionRoute('/watch/vid-a', '/watch/vid-b');
  assert.equal(toVideo.direction, 'to-video');
  assert.equal(toVideo.activeVideoId, 'vid-b');
  assert.equal(toVideo.shouldAnimate, true);

  const sameVideo = classifyTransitionRoute('/watch/vid-a', '/watch/vid-a');
  assert.equal(sameVideo.shouldAnimate, false);

  const toAdmin = classifyTransitionRoute('/', '/admin');
  assert.equal(toAdmin.shouldAnimate, false);
});

test('shouldInterceptLinkClick honors modifier keys, external links, and target attributes', () => {
  const baseClick = {
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
    target: null,
  };

  assert.equal(shouldInterceptLinkClick(baseClick, '/watch/vid-1'), true);
  assert.equal(shouldInterceptLinkClick(baseClick, '/library?tab=history'), true);
  assert.equal(shouldInterceptLinkClick({ ...baseClick, metaKey: true }, '/watch/vid-1'), false);
  assert.equal(shouldInterceptLinkClick({ ...baseClick, ctrlKey: true }, '/watch/vid-1'), false);
  assert.equal(shouldInterceptLinkClick({ ...baseClick, button: 1 }, '/watch/vid-1'), false);
  assert.equal(shouldInterceptLinkClick({ ...baseClick, target: '_blank' }, '/watch/vid-1'), false);
  assert.equal(shouldInterceptLinkClick(baseClick, 'https://youtube.com/watch?v=1'), false);
  assert.equal(shouldInterceptLinkClick(baseClick, '#comments'), false);
});

test('pickBestTargetIndex selects a single visible, highest-priority target and skips hidden elements', () => {
  // Hidden hero (area 0) vs visible card
  assert.equal(
    pickBestTargetIndex([
      { source: 'hero', inViewport: false, area: 0 },
      { source: 'continue', inViewport: true, area: 5000 },
      { source: 'card', inViewport: true, area: 40000 },
    ]),
    2
  );

  // Off-screen card vs in-viewport continue item -> prefers in-viewport item
  assert.equal(
    pickBestTargetIndex([
      { source: 'card', inViewport: false, area: 40000 },
      { source: 'continue', inViewport: true, area: 6000 },
    ]),
    1
  );

  // Empty or all-hidden returns -1
  assert.equal(pickBestTargetIndex([]), -1);
  assert.equal(
    pickBestTargetIndex([{ source: 'card', inViewport: false, area: 0 }]),
    -1
  );
});
