'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ExternalLink,
  Pause,
  Play,
  RectangleHorizontal,
  Sparkles,
} from 'lucide-react';
import type { ContentRatingCode } from '@/lib/content-rating';
import type { VideoChapter } from '@/lib/types';
import {
  extractSourceHost,
  formatDuration,
  getActiveChapterIndex,
} from '@/lib/video-utils';
import { ContentRatingBadge } from '@/components/content-rating-badge';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
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
}

export function VideoPlayer({
  title,
  videoUrl,
  thumbnailUrl,
  durationSeconds,
  contentRating,
  chapters,
  currentTime,
  onTimeUpdate,
  onUserSeek,
  seekRequest,
  theaterMode,
  onToggleTheater,
  onPlayRedirect,
}: VideoPlayerProps) {
  const scrubRef = React.useRef<HTMLDivElement>(null);
  const duration = Math.max(1, durationSeconds);
  const sourceHost = extractSourceHost(videoUrl);

  // Ambient autoplay preview cycles smoothly through chapter highlights on the thumbnail stage
  const [isAutoPreview, setIsAutoPreview] = React.useState(true);
  const [hoverTime, setHoverTime] = React.useState<number | null>(null);
  const [hoverLeftPct, setHoverLeftPct] = React.useState<number>(0);
  const [redirectNotice, setRedirectNotice] = React.useState(false);

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

  const handleScrubPointer = (clientX: number) => {
    const rect = scrubRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const nextSeconds = ratio * duration;
    onTimeUpdate(nextSeconds);
    onUserSeek?.(nextSeconds);
  };

  const handleScrubHover = (clientX: number) => {
    const rect = scrubRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setHoverLeftPct(ratio * 100);
    setHoverTime(ratio * duration);
  };

  const handleTriggerRedirect = () => {
    setRedirectNotice(true);
    onPlayRedirect?.();
    window.setTimeout(() => setRedirectNotice(false), 3000);
  };

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      data-testid="video-player"
      data-vt-role="poster"
      data-theater={theaterMode ? 'true' : 'false'}
      data-source-url={videoUrl}
      className={cn(
        'relative w-full overflow-hidden bg-black text-white select-none group/player',
        theaterMode
          ? 'aspect-[21/9] max-h-[75vh] rounded-none sm:rounded-xl'
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

        {/* Player Header Bar: 18+ Content Rating Transparency + Original Source + Duration */}
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
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/75 border border-white/10 px-2.5 py-1 text-xs font-medium text-zinc-100 backdrop-blur-md truncate">
              <ExternalLink className="h-3.5 w-3.5 text-rose-400 shrink-0" aria-hidden="true" />
              <span className="truncate">Original Source · {sourceHost}</span>
            </span>
          </div>
          <span className="rounded-lg bg-black/75 border border-white/10 px-2 py-1 font-mono text-xs text-zinc-200 tabular-nums backdrop-blur-md shrink-0">
            {formatDuration(duration)}
          </span>
        </div>

        {/* Center Play Action — Direct External Link Redirect (No Video Hosting Required) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 pb-9 sm:pb-0 text-center z-10">
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleTriggerRedirect}
            data-testid="play-redirect-link"
            aria-label={`Play original video on ${sourceHost}`}
            className="group/play inline-flex flex-col items-center gap-2.5 sm:gap-3 focus-visible:outline-none"
          >
            <motion.span
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              className="flex h-12 w-12 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-rose-600 text-white shadow-[0_0_40px_rgba(225,29,72,0.55)] ring-4 ring-rose-500/25 group-hover/play:bg-rose-500 transition-colors"
            >
              <Play className="h-5 w-5 sm:h-9 sm:w-9 fill-current ml-0.5 sm:ml-1" />
            </motion.span>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-black/80 border border-white/15 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white backdrop-blur-md group-hover/play:border-rose-500/60 transition-colors">
              <span>{redirectNotice ? `Opening ${sourceHost}...` : `Play Original Video on ${sourceHost}`}</span>
              <ExternalLink className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />
            </span>
          </a>
        </div>

        {/* Active Chapter Preview Overlay */}
        <div className="absolute inset-x-0 bottom-20 px-4 sm:px-6 pointer-events-none z-10 hidden sm:block">
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

      {/* Bottom Streaming Bar */}
      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/95 via-black/80 to-transparent px-4 pt-8 pb-3">
        {/* Interactive Chapter Preview Timeline */}
        <div
          ref={scrubRef}
          role="slider"
          tabIndex={0}
          aria-label="Preview chapter timeline"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
          aria-valuetext={`${formatDuration(currentTime)} of ${formatDuration(duration)}`}
          onClick={(e) => handleScrubPointer(e.clientX)}
          onMouseMove={(e) => handleScrubHover(e.clientX)}
          onMouseLeave={() => setHoverTime(null)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') {
              const nextSeconds = Math.min(duration, currentTime + 15);
              onTimeUpdate(nextSeconds);
              onUserSeek?.(nextSeconds);
            }
            if (e.key === 'ArrowLeft') {
              const nextSeconds = Math.max(0, currentTime - 15);
              onTimeUpdate(nextSeconds);
              onUserSeek?.(nextSeconds);
            }
          }}
          className="group/scrub relative mb-2.5 flex h-4 cursor-pointer items-center focus-visible:outline-none"
        >
          {hoverTime !== null && (
            <div
              style={{ left: `${hoverLeftPct}%` }}
              className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded bg-zinc-950/95 px-2 py-0.5 font-mono text-[0.6875rem] text-white tabular-nums ring-1 ring-white/10"
            >
              {formatDuration(hoverTime)}
            </div>
          )}

          <div className="relative h-1 w-full rounded-full bg-white/25 overflow-hidden group-hover/scrub:h-1.5 transition-all">
            <div
              className="h-full bg-rose-600 transition-[width] duration-150"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {chapters.map((ch) => {
            const leftPct = duration > 0 ? (ch.timestampSeconds / duration) * 100 : 0;
            if (leftPct <= 0 || leftPct >= 100) return null;
            return (
              <span
                key={ch.id}
                aria-hidden="true"
                style={{ left: `${leftPct}%` }}
                className="pointer-events-none absolute h-2.5 w-0.5 -translate-x-1/2 bg-black/80"
              />
            );
          })}

          <div
            aria-hidden="true"
            style={{ left: `${progressPct}%` }}
            className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-rose-500 shadow ring-2 ring-white opacity-0 group-hover/scrub:opacity-100 transition-opacity"
          />
        </div>

        {/* Bottom Controls Row */}
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleTriggerRedirect}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-500 transition-colors whitespace-nowrap shrink-0"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Watch Source</span>
              <ExternalLink className="h-3 w-3 opacity-85" aria-hidden="true" />
            </a>

            <button
              type="button"
              onClick={() => setIsAutoPreview((p) => !p)}
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
            </button>

            <span className="hidden md:inline font-mono text-xs text-zinc-300 tabular-nums whitespace-nowrap">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onToggleTheater}
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
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
