'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import gsap from 'gsap';
import {
  BadgeCheck,
  Bookmark,
  Heart,
  Play,
  Share2,
} from 'lucide-react';
import type { VideoWithMeta } from '@/lib/types';
import {
  formatDuration,
  formatEditorialDate,
  formatViews,
} from '@/lib/video-utils';
import { EducatorAvatar } from '@/components/ui/avatar';
import { ContentRatingBadge } from '@/components/content-rating-badge';
import { ShareModal, type ShareTarget } from '@/components/share-modal';
import { TransitionLink } from '@/components/transition-link';
import { cn } from '@/lib/utils';

interface VideoCardProps {
  video: VideoWithMeta;
  index?: number;
  progressSeconds?: number;
  variant?: 'cinema' | 'standard';
  onToggleBookmark?: (videoId: string) => void;
  onShare?: (video: VideoWithMeta) => void;
}

export function VideoCard({
  video,
  index = 0,
  variant = 'standard',
  onToggleBookmark,
  onShare,
}: VideoCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [imgFailed, setImgFailed] = React.useState(false);
  const [localShareTarget, setLocalShareTarget] = React.useState<ShareTarget | null>(null);
  const playBadgeRef = React.useRef<HTMLSpanElement | null>(null);

  const handleHoverChange = React.useCallback((hovered: boolean) => {
    setIsHovered(hovered);
    if (
      typeof window !== 'undefined' &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      playBadgeRef.current
    ) {
      gsap.to(playBadgeRef.current, {
        scale: hovered ? 1.14 : 1,
        rotate: hovered ? 6 : 0,
        duration: 0.28,
        ease: hovered ? 'back.out(2.2)' : 'power2.out',
        overwrite: 'auto',
      });
    }
  }, []);

  const handleCardPress = React.useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      playBadgeRef.current
    ) {
      gsap.fromTo(
        playBadgeRef.current,
        { scale: 0.88 },
        { scale: 1.16, duration: 0.24, ease: 'back.out(3)', overwrite: 'auto' }
      );
    }
  }, []);

  const handleShareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onShare) {
      onShare(video);
    } else {
      setLocalShareTarget({
        videoId: video.id,
        title: video.title,
        thumbnailUrl: video.thumbnailUrl,
      });
    }
  };

  if (variant === 'cinema') {
    return (
      <>
        <motion.article
          data-vt-video-id={video.id}
          data-vt-source="card"
          data-gsap-card
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.985 }}
          transition={{
            duration: 0.26,
            delay: Math.min(index * 0.04, 0.22),
            ease: [0.16, 1, 0.3, 1],
          }}
          onHoverStart={() => handleHoverChange(true)}
          onHoverEnd={() => handleHoverChange(false)}
          onTapStart={handleCardPress}
          className="group relative overflow-hidden rounded-[1.375rem] bg-[#0E0E13] shadow-[0_8px_24px_rgba(15,23,42,0.08)] dark:shadow-[0_10px_28px_rgba(0,0,0,0.45)] ring-1 ring-black/6 dark:ring-white/8 transition-shadow duration-200 hover:shadow-[0_14px_34px_rgba(225,29,72,0.16)]"
        >
          <TransitionLink
            href={`/watch/${video.id}`}
            videoId={video.id}
            data-vt-role="poster"
            aria-label={`Watch ${video.title}`}
            className="relative block aspect-[16/11] w-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            {!imgFailed ? (
              <motion.img
                src={video.thumbnailUrl}
                alt={video.title}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                animate={{ scale: isHovered ? 1.06 : 1 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-900 p-4 text-center text-zinc-300">
                <Play className="h-6 w-6 opacity-70 mb-2" />
                <span className="text-xs line-clamp-2">{video.title}</span>
              </div>
            )}

            {/* Measured Cinema Contrast Scrim (Guarantees >=7:1 White Text Legibility) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/92 via-black/38 to-black/15 transition-opacity duration-200"
            />

            {/* Top-Left: 18+ Content Rating, XXX Sticker & Duration */}
            <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
              <ContentRatingBadge
                rating={video.contentRating}
                variant="thumbnail"
              />
              <span className="inline-flex items-center rounded-md border border-rose-400/50 bg-rose-950/85 px-1.5 py-0.5 font-mono text-[0.625rem] font-extrabold uppercase tracking-wider text-rose-200 shadow-xs backdrop-blur-md">
                XXX
              </span>
              <span className="inline-flex items-center rounded-full bg-black/65 px-2.5 py-1 font-mono text-[0.6875rem] font-medium text-white tabular-nums backdrop-blur-md ring-1 ring-white/10">
                {formatDuration(video.durationSeconds)}
              </span>
            </div>

            {/* Bottom Content Overlay: Title + Clean Subtitle Left, Crimson Circular Play CTA Right */}
            <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3
                  data-vt-role="title"
                  className="font-display text-[0.9375rem] sm:text-base font-bold leading-snug text-white line-clamp-2 drop-shadow-xs"
                >
                  {video.title}
                </h3>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-300/95">
                  <span className="truncate">{video.category.name}</span>
                  <span aria-hidden="true" className="shrink-0">·</span>
                  <span className="shrink-0 tabular-nums text-zinc-300/85">
                    {formatViews(video.views)} views
                  </span>
                </p>
              </div>

              <span
                ref={playBadgeRef}
                aria-hidden="true"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-600/40 transition-colors duration-200 group-hover:bg-rose-500"
              >
                <Play className="h-4 w-4 fill-current ml-0.5" />
              </span>
            </div>
          </TransitionLink>

          {/* Top-Right: Favorite Heart + Quick Share Circular Glass Buttons */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <motion.button
              type="button"
              onClick={handleShareClick}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.88 }}
              aria-label={`Share ${video.title}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md ring-1 ring-white/15 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-black/80 transition-all cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5" />
            </motion.button>

            {onToggleBookmark && (
              <motion.button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleBookmark(video.id);
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.86 }}
                aria-label={
                  video.isBookmarked
                    ? `Remove ${video.title} from favorites`
                    : `Save ${video.title} to favorites`
                }
                className={cn(
                  'inline-flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md ring-1 transition-all cursor-pointer',
                  video.isBookmarked
                    ? 'bg-rose-600/90 text-white ring-rose-400/50 shadow-sm'
                    : 'bg-black/55 text-white/90 ring-white/15 hover:bg-black/80 hover:text-white'
                )}
              >
                <Heart
                  className={cn('h-3.5 w-3.5', video.isBookmarked && 'fill-current')}
                />
              </motion.button>
            )}
          </div>
        </motion.article>

        {!onShare && (
          <ShareModal
            target={localShareTarget}
            onClose={() => setLocalShareTarget(null)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <motion.article
        data-vt-video-id={video.id}
        data-vt-source="card"
        data-gsap-card
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.25,
          delay: Math.min(index * 0.035, 0.2),
          ease: [0.16, 1, 0.3, 1],
        }}
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.985 }}
        onHoverStart={() => handleHoverChange(true)}
        onHoverEnd={() => handleHoverChange(false)}
        onTapStart={handleCardPress}
        className="group relative flex flex-col"
      >
        {/* 16:9 Edge-to-Edge Video Thumbnail */}
        <div
          data-vt-role="poster"
          className="relative aspect-video w-full overflow-hidden rounded-2xl bg-zinc-200 dark:bg-zinc-900 ring-1 ring-black/6 dark:ring-white/6 transition-all duration-200 group-hover:ring-rose-500/40"
        >
          <TransitionLink
            href={`/watch/${video.id}`}
            videoId={video.id}
            aria-label={`Watch ${video.title}`}
            className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            {!imgFailed ? (
              <motion.img
                src={video.thumbnailUrl}
                alt={video.title}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                animate={{ scale: isHovered ? 1.05 : 1 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-900 p-4 text-center text-zinc-300">
                <Play className="h-6 w-6 opacity-70 mb-2" />
                <span className="text-xs line-clamp-2">{video.title}</span>
              </div>
            )}

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/15 opacity-75 group-hover:opacity-95 transition-opacity duration-200"
            />

            <div className="pointer-events-none absolute top-2.5 left-2.5 flex items-center gap-1.5">
              <ContentRatingBadge
                rating={video.contentRating}
                variant="thumbnail"
              />
              <span className="inline-flex items-center rounded-md border border-rose-400/50 bg-rose-950/85 px-1.5 py-0.5 font-mono text-[0.625rem] font-extrabold uppercase tracking-wider text-rose-200 shadow-xs backdrop-blur-md">
                XXX
              </span>
            </div>

            <motion.div
              aria-hidden="true"
              initial={false}
              animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.9 }}
              transition={{ duration: 0.16 }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-600/95 text-white shadow-lg">
                <Play className="h-5 w-5 fill-current ml-0.5" />
              </div>
            </motion.div>

            <span className="pointer-events-none absolute right-2.5 bottom-2 rounded-full bg-black/80 px-2 py-0.5 font-mono text-[0.6875rem] font-medium text-white tabular-nums tracking-tight">
              {formatDuration(video.durationSeconds)}
            </span>
          </TransitionLink>

          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
            <motion.button
              type="button"
              onClick={handleShareClick}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.88 }}
              aria-label={`Share ${video.title}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/75 text-zinc-200 backdrop-blur-xs opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-black hover:text-white transition-all cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5" />
            </motion.button>

            {onToggleBookmark && (
              <motion.button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleBookmark(video.id);
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.86 }}
                aria-label={
                  video.isBookmarked
                    ? `Remove ${video.title} from saved videos`
                    : `Save ${video.title} to watch later`
                }
                className={cn(
                  'inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/75 text-white backdrop-blur-xs transition-all cursor-pointer',
                  video.isBookmarked
                    ? 'opacity-100 text-rose-400'
                    : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-black text-zinc-200'
                )}
              >
                <Bookmark
                  className={cn('h-3.5 w-3.5', video.isBookmarked && 'fill-current')}
                />
              </motion.button>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-start gap-3">
          <Link
            href={`/creator/${video.creator.username}`}
            className="shrink-0 mt-0.5"
            aria-label={`Visit ${video.creator.name}'s channel`}
          >
            <EducatorAvatar
              name={video.creator.name}
              src={video.creator.avatarUrl}
              size="sm"
            />
          </Link>

          <div className="min-w-0 flex-1">
            <h3
              data-vt-role="title"
              className="text-[0.9375rem] font-semibold leading-snug text-zinc-900 dark:text-zinc-100 line-clamp-2 group-hover:text-rose-600 dark:group-hover:text-white transition-colors"
            >
              <TransitionLink
                href={`/watch/${video.id}`}
                videoId={video.id}
                className="focus:outline-none"
              >
                {video.title}
              </TransitionLink>
            </h3>

            <Link
              href={`/creator/${video.creator.username}`}
              className="mt-1 inline-flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200 transition-colors max-w-full"
            >
              <span className="truncate">{video.creator.name}</span>
              {video.creator.isEducator && (
                <span
                  title="Verified Educator"
                  className="inline-flex shrink-0 text-rose-600 dark:text-rose-500"
                >
                  <BadgeCheck className="h-3.5 w-3.5" aria-label="Verified Educator" />
                </span>
              )}
            </Link>

            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
              <span>{formatViews(video.views)} views</span>
              <span aria-hidden="true">·</span>
              <span>{formatEditorialDate(video.createdAt)}</span>
              <span aria-hidden="true">·</span>
              <span className="text-zinc-500 truncate">{video.category.name}</span>
            </div>
          </div>
        </div>
      </motion.article>

      {!onShare && (
        <ShareModal
          target={localShareTarget}
          onClose={() => setLocalShareTarget(null)}
        />
      )}
    </>
  );
}
