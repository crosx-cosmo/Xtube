'use client';

import * as React from 'react';
import Link, { type LinkProps } from 'next/link';
import { useViewTransition } from '@/components/view-transition-provider';
import { shouldInterceptLinkClick } from '@/lib/view-transition-utils';

export interface TransitionLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>,
    LinkProps {
  videoId?: string;
  children: React.ReactNode;
}

/**
 * Drop-in Next.js Link wrapper that coordinates native View Transition API
 * morph animations between video browsing and watching pages while preserving
 * prefetching, middle-click/Cmd-click behavior, and progressive fallback.
 */
export function TransitionLink({
  href,
  videoId,
  onClick,
  target,
  children,
  ...rest
}: TransitionLinkProps) {
  const { navigateWithTransition } = useViewTransition();
  const hrefString = typeof href === 'string' ? href : href.pathname ?? '/';

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);

    if (
      !shouldInterceptLinkClick(
        {
          button: e.button,
          metaKey: e.metaKey,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          defaultPrevented: e.defaultPrevented,
          target: target ?? e.currentTarget.target,
        },
        hrefString
      )
    ) {
      return;
    }

    e.preventDefault();
    navigateWithTransition(hrefString, {
      sourceElement: e.currentTarget,
      videoId,
    });
  };

  return (
    <Link href={href} target={target} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
