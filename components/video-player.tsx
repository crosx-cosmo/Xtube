'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  Copy,
  Pause,
  Play,
  RectangleHorizontal,
  Share2,
  Sparkles,
} from 'lucide-react';
import { buildWatchShareUrl, copyTextToClipboard } from '@/lib/api-client';
import type { ContentRatingCode } from '@/lib/content-rating';
import type { VideoChapter } from '@/lib/types';
import {
  formatDuration,
  getActiveChapterIndex,
} from '@/lib/video-utils';
import { ContentRatingBadge } from '@/components/content-rating-badge';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  videoId?: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  contentRating?: ContentRatingCode;
  chapters: VideoChapter[];
  currentTime: number;
  onTimeUpdate: (seconds: number) => void;
  onUserSeek?: (seconds: number) => void;
  seekRequest: { seconds: number; nonce: number } | null;
  theaterMode: boolean;
  onToggleTheater: () => void;
  onPlayRedirect?: () => void;
  onShare?: () => void;
}

export function VideoPlayer({
  videoId,
  title,
  videoUrl,
  thumbnailUrl,
  durationSeconds,
  contentRating,
  chapters,
  currentTime,
  onTimeUpdate,
  seekRequest,
  theaterMode,
  onToggleTheater,
  onPlayRedirect,
}: VideoPlayerProps) {
  const duration = Math.max(1, durationSeconds);

  // Ambient autoplay preview cycles smoothly through chapter highlights on the thumbnail stage
  const [isAutoPreview, setIsAutoPreview] = React.useState(true);
  const [redirectNotice, setRedirectNotice] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState<string | null>(null);
  const copyTimerRef = React.useRef<number | null>(null);

  const activeChapterIdx = getActiveChapterIndex(chapters, currentTime);
  const activeChapter = activeChapterIdx >= 0 ? chapters[activeChapterIdx] : null;

  // Apply external seek requests (from Chapters sidebar)
  React.useEffect(() => {
    if (!seekRequest) return;
    const clamped = Math.max(0, Math.min(duration, seekRequest.seconds));
    onTimeUpdate(clamped);
  }, [seekRequest, duration, onTimeUpdate]);

  // Smooth ambient preview progression across chapters
  React.useEffect(() => {
    if (!isAutoPreview) return;
    const interval = window.setInterval(() => {
      const next = currentTime + 1.5;
      onTimeUpdate(next >= duration ? 0 : next);
    }, 500);
    return () => window.clearInterval(interval);
  }, [isAutoPreview, currentTime, duration, onTimeUpdate]);

  React.useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleTriggerRedirect = () => {
    setRedirectNotice(true);
    onPlayRedirect?.();
    window.setTimeout(() => setRedirectNotice(false), 3000);
  };

  const handleCopyShareLink = async () => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://heylady.app';
    const currentHref =
      typeof window !== 'undefined' ? window.location.href : '';
    const shareUrl = buildWatchShareUrl(videoId, origin, currentHref);
    await copyTextToClipboard(shareUrl);
    setCopiedLink(shareUrl);
    if (copyTimerRef.current) {
      window.clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = window.setTimeout(() => {
      setCopiedLink(null);
    }, 3200);
  };

  return (
    <div
      data-testid="video-player"
      data-vt-role="poster"
      data-theater={theaterMode ? 'true' : 'false'}
      className={cn(
        'relative w-full overflow-hidden bg-black text-white select-none group/player',
        theaterMode
          ? 'aspect-[21/9] max-h-[75dvh] rounded-none sm:rounded-xl'
          : 'aspect-video rounded-xl ring-1 ring-white/10'
      )}
    >
      {/* Thumbnail Preview Stage with Subtle Autoplay Motion */}
      <div className="relative h-full w-full overflow-hidden">
        <motion.img
          src={thumbnailUrl}
          alt={title}
          referrerPolicy="no-referrer"
          animate={{ scale: isAutoPreview ? [1, 1.055, 1] : 1 }}
          transition={
            isAutoPreview
              ? { duration: 16, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.4 }
          }
          className="h-full w-full object-cover opacity-85 transition-opacity group-hover/player:opacity-95"
        />

        {/* Cinema Scrim */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-black/40"
        />

        {/* Player Header Bar: 18+ Content Rating Transparency + Duration (Original Source Hidden) */}
        <div
          data-testid="video-player-header"
          className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-20 pointer-events-none"
        >
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <ContentRatingBadge
              rating={contentRating}
              variant="player-overlay"
              interactive
            />
          </div>
          <span className="rounded-lg bg-black/75 border border-white/10 px-2.5 py-1 font-mono text-xs text-zinc-200 tabular-nums backdrop-blur-md shrink-0">
            {formatDuration(duration)}
          </span>
        </div>

        {/* Center Play Action — Official Stream Launch without Exposing Source Host */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 pb-9 sm:pb-0 text-center z-10">
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleTriggerRedirect}
            data-testid="play-redirect-link"
            aria-label={`Watch ${title}`}
            className="group/play inline-flex flex-col items-center gap-2.5 sm:gap-3 focus-visible:outline-none"
          >
            <motion.span
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="flex h-12 w-12 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-rose-600 text-white shadow-[0_0_2.5rem_rgba(225,29,72,0.55)] ring-4 ring-rose-500/25 group-hover/play:bg-rose-500 transition-colors"
            >
              <Play className="h-5 w-5 sm:h-9 sm:w-9 fill-current ml-0.5 sm:ml-1" />
            </motion.span>
            <motion.span
              whileHover={{ y: -1, scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-black/80 border border-white/15 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white backdrop-blur-md group-hover/play:border-rose-500/60 transition-colors"
            >
              <span>{redirectNotice ? 'Opening Stream...' : 'Watch Now'}</span>
            </motion.span>
          </a>
        </div>

        {/* Clipboard Share Link Toast Banner Inside Player */}
        <AnimatePresence>
          {copiedLink && (
            <motion.div
              data-testid="video-player-share-toast"
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 26 }}
              className="absolute right-3 bottom-14 z-30 flex max-w-[min(92%,24rem)] items-center gap-2 rounded-xl border border-emerald-400/35 bg-zinc-950/92 px-3 py-2 text-xs text-zinc-100 shadow-xl backdrop-blur-md"
            >
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-emerald-300 leading-tight">
                  Link copied to clipboard
                </p>
                <p
                  data-testid="video-player-share-url"
                  className="mt-0.5 truncate font-mono text-[0.6875rem] text-zinc-300 select-all"
                >
                  {copiedLink}
                </p>
              </div>
              <Copy className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden="true" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Chapter Preview Overlay */}
        <div className="absolute inset-x-0 bottom-16 px-4 sm:px-6 pointer-events-none z-10 hidden sm:block">
          <AnimatePresence mode="wait">
            {activeChapter && (
              <motion.div
                key={activeChapter.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="max-w-xl"
              >
                <p className="font-mono text-[0.6875rem] text-rose-400 tabular-nums">
                  Chapter {activeChapterIdx + 1} of {chapters.length} ·{' '}
                  {formatDuration(activeChapter.timestampSeconds)}
                </p>
                <p className="mt-0.5 font-display text-sm sm:text-base font-semibold text-white leading-snug truncate">
                  {activeChapter.title}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Streaming Bar (Clean Controls + Clipboard Share Button + Theater Toggle) */}
      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/95 via-black/75 to-transparent px-4 pt-6 pb-3">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <motion.a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleTriggerRedirect}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 text-xs font-semibold text-white hover:bg-rose-500 transition-colors whitespace-nowrap shrink-0"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Watch Now</span>
            </motion.a>

            <motion.button
              type="button"
              onClick={() => setIsAutoPreview((p) => !p)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              aria-pressed={isAutoPreview}
              aria-label={isAutoPreview ? 'Pause thumbnail preview' : 'Enable autoplay preview'}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap',
                isAutoPreview
                  ? 'bg-white/15 text-white'
                  : 'text-zinc-300 hover:bg-white/10'
              )}
            >
              {isAutoPreview ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {isAutoPreview ? 'Autoplay Preview' : 'Preview Paused'}
              </span>
            </motion.button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <motion.button
              type="button"
              data-testid="video-player-share-btn"
              onClick={handleCopyShareLink}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 420, damping: 20 }}
              aria-label={
                copiedLink ? 'Video link copied to clipboard' : 'Copy shareable link for this video'
              }
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap',
                copiedLink
                  ? 'bg-emerald-600/90 text-white'
                  : 'bg-white/12 text-zinc-100 hover:bg-white/20'
              )}
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Share</span>
                </>
              )}
            </motion.button>

            <motion.button
              type="button"
              onClick={onToggleTheater}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              aria-label={theaterMode ? 'Exit theater mode' : 'Enter theater mode'}
              aria-pressed={theaterMode}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap',
                theaterMode
                  ? 'bg-rose-600 text-white'
                  : 'text-zinc-200 hover:bg-white/15'
              )}
            >
              <RectangleHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Theater</span>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}

