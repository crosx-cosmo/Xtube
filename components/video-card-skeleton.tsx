'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface VideoCardSkeletonProps {
  variant?: 'cinema' | 'standard';
  className?: string;
}

export function VideoCardSkeleton({
  variant = 'cinema',
  className,
}: VideoCardSkeletonProps) {
  if (variant === 'cinema') {
    return (
      <div
        data-testid="video-card-skeleton"
        aria-hidden="true"
        className={cn(
          'relative overflow-hidden rounded-[1.375rem] bg-white dark:bg-[#121218] ring-1 ring-zinc-200/85 dark:ring-white/8 shadow-[0_8px_24px_rgba(15,23,42,0.06)] dark:shadow-[0_10px_28px_rgba(0,0,0,0.42)]',
          className
        )}
      >
        <div className="relative aspect-[16/11] w-full overflow-hidden bg-zinc-200/75 dark:bg-[#171720]">
          {/* GPU-Composited Velvet Rose-Gold Shimmer Sweep */}
          <div className="velvet-skeleton-shimmer pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-rose-500/12 dark:via-rose-400/14 to-transparent" />

          {/* Top-Left Rating & Duration Pill Skeletons */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <span className="h-5 w-10 rounded-md bg-zinc-300/85 dark:bg-zinc-800/95" />
            <span className="h-5 w-9 rounded-md bg-rose-500/20 dark:bg-rose-500/25" />
            <span className="h-5 w-13 rounded-full bg-zinc-300/80 dark:bg-zinc-800/90" />
          </div>

          {/* Top-Right Action Button Skeletons */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <span className="h-8 w-8 rounded-full bg-zinc-300/70 dark:bg-zinc-800/80" />
            <span className="h-8 w-8 rounded-full bg-zinc-300/70 dark:bg-zinc-800/80" />
          </div>

          {/* Bottom Content Overlay Skeleton: Title + Metadata Left, Play CTA Right */}
          <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between gap-3 bg-gradient-to-t from-black/35 via-black/10 to-transparent dark:from-black/75 dark:via-black/25">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-4/5 rounded-md bg-zinc-300/95 dark:bg-zinc-700/90" />
              <div className="h-3.5 w-3/5 rounded-md bg-zinc-300/85 dark:bg-zinc-800/95" />
              <div className="flex items-center gap-2 pt-0.5">
                <span className="h-3 w-16 rounded bg-zinc-300/75 dark:bg-zinc-800/85" />
                <span className="h-3 w-14 rounded bg-zinc-300/75 dark:bg-zinc-800/85" />
              </div>
            </div>

            <span className="h-10 w-10 shrink-0 rounded-full bg-rose-500/35 dark:bg-rose-500/40 ring-1 ring-rose-400/30" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="video-card-skeleton"
      aria-hidden="true"
      className={cn('flex flex-col', className)}
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-200/80 dark:bg-[#171720] ring-1 ring-zinc-200/80 dark:ring-white/8">
        <div className="velvet-skeleton-shimmer pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-rose-500/12 dark:via-rose-400/14 to-transparent" />
      </div>
      <div className="mt-3 flex items-start gap-3">
        <span className="h-8 w-8 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-5/6 rounded-md bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-3 w-2/3 rounded-md bg-zinc-200/80 dark:bg-zinc-800/80" />
        </div>
      </div>
    </div>
  );
}

interface VideoGridSkeletonProps {
  count?: number;
  variant?: 'cinema' | 'standard';
  testId?: string;
  label?: string;
  className?: string;
}

export function VideoGridSkeleton({
  count = 6,
  variant = 'cinema',
  testId = 'video-grid-skeleton',
  label = 'Loading videos',
  className,
}: VideoGridSkeletonProps) {
  const safeCount = Math.max(1, Math.min(12, count));
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      data-testid={testId}
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5',
        className
      )}
    >
      {Array.from({ length: safeCount }).map((_, idx) => (
        <VideoCardSkeleton key={idx} variant={variant} />
      ))}
      <span className="sr-only">{label}...</span>
    </div>
  );
}

export function HeroSpotlightSkeleton() {
  return (
    <div
      data-testid="hero-spotlight-skeleton"
      aria-hidden="true"
      className="relative mb-8 overflow-hidden rounded-[1.625rem] bg-zinc-200/80 dark:bg-[#121218] ring-1 ring-zinc-200/90 dark:ring-white/10 min-h-[clamp(19.5rem,40svh,23.75rem)] p-[clamp(1.25rem,2.4vw,2rem)] flex flex-col justify-between"
    >
      <div className="velvet-skeleton-shimmer pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-rose-500/12 dark:via-rose-400/15 to-transparent" />

      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="h-7 w-14 rounded-lg bg-zinc-300/90 dark:bg-zinc-800" />
          <span className="h-7 w-28 rounded-full bg-zinc-300/80 dark:bg-zinc-800/90" />
          <span className="h-7 w-20 rounded-md bg-rose-500/20 dark:bg-rose-500/25" />
        </div>
        <span className="h-7 w-16 rounded-full bg-zinc-300/80 dark:bg-zinc-800/90" />
      </div>

      <div className="relative z-10 mt-8 max-w-xl space-y-3">
        <div className="h-8 w-4/5 rounded-lg bg-zinc-300/95 dark:bg-zinc-700/90" />
        <div className="h-4 w-2/5 rounded-md bg-zinc-300/80 dark:bg-zinc-800" />
        <div className="h-4 w-3/4 rounded-md bg-zinc-300/75 dark:bg-zinc-800/85" />
        <div className="pt-2 flex items-center gap-2.5">
          <span className="h-11 w-28 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <span className="h-11 w-24 rounded-full bg-zinc-300/80 dark:bg-zinc-800" />
          <span className="h-11 w-11 rounded-full bg-zinc-300/80 dark:bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}

export function HomeFeedSkeleton() {
  return (
    <div
      data-testid="home-feed-skeleton"
      role="status"
      aria-busy="true"
      aria-label="Loading Hey Lady video feed"
      className="px-4 sm:px-6 lg:px-7 py-5 lg:py-6 mx-auto max-w-[95rem]"
    >
      <div className="flex flex-col xl:flex-row items-start gap-7">
        <div className="w-full flex-1 min-w-0">
          {/* Category Tab Bar Skeleton */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-hidden">
              {Array.from({ length: 5 }).map((_, idx) => (
                <span
                  key={idx}
                  className={cn(
                    'h-9 rounded-full shrink-0',
                    idx === 0
                      ? 'w-16 bg-rose-500/35 dark:bg-rose-500/40'
                      : 'w-24 bg-zinc-200/85 dark:bg-[#171720]'
                  )}
                />
              ))}
            </div>
            <span className="h-9 w-32 rounded-xl bg-zinc-200/85 dark:bg-[#171720] shrink-0" />
          </div>

          <HeroSpotlightSkeleton />

          {/* Trending Section Skeleton */}
          <div className="mb-9">
            <div className="mb-4 flex items-center justify-between">
              <span className="h-6 w-36 rounded-md bg-zinc-200 dark:bg-[#171720]" />
              <span className="h-4 w-14 rounded-md bg-zinc-200/80 dark:bg-[#171720]" />
            </div>
            <VideoGridSkeleton count={3} testId="trending-grid-skeleton" />
          </div>

          {/* Recommended Section Skeleton */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <span className="h-6 w-40 rounded-md bg-zinc-200 dark:bg-[#171720]" />
              <span className="h-4 w-16 rounded-md bg-zinc-200/80 dark:bg-[#171720]" />
            </div>
            <VideoGridSkeleton count={6} testId="video-grid-skeleton" />
          </div>
        </div>
      </div>
    </div>
  );
}
