'use client';

import * as React from 'react';
import { flushSync } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import {
  VIEW_TRANSITION_NAMES,
  VIEW_TRANSITION_STORAGE_KEY,
  classifyTransitionRoute,
  extractVideoIdFromPath,
  isBrowsePath,
  normalizeInternalPathname,
  pickBestTargetIndex,
  type ViewTransitionDirection,
} from '@/lib/view-transition-utils';

interface ViewTransitionLike {
  ready: Promise<void>;
  finished: Promise<void>;
  skipTransition?: () => void;
}

type DocumentWithViewTransition = Document & {
  startViewTransition?: (
    callback: () => void | Promise<void>
  ) => ViewTransitionLike;
};

interface NavigateTransitionOptions {
  sourceElement?: HTMLElement | null;
  videoId?: string;
}

interface ViewTransitionContextValue {
  isTransitioning: boolean;
  navigateWithTransition: (
    href: string,
    options?: NavigateTransitionOptions
  ) => void;
  navigateBackToBrowse: (fallbackHref?: string) => void;
  runLayoutTransition: (
    update: () => void,
    stageElement?: HTMLElement | null
  ) => void;
}

const ViewTransitionContext =
  React.createContext<ViewTransitionContextValue | null>(null);

interface PendingNavigation {
  targetPathname: string;
  activeVideoId: string | null;
  direction: ViewTransitionDirection;
  resolveUpdate: () => void;
  timeoutId: number;
}

const VT_STYLE_ELEMENTS = new Set<HTMLElement>();

function clearActiveTransitionNames() {
  for (const el of VT_STYLE_ELEMENTS) {
    el.style.viewTransitionName = '';
  }
  VT_STYLE_ELEMENTS.clear();
}

function assignTransitionName(el: HTMLElement | null, name: string) {
  if (!el) return;
  el.style.viewTransitionName = name;
  VT_STYLE_ELEMENTS.add(el);
}

function isElementInViewport(el: HTMLElement): { inViewport: boolean; area: number } {
  const rect = el.getBoundingClientRect();
  const area = Math.max(0, rect.width) * Math.max(0, rect.height);
  if (area <= 0) {
    return { inViewport: false, area: 0 };
  }
  const vh = window.innerHeight || 900;
  const vw = window.innerWidth || 1440;
  const inViewport =
    rect.bottom > 0 && rect.top < vh && rect.right > 0 && rect.left < vw;
  return { inViewport, area };
}

function stampContainerSharedElements(container: HTMLElement | null) {
  if (!container) return;
  const poster =
    (container.matches('[data-vt-role="poster"]')
      ? container
      : container.querySelector<HTMLElement>('[data-vt-role="poster"]')) ??
    container;

  const { area: posterArea } = isElementInViewport(poster);
  if (posterArea > 0) {
    assignTransitionName(poster, VIEW_TRANSITION_NAMES.stage);
  }

  const title = container.querySelector<HTMLElement>('[data-vt-role="title"]');
  if (title) {
    const { area: titleArea } = isElementInViewport(title);
    if (titleArea > 0) {
      assignTransitionName(title, VIEW_TRANSITION_NAMES.title);
    }
  }
}

