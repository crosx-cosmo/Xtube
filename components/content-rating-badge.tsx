'use client';

import * as React from 'react';
import { Info, ShieldCheck, X } from 'lucide-react';
import {
  type ContentRatingCode,
  resolveContentRating,
} from '@/lib/content-rating';
import { cn } from '@/lib/utils';

export type ContentRatingBadgeVariant =
  | 'micro'
  | 'thumbnail'
  | 'player-overlay'
  | 'player-header';

export interface ContentRatingBadgeProps {
  rating?: ContentRatingCode | string | null;
  variant?: ContentRatingBadgeVariant;
  /** When true on 'thumbnail', shows compact label alongside Adults Only context. */
  showLabel?: boolean;
  /** Enables interactive transparency notice popover (ideal for player headers). */
  interactive?: boolean;
  className?: string;
}

/**
 * Reusable 18+ Content Rating & RTA Transparency Badge for video thumbnails
 * and video player headers. Meets WCAG AA contrast and supports keyboard-accessible
 * transparency disclosure popovers without obstructing playback controls.
 */
export function ContentRatingBadge({
  rating,
  variant = 'thumbnail',
  showLabel = false,
  interactive = false,
  className,
}: ContentRatingBadgeProps) {
  const info = resolveContentRating(rating);
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLSpanElement | null>(null);
  const popoverId = React.useId();

  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [open]);

  if (variant === 'micro') {
    return (
      <span
        data-testid="content-rating-badge"
        data-rating-variant="micro"
        data-content-rating={info.code}
        title={`${info.headerLabel} · ${info.rtaCode}`}
        aria-label={info.ariaLabel}
        className={cn(
          'pointer-events-none inline-flex items-center rounded-md bg-black/85 px-1.5 py-0.5 font-mono text-[0.625rem] font-bold leading-none tracking-tight text-amber-200 border border-rose-500/60 shadow-xs backdrop-blur-xs whitespace-nowrap shrink-0 tabular-nums',
          className
        )}
      >
        {info.compactLabel}
      </span>
    );
  }

  if (variant === 'thumbnail') {
    return (
      <span
        data-testid="content-rating-badge"
        data-rating-variant="thumbnail"
        data-content-rating={info.code}
        title={`${info.headerLabel} · ${info.rtaCode}`}
        aria-label={info.ariaLabel}
        className={cn(
          'pointer-events-none inline-flex items-center gap-1 rounded-md bg-black/80 px-2 py-1 font-mono text-[0.6875rem] font-bold leading-none tracking-tight text-white border border-rose-500/65 shadow-xs backdrop-blur-md whitespace-nowrap shrink-0 tabular-nums',
          className
        )}
      >
        <ShieldCheck
          className="h-3 w-3 text-amber-300 shrink-0"
          aria-hidden="true"
        />
        <span>{showLabel ? info.headerLabel : info.compactLabel}</span>
      </span>
    );
  }

  const isPlayerOverlay = variant === 'player-overlay';

  const triggerClasses = isPlayerOverlay
    ? 'inline-flex items-center gap-1.5 rounded-lg bg-black/80 border border-rose-500/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md hover:border-amber-400/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 transition-colors whitespace-nowrap shrink-0'
    : 'inline-flex items-center gap-1.5 rounded-lg bg-rose-50/95 dark:bg-rose-950/45 border border-rose-200 dark:border-rose-500/35 px-2.5 py-1 text-xs font-semibold text-rose-800 dark:text-rose-200 hover:border-rose-400 dark:hover:border-amber-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 transition-colors whitespace-nowrap shrink-0';

  const labelContent = (
    <>
      <ShieldCheck
        className={cn(
          'h-3.5 w-3.5 shrink-0',
          isPlayerOverlay
            ? 'text-amber-300'
            : 'text-rose-600 dark:text-amber-300'
        )}
        aria-hidden="true"
      />
      <span className="font-mono font-bold tabular-nums">{info.compactLabel}</span>
      <span
        aria-hidden="true"
        className={cn(
          'hidden sm:inline',
          isPlayerOverlay
            ? 'text-white/35'
            : 'text-rose-300 dark:text-rose-500/50'
        )}
      >
        ·
      </span>
      <span className="hidden sm:inline">
        {isPlayerOverlay ? 'Adults Only' : 'Adults Only · RTA'}
      </span>
      {interactive && (
        <Info
          className={cn(
            'h-3 w-3 shrink-0 opacity-75',
            isPlayerOverlay
              ? 'text-zinc-300'
              : 'text-rose-500 dark:text-rose-300'
          )}
          aria-hidden="true"
        />
      )}
    </>
  );

  if (!interactive) {
    return (
      <span
        data-testid="content-rating-badge"
        data-rating-variant={variant}
        data-content-rating={info.code}
        title={`${info.headerLabel} · ${info.rtaCode}`}
        aria-label={info.ariaLabel}
        className={cn(triggerClasses, className)}
      >
        {labelContent}
      </span>
    );
  }

  return (
    <span
      ref={containerRef}
      className={cn('relative inline-flex items-center pointer-events-auto', className)}
    >
      <button
        type="button"
        data-testid="content-rating-badge"
        data-rating-variant={variant}
        data-content-rating={info.code}
        aria-label={info.ariaLabel}
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className={cn(triggerClasses, 'cursor-pointer')}
      >
        {labelContent}
      </button>

      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-label={info.advisoryTitle}
          data-testid="content-rating-popover"
          className={cn(
            'absolute top-full mt-2 z-50 w-[min(19rem,84vw)] rounded-xl border p-3.5 text-left shadow-2xl backdrop-blur-xl',
            isPlayerOverlay
              ? 'left-0 bg-[#0E0D12]/96 border-amber-400/35 text-zinc-100'
              : 'right-0 bg-white dark:bg-[#141319] border-zinc-200 dark:border-amber-400/30 text-zinc-900 dark:text-zinc-100'
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <ShieldCheck
                className="h-4 w-4 text-amber-500 dark:text-amber-300 shrink-0"
                aria-hidden="true"
              />
              <p className="font-display text-xs font-bold leading-snug">
                {info.advisoryTitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close content rating details"
              className={cn(
                'inline-flex h-5 w-5 items-center justify-center rounded-md transition-colors cursor-pointer shrink-0',
                isPlayerOverlay
                  ? 'text-zinc-400 hover:bg-white/10 hover:text-white'
                  : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
              )}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <p
            className={cn(
              'mt-2 text-xs leading-relaxed',
              isPlayerOverlay
                ? 'text-zinc-300'
                : 'text-zinc-600 dark:text-zinc-300'
            )}
          >
            {info.advisoryText}
          </p>

          <div
            className={cn(
              'mt-2.5 pt-2 border-t flex items-center justify-between gap-2 font-mono text-[0.6875rem] tabular-nums',
              isPlayerOverlay
                ? 'border-white/10 text-amber-300'
                : 'border-zinc-200 dark:border-zinc-800 text-rose-700 dark:text-amber-300'
            )}
          >
            <span>Min. Age: {info.minAge}+</span>
            <span className="truncate text-[0.625rem] opacity-85">
              {info.rtaCode}
            </span>
          </div>
        </div>
      )}
    </span>
  );
}
