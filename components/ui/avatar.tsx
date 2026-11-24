'use client';

import * as React from 'react';
import * as RadixAvatar from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/video-utils';

const MONOGRAM_SWATCHES = [
  'bg-rose-700 text-white',
  'bg-emerald-700 text-white',
  'bg-sky-700 text-white',
  'bg-amber-700 text-white',
  'bg-indigo-700 text-white',
];

function pickSwatch(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % MONOGRAM_SWATCHES.length;
  }
  return MONOGRAM_SWATCHES[Math.abs(hash) % MONOGRAM_SWATCHES.length];
}

interface EducatorAvatarProps {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  anonymous?: boolean;
  className?: string;
}

const sizeClasses: Record<NonNullable<EducatorAvatarProps['size']>, string> = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-20 w-20 text-2xl',
};

export function EducatorAvatar({
  name,
  src,
  size = 'md',
  anonymous = false,
  className,
}: EducatorAvatarProps) {
  const initials = anonymous ? '?' : getInitials(name);
  const swatch = anonymous
    ? 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200'
    : pickSwatch(name);

  return (
    <RadixAvatar.Root
      className={cn(
        'relative inline-flex shrink-0 overflow-hidden rounded-full select-none items-center justify-center ring-1 ring-black/10 dark:ring-white/10',
        sizeClasses[size],
        className
      )}
    >
      {!anonymous && src ? (
        <>
          <RadixAvatar.Image
            src={src}
            alt={name}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
          <RadixAvatar.Fallback
            delayMs={0}
            className={cn(
              'flex h-full w-full items-center justify-center font-display font-semibold tracking-tight',
              swatch
            )}
          >
            {initials}
          </RadixAvatar.Fallback>
        </>
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            'flex h-full w-full items-center justify-center font-display font-semibold tracking-tight',
            swatch
          )}
        >
          {initials}
        </span>
      )}
    </RadixAvatar.Root>
  );
}
