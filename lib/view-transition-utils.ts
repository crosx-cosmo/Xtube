export type ViewTransitionDirection =
  | 'to-watch'
  | 'to-browse'
  | 'to-video'
  | 'crossfade';

export const VIEW_TRANSITION_NAMES = {
  stage: 'video-stage',
  title: 'video-title',
  header: 'app-header',
} as const;

export const VIEW_TRANSITION_STORAGE_KEY = 'kinship:last-vt-video';

export interface TransitionRouteClassification {
  direction: ViewTransitionDirection;
  fromVideoId: string | null;
  toVideoId: string | null;
  activeVideoId: string | null;
  shouldAnimate: boolean;
}

export interface LinkClickEventMeta {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
  target?: string | null;
}

export interface TransitionTargetCandidate {
  source: 'hero' | 'card' | 'continue' | 'upnext' | 'player' | string;
  inViewport: boolean;
  area: number;
}

/**
 * Normalize an internal href or pathname to its pathname component without query/hash.
 */
export function normalizeInternalPathname(href: string): string {
  const trimmed = href.trim();
  if (!trimmed) return '/';
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return new URL(trimmed).pathname || '/';
    }
    const [pathOnly] = trimmed.split(/[?#]/);
    if (!pathOnly) return '/';
    return pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
  } catch {
    return '/';
  }
}

/**
 * Extract the video ID from a `/watch/[id]` route path, or return null otherwise.
 */
export function extractVideoIdFromPath(path: string): string | null {
  const normalized = normalizeInternalPathname(path);
  const match = /^\/watch\/([^/]+)\/?$/.exec(normalized);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/**
 * Determine whether a pathname is a public video browsing surface (feed, library, creator, educators).
 */
export function isBrowsePath(path: string): boolean {
  const normalized = normalizeInternalPathname(path);
  if (normalized === '/') return true;
  if (normalized === '/library' || normalized.startsWith('/library/')) return true;
  if (normalized === '/educators' || normalized.startsWith('/educators/')) return true;
  if (normalized.startsWith('/creator/')) return true;
  return false;
}

/**
 * Classify a client-side navigation between `fromPath` and `toHref` for View Transitions.
 */
export function classifyTransitionRoute(
  fromPath: string,
  toHref: string
): TransitionRouteClassification {
  const fromNorm = normalizeInternalPathname(fromPath);
  const toNorm = normalizeInternalPathname(toHref);

  // Skip animations for admin panel transitions or identical route + query
  if (fromNorm.startsWith('/admin') || toNorm.startsWith('/admin')) {
    return {
      direction: 'crossfade',
      fromVideoId: null,
      toVideoId: null,
      activeVideoId: null,
      shouldAnimate: false,
    };
  }

  const fromVideoId = extractVideoIdFromPath(fromNorm);
  const toVideoId = extractVideoIdFromPath(toNorm);

  // Navigating to the exact same watch page is a no-op
  if (fromVideoId && toVideoId && fromVideoId === toVideoId) {
    return {
      direction: 'crossfade',
      fromVideoId,
      toVideoId,
      activeVideoId: null,
      shouldAnimate: false,
    };
  }

  if (!fromVideoId && toVideoId) {
    return {
      direction: 'to-watch',
      fromVideoId: null,
      toVideoId,
      activeVideoId: toVideoId,
      shouldAnimate: true,
    };
  }

  if (fromVideoId && !toVideoId) {
    return {
      direction: 'to-browse',
      fromVideoId,
      toVideoId: null,
      activeVideoId: fromVideoId,
      shouldAnimate: true,
    };
  }

  if (fromVideoId && toVideoId) {
    return {
      direction: 'to-video',
      fromVideoId,
      toVideoId,
      activeVideoId: toVideoId,
      shouldAnimate: true,
    };
  }

  // Navigating between two browse surfaces (e.g. Home -> Library)
  const shouldAnimate = fromNorm !== toNorm || toHref.includes('?');
  return {
    direction: 'crossfade',
    fromVideoId: null,
    toVideoId: null,
    activeVideoId: null,
    shouldAnimate,
  };
}

/**
 * Decide whether a click on an anchor should be intercepted for a View Transition.
 * Respects modified clicks (new tab/window), external URLs, hash links, and non-left clicks.
 */
export function shouldInterceptLinkClick(
  meta: LinkClickEventMeta,
  href: string
): boolean {
  if (meta.defaultPrevented) return false;
  if (meta.button !== 0) return false;
  if (meta.metaKey || meta.ctrlKey || meta.shiftKey || meta.altKey) return false;
  if (meta.target && meta.target !== '_self') return false;

  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith('#')) return false;
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:')
  ) {
    return false;
  }

  return trimmed.startsWith('/');
}

const SOURCE_PRIORITY: Record<string, number> = {
  player: 5,
  card: 4,
  hero: 3,
  continue: 2,
  upnext: 1,
};

/**
 * Choose a single best DOM candidate index to receive `view-transition-name` when multiple
 * representations of the same video exist on a browsing page (e.g. Hero + Continue Watching).
 * Prioritizes visible in-viewport elements, then source priority, then largest visual area.
 */
export function pickBestTargetIndex(
  candidates: readonly TransitionTargetCandidate[]
): number {
  if (candidates.length === 0) return -1;

  let bestIndex = 0;
  let bestScore = -Infinity;

  for (let i = 0; i < candidates.length; i += 1) {
    const c = candidates[i];
    if (c.area <= 0) continue;
    const viewportBonus = c.inViewport ? 1_000_000 : 0;
    const sourceBonus = (SOURCE_PRIORITY[c.source] ?? 0) * 10_000;
    const areaScore = Math.min(c.area, 9_999);
    const score = viewportBonus + sourceBonus + areaScore;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return candidates[bestIndex]?.area > 0 ? bestIndex : -1;
}