function findBestVideoContainer(
  videoId: string,
  preferredSource?: 'player' | 'browse'
): HTMLElement | null {
  if (typeof document === 'undefined') return null;

  const selector = `[data-vt-video-id="${CSS.escape(videoId)}"]`;
  const allNodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
  if (allNodes.length === 0) return null;

  const filtered = allNodes.filter((el) => {
    const src = el.dataset.vtSource ?? 'card';
    if (preferredSource === 'player') return src === 'player';
    if (preferredSource === 'browse') return src !== 'player';
    return true;
  });

  const pool = filtered.length > 0 ? filtered : allNodes;
  const candidates = pool.map((el) => {
    const poster =
      el.querySelector<HTMLElement>('[data-vt-role="poster"]') ?? el;
    const { inViewport, area } = isElementInViewport(poster);
    return {
      source: el.dataset.vtSource ?? 'card',
      inViewport,
      area,
    };
  });

  const bestIdx = pickBestTargetIndex(candidates);
  return bestIdx >= 0 ? pool[bestIdx] : null;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function ViewTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  const lastBrowseHrefRef = React.useRef<string>('/');
  const pendingRef = React.useRef<PendingNavigation | null>(null);
  const activeTransitionRef = React.useRef<ViewTransitionLike | null>(null);
  const lastPathnameRef = React.useRef<string>(pathname);

  // Track the latest browsing URL so Watch pages can smoothly return to the exact feed/filter
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isBrowsePath(pathname)) {
      const fullHref = `${window.location.pathname}${window.location.search}`;
      lastBrowseHrefRef.current = fullHref;
      try {
        window.sessionStorage.setItem(VIEW_TRANSITION_STORAGE_KEY, fullHref);
      } catch {
        // Ignore private browsing storage failures
      }
    } else {
      try {
        const stored = window.sessionStorage.getItem(VIEW_TRANSITION_STORAGE_KEY);
        if (stored && isBrowsePath(stored)) {
          lastBrowseHrefRef.current = stored;
        }
      } catch {
        // Ignore storage errors
      }
    }
  }, [pathname]);

  // Synchronously stamp destination shared elements and resolve the View Transition when the route commits
  React.useLayoutEffect(() => {
    const prevPath = lastPathnameRef.current;
    lastPathnameRef.current = pathname;

    const pending = pendingRef.current;
    if (!pending) return;

    const currentNorm = normalizeInternalPathname(pathname);
    const matchesTarget = currentNorm === pending.targetPathname;
    const pathChanged = currentNorm !== normalizeInternalPathname(prevPath);

    if (matchesTarget || pathChanged) {
      window.clearTimeout(pending.timeoutId);
      clearActiveTransitionNames();

      if (pending.activeVideoId) {
        if (
          pending.direction === 'to-watch' ||
          pending.direction === 'to-video'
        ) {
          const watchStage = findBestVideoContainer(
            pending.activeVideoId,
            'player'
          );
          stampContainerSharedElements(watchStage);
        } else if (pending.direction === 'to-browse') {
          const browseCard = findBestVideoContainer(
            pending.activeVideoId,
            'browse'
          );
          stampContainerSharedElements(browseCard);
        }
      }

      const resolve = pending.resolveUpdate;
      pendingRef.current = null;
      resolve();
    }
  }, [pathname]);

  // Ensure any leftover transition state is cleaned up on unmount
  React.useEffect(() => {
    return () => {
      if (pendingRef.current) {
        window.clearTimeout(pendingRef.current.timeoutId);
        pendingRef.current.resolveUpdate();
        pendingRef.current = null;
      }
      clearActiveTransitionNames();
    };
  }, []);

  const navigateWithTransition = React.useCallback(
    (href: string, options?: NavigateTransitionOptions) => {
      if (typeof window === 'undefined') {
        router.push(href);
        return;
      }

      const currentPath = window.location.pathname;
      const currentFull = `${window.location.pathname}${window.location.search}`;
      if (href === currentFull) return;

      const classification = classifyTransitionRoute(currentPath, href);
      const doc = document as DocumentWithViewTransition;

      if (
        !classification.shouldAnimate ||
        prefersReducedMotion() ||
        typeof doc.startViewTransition !== 'function'
      ) {
        router.push(href);
        return;
      }

      // If another navigation transition is already in flight, settle it cleanly first
      if (pendingRef.current) {
        window.clearTimeout(pendingRef.current.timeoutId);
        pendingRef.current.resolveUpdate();
        pendingRef.current = null;
      }
      if (activeTransitionRef.current?.skipTransition) {
        try {
          activeTransitionRef.current.skipTransition();
        } catch {
          // Ignore if already finished
        }
      }

      clearActiveTransitionNames();

      const activeVideoId =
        options?.videoId ?? classification.activeVideoId ?? extractVideoIdFromPath(currentPath);

      // Stamp the OLD snapshot shared element (strictly one container to prevent duplicate name aborts)
      if (activeVideoId) {
        if (
          classification.direction === 'to-watch' ||
          classification.direction === 'to-video'
        ) {
          const clickedContainer =
            options?.sourceElement?.closest<HTMLElement>('[data-vt-video-id]') ??
            findBestVideoContainer(activeVideoId, 'browse');
          stampContainerSharedElements(clickedContainer);
        } else if (classification.direction === 'to-browse') {
          const watchContainer = findBestVideoContainer(activeVideoId, 'player');
          stampContainerSharedElements(watchContainer);
        }
      }

      const root = document.documentElement;
      root.dataset.vt = 'nav';
      root.dataset.vtDirection = classification.direction;
      setIsTransitioning(true);

      const targetPathname = normalizeInternalPathname(href);
      const samePathnameQueryOnly =
        targetPathname === normalizeInternalPathname(currentPath);

      const transition = doc.startViewTransition(() => {
        return new Promise<void>((resolve) => {
          const safeResolve = () => {
            resolve();
          };

          const timeoutId = window.setTimeout(() => {
            if (pendingRef.current?.resolveUpdate === safeResolve) {
              pendingRef.current = null;
            }
            safeResolve();
          }, 2600);

          if (samePathnameQueryOnly) {
            React.startTransition(() => {
              router.push(href);
            });
            window.requestAnimationFrame(() => {
              window.clearTimeout(timeoutId);
              safeResolve();
            });
            return;
          }

          pendingRef.current = {
            targetPathname,
            activeVideoId,
            direction: classification.direction,
            resolveUpdate: safeResolve,
            timeoutId,
          };

          React.startTransition(() => {
            router.push(href);
          });
        });
      });

      activeTransitionRef.current = transition;

      transition.finished
        .catch(() => {
          // Gracefully ignore interrupted/skipped transitions
        })
        .finally(() => {
          if (activeTransitionRef.current === transition) {
            activeTransitionRef.current = null;
          }
          clearActiveTransitionNames();
          if (root.dataset.vt === 'nav') {
            delete root.dataset.vt;
            delete root.dataset.vtDirection;
          }
          setIsTransitioning(false);
        });
    },
    [router]
  );

  const navigateBackToBrowse = React.useCallback(
    (fallbackHref = '/') => {
      let candidate = lastBrowseHrefRef.current;
      if ((!candidate || !isBrowsePath(candidate)) && typeof window !== 'undefined') {
        try {
          const stored = window.sessionStorage.getItem(VIEW_TRANSITION_STORAGE_KEY);
          if (stored && isBrowsePath(stored)) {
            candidate = stored;
          }
        } catch {
          // Ignore storage errors
        }
      }
      const destination =
        candidate && isBrowsePath(candidate) ? candidate : fallbackHref;
      navigateWithTransition(destination);
    },
    [navigateWithTransition]
  );

  const runLayoutTransition = React.useCallback(
    (update: () => void, stageElement?: HTMLElement | null) => {
      if (typeof document === 'undefined') {
        update();
        return;
      }

      const doc = document as DocumentWithViewTransition;
      if (prefersReducedMotion() || typeof doc.startViewTransition !== 'function') {
        update();
        return;
      }

      clearActiveTransitionNames();
      if (stageElement) {
        assignTransitionName(stageElement, VIEW_TRANSITION_NAMES.stage);
      }

      const root = document.documentElement;
      root.dataset.vt = 'theater';

      const transition = doc.startViewTransition(() => {
        flushSync(() => {
          update();
        });
        // Re-attach the stage transition name if the player remounted into the theater slot
        const activePlayer = document.querySelector<HTMLElement>(
          '[data-vt-source="player"] [data-vt-role="poster"]'
        );
        if (activePlayer) {
          assignTransitionName(activePlayer, VIEW_TRANSITION_NAMES.stage);
        }
      });

      transition.finished
        .catch(() => {})
        .finally(() => {
          clearActiveTransitionNames();
          if (root.dataset.vt === 'theater') {
            delete root.dataset.vt;
          }
        });
    },
    []
  );

  const value = React.useMemo<ViewTransitionContextValue>(
    () => ({
      isTransitioning,
      navigateWithTransition,
      navigateBackToBrowse,
      runLayoutTransition,
    }),
    [
      isTransitioning,
      navigateWithTransition,
      navigateBackToBrowse,
      runLayoutTransition,
    ]
  );

  return (
    <ViewTransitionContext.Provider value={value}>
      {children}
    </ViewTransitionContext.Provider>
  );
}

export function useViewTransition(): ViewTransitionContextValue {
  const ctx = React.useContext(ViewTransitionContext);
  if (!ctx) {
    throw new Error(
      'useViewTransition must be used within a ViewTransitionProvider'
    );
  }
  return ctx;
}
