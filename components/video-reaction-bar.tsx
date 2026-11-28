'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { requestApiJson } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { formatViews as formatNumber } from '@/lib/video-utils';
import {
  applyOptimisticReactionToggle,
  getTotalReactionsCount,
  isValidVideoReactionType,
  normalizeReactionState,
  VIDEO_REACTION_CATALOG,
  type VideoReactionState,
  type VideoReactionType,
} from '@/lib/video-reactions';

interface VideoReactionBarProps {
  videoId: string;
  initialReactions?: VideoReactionState;
  className?: string;
}

interface BurstParticle {
  id: string;
  type: VideoReactionType;
  emoji: string;
  offsetX: number;
}

const LOCAL_REACTION_STORAGE_PREFIX = 'heylady_video_reactions_v1:';

const REACTION_ACCENT_STYLES: Record<
  VideoReactionType,
  {
    activeBorder: string;
    activeBg: string;
    activeText: string;
    badgeBg: string;
  }
> = {
  heart: {
    activeBorder: 'border-rose-500/70 dark:border-rose-400/70',
    activeBg: 'bg-rose-500/12 dark:bg-rose-500/20',
    activeText: 'text-rose-700 dark:text-rose-200',
    badgeBg: 'bg-rose-500/15 text-rose-700 dark:bg-rose-400/20 dark:text-rose-100',
  },
  fire: {
    activeBorder: 'border-amber-500/70 dark:border-amber-400/70',
    activeBg: 'bg-amber-500/12 dark:bg-amber-500/20',
    activeText: 'text-amber-800 dark:text-amber-200',
    badgeBg: 'bg-amber-500/15 text-amber-800 dark:bg-amber-400/20 dark:text-amber-100',
  },
  clap: {
    activeBorder: 'border-emerald-500/70 dark:border-emerald-400/70',
    activeBg: 'bg-emerald-500/12 dark:bg-emerald-500/20',
    activeText: 'text-emerald-800 dark:text-emerald-200',
    badgeBg: 'bg-emerald-500/15 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-100',
  },
  kiss: {
    activeBorder: 'border-pink-500/70 dark:border-pink-400/70',
    activeBg: 'bg-pink-500/12 dark:bg-pink-500/20',
    activeText: 'text-pink-700 dark:text-pink-200',
    badgeBg: 'bg-pink-500/15 text-pink-700 dark:bg-pink-400/20 dark:text-pink-100',
  },
  mindblown: {
    activeBorder: 'border-violet-500/70 dark:border-violet-400/70',
    activeBg: 'bg-violet-500/12 dark:bg-violet-500/20',
    activeText: 'text-violet-700 dark:text-violet-200',
    badgeBg: 'bg-violet-500/15 text-violet-700 dark:bg-violet-400/20 dark:text-violet-100',
  },
};

