import test from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ContentRatingBadge } from './content-rating-badge';
import { VideoPlayer } from './video-player';
import {
  AdultFloatingStickersLayer,
  AdultNeonWatermarkSeal,
  AdultStickerCluster,
  AdultStickerStamp,
  getAdultStickerSpec,
} from './adult-stickers';
import { ThemeProvider } from './theme-provider';
import { ThemeToggle } from './theme-toggle';
import { AgeVerificationModal } from './age-verification-modal';
import {
  HomeFeedSkeleton,
  VideoCardSkeleton,
  VideoGridSkeleton,
} from './video-card-skeleton';

test('VideoCardSkeleton, VideoGridSkeleton, and HomeFeedSkeleton render accessible loading states with GPU shimmer', () => {
  const cardHtml = renderToStaticMarkup(
    React.createElement(VideoCardSkeleton, { variant: 'cinema' })
  );
  assert.match(cardHtml, /data-testid="video-card-skeleton"/);
  assert.match(cardHtml, /velvet-skeleton-shimmer/);

  const gridHtml = renderToStaticMarkup(
    React.createElement(VideoGridSkeleton, { count: 3 })
  );
  assert.match(gridHtml, /data-testid="video-grid-skeleton"/);
  assert.match(gridHtml, /aria-busy="true"/);
  assert.match(gridHtml, /role="status"/);

  const feedHtml = renderToStaticMarkup(React.createElement(HomeFeedSkeleton));
  assert.match(feedHtml, /data-testid="home-feed-skeleton"/);
  assert.match(feedHtml, /data-testid="trending-grid-skeleton"/);
  assert.match(feedHtml, /data-testid="video-grid-skeleton"/);
});

test('ContentRatingBadge renders thumbnail, micro, and interactive player-header variants with 18+ ARIA metadata', () => {
  const thumbHtml = renderToStaticMarkup(
    React.createElement(ContentRatingBadge, { variant: 'thumbnail' })
  );
  assert.match(thumbHtml, /data-testid="content-rating-badge"/);
  assert.match(thumbHtml, /data-rating-variant="thumbnail"/);
  assert.match(thumbHtml, /data-content-rating="18\+"/);
  assert.match(thumbHtml, /aria-label="Content rating: 18\+ Adults Only, RTA compliant"/);
  assert.match(thumbHtml, /RTA-5042-1996-1400-1577-RTA/);

  const microHtml = renderToStaticMarkup(
    React.createElement(ContentRatingBadge, { variant: 'micro', rating: '21+' })
  );
  assert.match(microHtml, /data-rating-variant="micro"/);
  assert.match(microHtml, /data-content-rating="21\+"/);
  assert.match(microHtml, />21\+</);

  const headerHtml = renderToStaticMarkup(
    React.createElement(ContentRatingBadge, {
      variant: 'player-header',
      interactive: true,
    })
  );
  assert.match(headerHtml, /<button/);
  assert.match(headerHtml, /aria-expanded="false"/);
  assert.match(headerHtml, /Adults Only · RTA/);
});

test('VideoPlayer header renders interactive 18+ ContentRatingBadge and duration while hiding original source host and watch line', () => {
  const html = renderToStaticMarkup(
    React.createElement(VideoPlayer, {
      title: 'Midnight Lounge Spotlight',
      videoUrl: 'https://example.com/watch/vip-1',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      durationSeconds: 745,
      chapters: [],
      currentTime: 0,
      onTimeUpdate: () => {},
      seekRequest: null,
      theaterMode: false,
      onToggleTheater: () => {},
    })
  );

  assert.match(html, /data-testid="video-player-header"/);
  assert.match(html, /data-testid="content-rating-badge"/);
  assert.match(html, /data-rating-variant="player-overlay"/);
  assert.doesNotMatch(html, /Original Source/);
  assert.doesNotMatch(html, /Preview chapter timeline/);
  assert.match(html, /12:25/);
});

test('AdultStickerStamp, AdultStickerCluster, AdultNeonWatermarkSeal, and AdultFloatingStickersLayer render 18+ symbols and stickers', () => {
  const spec = getAdultStickerSpec('xxx-uncensored');
  assert.equal(spec.code, 'XXX');
  assert.equal(spec.label, 'UNCENSORED');

  const stampHtml = renderToStaticMarkup(
    React.createElement(AdultStickerStamp, { kind: '18-plus', tilted: true })
  );
  assert.match(stampHtml, /data-testid="adult-sticker-18-plus"/);
  assert.match(stampHtml, /ADULTS ONLY/);

  const clusterHtml = renderToStaticMarkup(
    React.createElement(AdultStickerCluster, { variant: 'hero' })
  );
  assert.match(clusterHtml, /data-testid="adult-sticker-cluster-hero"/);
  assert.match(clusterHtml, /UNCENSORED/);
  assert.match(clusterHtml, /VIP EXCLUSIVE/);
  assert.match(clusterHtml, /18\+ RESTRICTED/);

  const sealHtml = renderToStaticMarkup(
    React.createElement(AdultNeonWatermarkSeal)
  );
  assert.match(sealHtml, /data-testid="adult-neon-watermark-seal"/);
  assert.match(sealHtml, /UNCENSORED/);
  assert.match(sealHtml, /Adults Only/);

  const floatingLayerHtml = renderToStaticMarkup(
    React.createElement(AdultFloatingStickersLayer)
  );
  assert.match(
    floatingLayerHtml,
    /data-testid="adult-floating-stickers-layer"/
  );
  assert.match(
    floatingLayerHtml,
    /data-testid="floating-adult-sticker-float-18-plus-top-right"/
  );
  assert.match(floatingLayerHtml, /VIP LOUNGE/);
  assert.match(floatingLayerHtml, /RAW 4K HD/);
});

test('ThemeToggle renders luxury celestial switch with accessible switch role and theme state', () => {
  const html = renderToStaticMarkup(
    React.createElement(
      ThemeProvider,
      null,
      React.createElement(ThemeToggle)
    )
  );
  assert.match(html, /data-testid="theme-toggle"/);
  assert.match(html, /role="switch"/);
  assert.match(html, /data-theme-state="light"/);
  assert.match(html, /LIGHT/);
});

test('AgeVerificationModal renders blurred safety overlay and clear "I am 18+" confirmation button', () => {
  const html = renderToStaticMarkup(
    React.createElement(AgeVerificationModal, { forceOpen: true })
  );
  assert.match(html, /data-testid="age-verification-modal"/);
  assert.match(html, /backdrop-blur-2xl/);
  assert.match(html, /Age Verification Required/);
  assert.match(html, /data-testid="age-verification-confirm-btn"/);
  assert.match(html, /I am 18\+/);
  assert.match(html, /data-testid="age-verification-exit-btn"/);
  assert.match(html, /RTA-5042-1996-1400-1577-RTA/);
});



