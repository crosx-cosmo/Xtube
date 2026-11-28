export const VIDEO_REACTION_TYPES = [
  'heart',
  'fire',
  'clap',
  'kiss',
  'mindblown',
] as const;

export type VideoReactionType = (typeof VIDEO_REACTION_TYPES)[number];

export type VideoReactionCounts = Record<VideoReactionType, number>;

export interface VideoReactionState {
  counts: VideoReactionCounts;
  viewerReactions: VideoReactionType[];
}

export interface VideoReactionMeta {
  type: VideoReactionType;
  emoji: string;
  label: string;
  activeRingClass: string;
  activeBgClass: string;
  activeTextClass: string;
}

export const VIDEO_REACTION_CATALOG: readonly VideoReactionMeta[] = [
  {
    type: 'heart',
    emoji: '❤️',
    label: 'Heart',
    activeRingClass: 'border-rose-500/70 dark:border-rose-400/70',
    activeBgClass: 'bg-rose-500/15 dark:bg-rose-500/20',
    activeTextClass: 'text-rose-700 dark:text-rose-200',
  },
  {
    type: 'fire',
    emoji: '🔥',
    label: 'Fire',
    activeRingClass: 'border-amber-500/70 dark:border-amber-400/70',
    activeBgClass: 'bg-amber-500/15 dark:bg-amber-500/20',
    activeTextClass: 'text-amber-800 dark:text-amber-200',
  },
  {
    type: 'clap',
    emoji: '👏',
    label: 'Clap',
    activeRingClass: 'border-emerald-500/70 dark:border-emerald-400/70',
    activeBgClass: 'bg-emerald-500/15 dark:bg-emerald-500/20',
    activeTextClass: 'text-emerald-800 dark:text-emerald-200',
  },
  {
    type: 'kiss',
    emoji: '💋',
    label: 'Kiss',
    activeRingClass: 'border-fuchsia-500/70 dark:border-fuchsia-400/70',
    activeBgClass: 'bg-fuchsia-500/15 dark:bg-fuchsia-500/20',
    activeTextClass: 'text-fuchsia-800 dark:text-fuchsia-200',
  },
  {
    type: 'mindblown',
    emoji: '🤯',
    label: 'Mind-Blown',
    activeRingClass: 'border-violet-500/70 dark:border-violet-400/70',
    activeBgClass: 'bg-violet-500/15 dark:bg-violet-500/20',
    activeTextClass: 'text-violet-800 dark:text-violet-200',
  },
] as const;

const VALID_REACTION_SET = new Set<string>(VIDEO_REACTION_TYPES);

/**
 * Type guard verifying whether an untrusted value is a valid VideoReactionType.
 */
export function isValidVideoReactionType(
  value: unknown
): value is VideoReactionType {
  return typeof value === 'string' && VALID_REACTION_SET.has(value);
}

/**
 * Creates a zeroed reaction count map for all supported emoji reaction types.
 */
export function createEmptyReactionCounts(): VideoReactionCounts {
  return {
    heart: 0,
    fire: 0,
    clap: 0,
    kiss: 0,
    mindblown: 0,
  };
}

/**
 * Normalizes partial or untrusted reaction state into a complete, non-negative
 * VideoReactionState with deduplicated viewer reactions in canonical order.
 */
export function normalizeReactionState(
  input?: {
    counts?: Partial<Record<string, number>> | null;
    viewerReactions?: readonly string[] | null;
  } | null
): VideoReactionState {
  const counts = createEmptyReactionCounts();
  if (input?.counts && typeof input.counts === 'object') {
    for (const type of VIDEO_REACTION_TYPES) {
      const raw = input.counts[type];
      if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
        counts[type] = Math.floor(raw);
      }
    }
  }

  const activeSet = new Set<VideoReactionType>();
  if (Array.isArray(input?.viewerReactions)) {
    for (const item of input.viewerReactions) {
      if (isValidVideoReactionType(item)) {
        activeSet.add(item);
      }
    }
  }

  const viewerReactions = VIDEO_REACTION_TYPES.filter((type) =>
    activeSet.has(type)
  );

  // Ensure a count is at least 1 if the current viewer has reacted with it
  for (const type of viewerReactions) {
    if (counts[type] < 1) {
      counts[type] = 1;
    }
  }

  return { counts, viewerReactions };
}

/**
 * Applies an optimistic toggle for a single reaction type and returns the new
 * immutable state along with whether the reaction was turned on or off.
 */
export function applyOptimisticReactionToggle(
  current: VideoReactionState,
  reaction: VideoReactionType
): { nextState: VideoReactionState; toggledOn: boolean } {
  const normalized = normalizeReactionState(current);
  const currentlyActive = normalized.viewerReactions.includes(reaction);
  const toggledOn = !currentlyActive;

  const nextCounts: VideoReactionCounts = {
    ...normalized.counts,
    [reaction]: Math.max(
      0,
      normalized.counts[reaction] + (toggledOn ? 1 : -1)
    ),
  };

  const nextViewerReactions = toggledOn
    ? VIDEO_REACTION_TYPES.filter(
        (type) => type === reaction || normalized.viewerReactions.includes(type)
      )
    : normalized.viewerReactions.filter((type) => type !== reaction);

  return {
    nextState: {
      counts: nextCounts,
      viewerReactions: nextViewerReactions,
    },
    toggledOn,
  };
}

/**
 * Computes the sum of all emoji reactions on a video.
 */
export function getTotalReactionsCount(counts: VideoReactionCounts): number {
  let total = 0;
  for (const type of VIDEO_REACTION_TYPES) {
    const val = counts[type];
    if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
      total += Math.floor(val);
    }
  }
  return total;
}