function readStoredReactions(videoId: string): VideoReactionType[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(`${LOCAL_REACTION_STORAGE_PREFIX}${videoId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidVideoReactionType);
  } catch {
    return [];
  }
}

function writeStoredReactions(videoId: string, reactions: VideoReactionType[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(
      `${LOCAL_REACTION_STORAGE_PREFIX}${videoId}`,
      JSON.stringify(reactions),
    );
  } catch {
    // Ignore storage quota errors
  }
}

function buildMergedReactionState(
  videoId: string,
  initialReactions?: VideoReactionState,
): VideoReactionState {
  const baseState = normalizeReactionState(initialReactions);
  const localTypes = readStoredReactions(videoId);

  if (localTypes.length === 0) {
    return baseState;
  }

  const mergedViewerSet = new Set<VideoReactionType>([
    ...baseState.viewerReactions,
    ...localTypes,
  ]);
  const mergedCounts = { ...baseState.counts };
  for (const type of localTypes) {
    if (!baseState.viewerReactions.includes(type) && mergedCounts[type] === 0) {
      mergedCounts[type] = 1;
    }
  }

  return normalizeReactionState({
    counts: mergedCounts,
    viewerReactions: Array.from(mergedViewerSet),
  });
}

export function VideoReactionBar({
  videoId,
  initialReactions,
  className,
}: VideoReactionBarProps) {
  const [overridesByVideo, setOverridesByVideo] = useState<
    Record<string, VideoReactionState>
  >({});
  const [pendingTypes, setPendingTypes] = useState<Record<string, boolean>>({});
  const [bursts, setBursts] = useState<BurstParticle[]>([]);
  const [lastTriggeredText, setLastTriggeredText] = useState<string | null>(null);

  const reactionState =
    overridesByVideo[videoId] ?? buildMergedReactionState(videoId, initialReactions);

  const updateReactionState = useCallback(
    (nextState: VideoReactionState) => {
      setOverridesByVideo((prev) => ({
        ...prev,
        [videoId]: nextState,
      }));
    },
    [videoId],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await requestApiJson<{ reactions?: VideoReactionState }>(
          `/api/videos/${encodeURIComponent(videoId)}/reactions`,
        );
        if (!cancelled && res.ok && res.data?.reactions) {
          const merged = buildMergedReactionState(videoId, res.data.reactions);
          setOverridesByVideo((prev) => ({
            ...prev,
            [videoId]: merged,
          }));
        }
      } catch {
        // Ignore network errors and keep initial/local state
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [videoId]);

  const spawnBurst = useCallback((type: VideoReactionType, emoji: string) => {
    const now = Date.now();
    const offsets = [-14, 0, 14];
    const newParticles: BurstParticle[] = offsets.map((offsetX, index) => ({
      id: `${type}-${now}-${index}`,
      type,
      emoji,
      offsetX,
    }));

    setBursts((prev) => [...prev.slice(-9), ...newParticles]);

    window.setTimeout(() => {
      setBursts((prev) =>
        prev.filter((item) => !newParticles.some((added) => added.id === item.id)),
      );
    }, 750);
  }, []);

  const handleToggleReaction = async (type: VideoReactionType) => {
    const catalogItem = VIDEO_REACTION_CATALOG.find((item) => item.type === type);
    if (!catalogItem) return;

    const { nextState: optimisticNext, toggledOn } = applyOptimisticReactionToggle(
      reactionState,
      type,
    );

    updateReactionState(optimisticNext);
    writeStoredReactions(videoId, optimisticNext.viewerReactions);

    if (toggledOn) {
      spawnBurst(type, catalogItem.emoji);
      setLastTriggeredText(`${catalogItem.emoji} ${catalogItem.label} added!`);
    } else {
      setLastTriggeredText(null);
    }

    if (pendingTypes[type]) {
      return;
    }

    setPendingTypes((prev) => ({ ...prev, [type]: true }));
    try {
      const response = await requestApiJson<{
        active?: boolean;
        reactionType?: VideoReactionType;
        reactions?: VideoReactionState;
      }>(`/api/videos/${encodeURIComponent(videoId)}/reactions`, {
        method: 'POST',
        json: { reactionType: type },
      });

      if (response.ok && response.data?.reactions) {
        const normalizedServer = normalizeReactionState(response.data.reactions);
        updateReactionState(normalizedServer);
        writeStoredReactions(videoId, normalizedServer.viewerReactions);
      }
    } catch {
      // Keep optimistic state stored locally so quick reactions still feel responsive offline or without DB
    } finally {
      setPendingTypes((prev) => {
        const next = { ...prev };
        delete next[type];
        return next;
      });
    }
  };

  const totalReactions = getTotalReactionsCount(reactionState.counts);

  return (
    <section
      aria-label="Quick video reactions"
      data-testid="video-reaction-bar"
      className={cn(
        'rounded-2xl border border-stone-200/80 bg-white/95 p-3.5 shadow-sm transition-colors dark:border-zinc-800/90 dark:bg-zinc-900/85 sm:px-4 sm:py-3.5',
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-2 sm:justify-start">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Quick Reactions
            </span>
            <span
              data-testid="video-reactions-total"
              className="inline-flex items-center rounded-md border border-stone-200/80 bg-stone-100/80 px-2 py-0.5 text-xs font-semibold tabular-nums text-zinc-700 dark:border-zinc-700/80 dark:bg-zinc-800/90 dark:text-zinc-200"
            >
              {formatNumber(totalReactions)} {totalReactions === 1 ? 'reaction' : 'reactions'}
            </span>
          </div>

          <AnimatePresence mode="wait">
            {lastTriggeredText && (
              <motion.span
                key={lastTriggeredText}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="text-xs font-semibold text-rose-600 dark:text-rose-300"
              >
                {lastTriggeredText}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div
          role="group"
          aria-label="Choose a reaction emoji"
          className="flex flex-wrap items-center gap-2"
        >
          {VIDEO_REACTION_CATALOG.map((item) => {
            const count = reactionState.counts[item.type] ?? 0;
            const isActive = reactionState.viewerReactions.includes(item.type);
            const accent = REACTION_ACCENT_STYLES[item.type];
            const itemBursts = bursts.filter((particle) => particle.type === item.type);

            return (
              <div key={item.type} className="relative">
                <AnimatePresence>
                  {itemBursts.map((particle) => (
                    <motion.span
                      key={particle.id}
                      initial={{ opacity: 0.95, y: 0, x: 0, scale: 0.85 }}
                      animate={{
                        opacity: 0,
                        y: -34,
                        x: particle.offsetX,
                        scale: 1.25,
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.62, ease: 'easeOut' }}
                      aria-hidden="true"
                      className="pointer-events-none absolute -top-2 left-1/2 z-20 -translate-x-1/2 select-none text-base"
                    >
                      {particle.emoji}
                    </motion.span>
                  ))}
                </AnimatePresence>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.93 }}
                  onClick={() => void handleToggleReaction(item.type)}
                  aria-pressed={isActive}
                  aria-label={`${item.label} reaction (${count})`}
                  data-testid={`video-reaction-btn-${item.type}`}
                  className={cn(
                    'group inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all shrink-0 cursor-pointer select-none',
                    isActive
                      ? cn(accent.activeBorder, accent.activeBg, accent.activeText, 'shadow-xs')
                      : 'border-stone-200/90 bg-stone-50/90 text-zinc-700 hover:border-stone-300 hover:bg-stone-100 dark:border-zinc-800 dark:bg-zinc-800/70 dark:text-zinc-200 dark:hover:border-zinc-700 dark:hover:bg-zinc-800',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="text-base leading-none transition-transform duration-150 group-hover:scale-110"
                  >
                    {item.emoji}
                  </span>
                  <span>{item.label}</span>
                  <span
                    data-testid={`video-reaction-count-${item.type}`}
                    className={cn(
                      'ml-0.5 inline-flex min-w-[1.35rem] items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums transition-colors',
                      isActive
                        ? accent.badgeBg
                        : 'bg-stone-200/75 text-zinc-700 dark:bg-zinc-700/75 dark:text-zinc-200',
                    )}
                  >
                    {formatNumber(count)}
                  </span>
                </motion.button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
