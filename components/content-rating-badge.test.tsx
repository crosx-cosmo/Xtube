import test from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ContentRatingBadge } from './content-rating-badge';
import { VideoPlayer } from './video-player';

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

test('VideoPlayer header renders interactive 18+ ContentRatingBadge alongside source host and duration', () => {
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
  assert.match(html, /Original Source · example\.com/);
  assert.match(html, /12:25/);
});
