'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Crown,
  Flame,
  Gem,
  Heart,
  Lock,
  Play,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type { Category, User, VideoWithMeta, WatchHistoryEntry } from '@/lib/types';
import { computeWatchProgress, formatDuration, formatViews } from '@/lib/video-utils';
import {
  resolveVideoProgressSeconds,
  useWatchProgressMap,
} from '@/lib/watch-progress-store';
import { ParticleOrbCrest } from '@/components/brand-logo';
import { ContentRatingBadge } from '@/components/content-rating-badge';
import { VideoCard } from '@/components/video-card';
import { EducatorAvatar } from '@/components/ui/avatar';
import { ShareModal, type ShareTarget } from '@/components/share-modal';
import { useImmersiveScroll } from '@/components/scroll-immersive-context';
import { Button } from '@/components/ui/button';
import {
  ThemeDropdown,
  type ThemeDropdownOption,
} from '@/components/ui/theme-dropdown';
import { TransitionLink } from '@/components/transition-link';
import { cn } from '@/lib/utils';

type SortOption = 'recommended' | 'most-viewed' | 'newest';

const SORT_OPTIONS: readonly ThemeDropdownOption<SortOption>[] = [
  {
    value: 'recommended',
    label: 'Recommended',
    description: 'Curated order',
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
  {
    value: 'most-viewed',
    label: 'Most Viewed',
    description: 'Popular on Hey Lady',
    icon: <TrendingUp className="h-3.5 w-3.5" />,
  },
  {
    value: 'newest',
    label: 'Newest First',
    description: 'Recently published',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
];

interface HomeFeedProps {
  initialVideos: VideoWithMeta[];
  categories: Category[];
  educators?: User[];
  initialHistory?: WatchHistoryEntry[];
  initialCategorySlug?: string;
  initialSearchQuery?: string;
}

export function HomeFeed({
  initialVideos,
  categories,
  educators = [],
  initialHistory = [],
  initialCategorySlug = 'all',
  initialSearchQuery = '',
}: HomeFeedProps) {
  const [videos, setVideos] = React.useState<VideoWithMeta[]>(initialVideos);
  const [activeCategory, setActiveCategory] = React.useState<string>(initialCategorySlug);
  const [prevCategorySlug, setPrevCategorySlug] = React.useState<string>(initialCategorySlug);
  const [sortBy, setSortBy] = React.useState<SortOption>('recommended');
  const [heroIndex, setHeroIndex] = React.useState(0);
  const [shareTarget, setShareTarget] = React.useState<ShareTarget | null>(null);
  const localProgressMap = useWatchProgressMap();
  const { isImmersiveScroll } = useImmersiveScroll();

  if (initialCategorySlug !== prevCategorySlug) {
    setPrevCategorySlug(initialCategorySlug);
    setActiveCategory(initialCategorySlug);
  }

  const filteredVideos = React.useMemo(() => {
    const q = initialSearchQuery.trim().toLowerCase();
    const list = videos.filter((video) => {
      const matchesCategory =
        activeCategory === 'all' || video.category.slug === activeCategory;
      const matchesQuery =
        !q ||
        video.title.toLowerCase().includes(q) ||
        video.description.toLowerCase().includes(q) ||
        video.creator.name.toLowerCase().includes(q) ||
        video.category.name.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });

    if (sortBy === 'most-viewed') {
      return [...list].sort((a, b) => b.views - a.views);
    }
    if (sortBy === 'newest') {
      return [...list].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    return list;
  }, [videos, activeCategory, initialSearchQuery, sortBy]);

  const showCuratedHome =
    activeCategory === 'all' && !initialSearchQuery.trim() && filteredVideos.length > 0;

  // Top 4 spotlight videos for the interactive Hero Carousel (Reference 2 ↑/↓ controls)
  const heroVideos = React.useMemo(() => {
    if (!showCuratedHome) return [];
    return [...filteredVideos].sort((a, b) => b.views - a.views).slice(0, 4);
  }, [showCuratedHome, filteredVideos]);

  const safeHeroIndex = heroVideos.length > 0 ? heroIndex % heroVideos.length : 0;
  const featuredVideo = heroVideos[safeHeroIndex] ?? null;

  const featuredProgress = React.useMemo(() => {
    if (!featuredVideo) return null;
    const secs = resolveVideoProgressSeconds(
      featuredVideo.id,
      featuredVideo.watchProgressSeconds,
      localProgressMap
    );
    return computeWatchProgress(secs, featuredVideo.durationSeconds);
  }, [featuredVideo, localProgressMap]);

  // Split curated view cleanly into "Trending Now" (top 3) + "You Might Like" (rest)
  const { trendingRow, discoveryRow } = React.useMemo(() => {
    if (!showCuratedHome) {
      return { trendingRow: [], discoveryRow: filteredVideos };
    }
    const sortedByTrending = [...filteredVideos].sort((a, b) => b.views - a.views);
    const featuredId = featuredVideo?.id;
    const withoutFeatured = sortedByTrending.filter((v) => v.id !== featuredId);
    const trending = withoutFeatured.slice(0, 3);
    const trendingIds = new Set(trending.map((v) => v.id));
    const rest = filteredVideos.filter(
      (v) => !trendingIds.has(v.id) && v.id !== featuredId
    );
    // Keep "You Might Like" visually balanced as full 3-column rows on desktop
    const balancedDiscovery =
      rest.length >= 3
        ? rest
        : [
            ...rest,
            ...filteredVideos.filter(
              (v) => !rest.some((r) => r.id === v.id)
            ),
          ].slice(0, Math.min(filteredVideos.length, 3));
    return {
      trendingRow: trending.length > 0 ? trending : sortedByTrending.slice(0, 3),
      discoveryRow: balancedDiscovery.length > 0 ? balancedDiscovery : filteredVideos,
    };
  }, [showCuratedHome, filteredVideos, featuredVideo]);

  // Build real "Continue Watching" list (server history + local progress, with curated fallback)
  const continueWatchingItems = React.useMemo(() => {
    const byId = new Map<string, { video: VideoWithMeta; progressSeconds: number }>();

    for (const entry of initialHistory) {
      const latest = videos.find((v) => v.id === entry.videoId) ?? entry.video;
      const secs = resolveVideoProgressSeconds(
        latest.id,
        entry.progressSeconds,
        localProgressMap
      );
      if (secs > 0) {
        byId.set(latest.id, { video: latest, progressSeconds: secs });
      }
    }

    for (const v of videos) {
      const secs = resolveVideoProgressSeconds(
        v.id,
        v.watchProgressSeconds,
        localProgressMap
      );
      if (secs > 0 && !byId.has(v.id)) {
        byId.set(v.id, { video: v, progressSeconds: secs });
      }
    }

    const activeList = Array.from(byId.values()).slice(0, 3);
    if (activeList.length > 0) {
      return { hasPersonalHistory: true, items: activeList };
    }

    return {
      hasPersonalHistory: false,
      items: videos.slice(0, 3).map((v) => ({ video: v, progressSeconds: 0 })),
    };
  }, [initialHistory, videos, localProgressMap]);

  // Real educators for the right-rail spotlight (fallback to unique creators from videos)
  const featuredEducators = React.useMemo(() => {
    if (educators.length > 0) return educators.slice(0, 5);
    const seen = new Map<string, User>();
    for (const v of videos) {
      if (!seen.has(v.creator.id)) {
        seen.set(v.creator.id, v.creator);
      }
    }
    return Array.from(seen.values()).slice(0, 5);
  }, [educators, videos]);

  const handleToggleBookmark = async (videoId: string) => {
    setVideos((prev) =>
      prev.map((v) =>
        v.id === videoId ? { ...v, isBookmarked: !v.isBookmarked } : v
      )
    );

    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      });
      if (res.ok) {
        const data = await res.json();
        setVideos((prev) =>
          prev.map((v) =>
            v.id === videoId ? { ...v, isBookmarked: Boolean(data.isBookmarked) } : v
          )
        );
      }
    } catch {
      setVideos((prev) =>
        prev.map((v) =>
          v.id === videoId ? { ...v, isBookmarked: !v.isBookmarked } : v
        )
      );
    }
  };

  const handleHeroStep = (delta: number) => {
    if (heroVideos.length <= 1) return;
    setHeroIndex((prev) => (prev + delta + heroVideos.length) % heroVideos.length);
  };

  return (
    <div className="min-h-full">
      {/* Main 2-Column Content Split (Center Cinema + Right Continue-Watching Rail = 3 Columns with Left Sidebar) */}
      <div
        className={cn(
          'px-4 sm:px-6 lg:px-7 py-5 lg:py-6 mx-auto transition-[max-width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          isImmersiveScroll ? 'max-w-none' : 'max-w-[95rem]'
        )}
      >
        <div className="flex flex-col xl:flex-row items-start gap-7">
          {/* CENTER COLUMN: Category Tabs + Hero Carousel + Trending Now + You Might Like */}
          <div className="w-full flex-1 min-w-0">
            {/* Top Category Tab Strip (Reference 2 Crimson Active Pill + Clean Typographic Tabs) */}
            <div
              data-testid="category-bar"
              className="mb-6 flex items-center justify-between gap-4"
            >
              <div
                role="tablist"
                aria-label="Topic categories"
                className="flex flex-1 min-w-0 items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 pr-2"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === 'all'}
                  onClick={() => setActiveCategory('all')}
                  className={cn(
                    'h-9 px-4 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer',
                    activeCategory === 'all'
                      ? 'bg-rose-600 text-white font-semibold shadow-sm shadow-rose-600/25'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-[#181820] hover:text-zinc-950 dark:hover:text-white'
                  )}
                >
                  All
                </button>

                {categories.map((cat) => {
                  const selected = activeCategory === cat.slug;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setActiveCategory(cat.slug)}
                      className={cn(
                        'h-9 px-4 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer',
                        selected
                          ? 'bg-rose-600 text-white font-semibold shadow-sm shadow-rose-600/25'
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-[#181820] hover:text-zinc-950 dark:hover:text-white'
                      )}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>

              {/* Theme-Matched Sort Dropdown */}
              <div className="flex items-center shrink-0">
                <ThemeDropdown<SortOption>
                  id="feed-sort"
                  testId="feed-sort-dropdown"
                  value={sortBy}
                  options={SORT_OPTIONS}
                  onChange={setSortBy}
                  ariaLabel="Sort videos"
                  menuLabel="Sort videos by"
                  leadingIcon={<SlidersHorizontal className="h-3.5 w-3.5" />}
                  align="right"
                  compactLabelOnMobile
                />
              </div>
            </div>

            {/* Search Result Header */}
            {initialSearchQuery.trim() && (
              <div className="mb-6 flex items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800 pb-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  Showing{' '}
                  <span className="font-semibold text-zinc-950 dark:text-white tabular-nums">
                    {filteredVideos.length}
                  </span>{' '}
                  {filteredVideos.length === 1 ? 'result' : 'results'} for{' '}
                  <span className="font-semibold text-zinc-950 dark:text-white">
                    “{initialSearchQuery}”
                  </span>
                </p>
                <Button asChild variant="ghost" size="sm">
                  <TransitionLink href="/">Clear search</TransitionLink>
                </Button>
              </div>
            )}

            {/* CINEMATIC FULL-BLEED HERO SPOTLIGHT CAROUSEL (Combining Reference 1 + Reference 2) */}
            {featuredVideo && (
              <section
                aria-label="Featured video spotlight"
                data-testid="hero-spotlight"
                data-vt-video-id={featuredVideo.id}
                data-vt-source="hero"
                className="relative mb-8 overflow-hidden rounded-[1.625rem] bg-[#0E0E13] shadow-[0_14px_40px_rgba(15,23,42,0.14)] dark:shadow-[0_16px_44px_rgba(0,0,0,0.55)] ring-1 ring-black/8 dark:ring-white/10"
              >
                <div
                  data-vt-role="poster"
                  className="relative min-h-[clamp(19.5rem,40svh,23.75rem)] flex flex-col justify-between p-[clamp(1.25rem,2.4vw,2rem)]"
                >
                  {/* Animated Full-Bleed Background Artwork */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={featuredVideo.id}
                      initial={{ opacity: 0.25, scale: 1.03 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0.25 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-0"
                    >
                      <img
                        src={featuredVideo.thumbnailUrl}
                        alt={featuredVideo.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                      {/* Multi-stop cinema scrim ensuring razor-sharp contrast across all frames */}
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/58 to-black/15"
                      />
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/25"
                      />
                    </motion.div>
                  </AnimatePresence>

                  {/* Top Row inside Hero: 18+ Rating + Frosted Trending Kicker + Duration */}
                  <div className="relative z-10 flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <ContentRatingBadge
                        rating={featuredVideo.contentRating}
                        variant="thumbnail"
                        showLabel
                      />
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md ring-1 ring-white/15">
                        <Flame
                          className="h-3.5 w-3.5 text-amber-400 fill-amber-400 shrink-0"
                          aria-hidden="true"
                        />
                        <span>Trending Now</span>
                      </span>
                      <span className="hidden sm:inline text-xs font-medium text-zinc-200/90">
                        {featuredVideo.category.name}
                      </span>
                    </div>

                    <span className="rounded-full bg-black/55 px-3 py-1 font-mono text-xs font-medium text-white tabular-nums backdrop-blur-md ring-1 ring-white/15">
                      {formatDuration(featuredVideo.durationSeconds)}
                    </span>
                  </div>

                  {/* Bottom Content Block + Right Vertical Carousel Switcher (Reference 2) */}
                  <div className="relative z-10 mt-8 flex items-end justify-between gap-4">
                    <div className="max-w-xl pr-2 sm:pr-10">
                      <h1
                        data-vt-role="title"
                        className="font-display text-[clamp(1.375rem,1.05rem+1.45vw,2.25rem)] font-bold tracking-tight text-white leading-[1.12]"
                      >
                        <TransitionLink
                          href={`/watch/${featuredVideo.id}`}
                          videoId={featuredVideo.id}
                          className="hover:text-rose-200 transition-colors"
                        >
                          {featuredVideo.title}
                        </TransitionLink>
                      </h1>

                      {/* Unboxed Metadata Line */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-[0.8125rem] text-zinc-200/90 tabular-nums">
                        <TransitionLink
                          href={`/creator/${featuredVideo.creator.username}`}
                          className="font-medium text-white hover:underline"
                        >
                          {featuredVideo.creator.name}
                        </TransitionLink>
                        <span aria-hidden="true">·</span>
                        <span>{formatDuration(featuredVideo.durationSeconds)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatViews(featuredVideo.views)} views</span>
                      </div>

                      <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-zinc-200/85 line-clamp-2">
                        {featuredVideo.description}
                      </p>

                      {/* Reference 2 Inspired Action Bar: Crisp White Watch CTA + Glass Save & Share */}
                      <div className="mt-5 flex flex-wrap items-center gap-2.5">
                        <TransitionLink
                          href={`/watch/${featuredVideo.id}`}
                          videoId={featuredVideo.id}
                          data-testid="hero-watch-cta"
                          className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-zinc-950 shadow-lg hover:bg-zinc-100 active:scale-[0.98] transition-all whitespace-nowrap"
                        >
                          <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                          <span>
                            {featuredProgress?.hasProgress && !featuredProgress.isCompleted
                              ? 'Resume'
                              : 'Watch'}
                          </span>
                        </TransitionLink>

                        <button
                          type="button"
                          onClick={() => handleToggleBookmark(featuredVideo.id)}
                          aria-label={
                            featuredVideo.isBookmarked
                              ? `Remove ${featuredVideo.title} from favorites`
                              : `Save ${featuredVideo.title} to favorites`
                          }
                          className={cn(
                            'inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium backdrop-blur-md border transition-all cursor-pointer whitespace-nowrap',
                            featuredVideo.isBookmarked
                              ? 'bg-rose-600/90 text-white border-rose-400/50 hover:bg-rose-600'
                              : 'bg-white/15 text-white border-white/20 hover:bg-white/25'
                          )}
                        >
                          <Heart
                            className={cn(
                              'h-4 w-4',
                              featuredVideo.isBookmarked && 'fill-current'
                            )}
                            aria-hidden="true"
                          />
                          <span>{featuredVideo.isBookmarked ? 'Saved' : 'Save'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setShareTarget({
                              videoId: featuredVideo.id,
                              title: featuredVideo.title,
                              thumbnailUrl: featuredVideo.thumbnailUrl,
                              sourceUrl: featuredVideo.videoUrl,
                            })
                          }
                          aria-label={`Share ${featuredVideo.title}`}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md border border-white/20 hover:bg-white/25 transition-all cursor-pointer"
                        >
                          <Share2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {/* Right-Side Vertical Up/Down Carousel Switcher (Signature of Reference 2) */}
                    {heroVideos.length > 1 && (
                      <div className="hidden sm:flex flex-col items-center gap-2 shrink-0">
                        <button
                          type="button"
                          data-testid="hero-prev-slide"
                          onClick={() => handleHeroStep(-1)}
                          aria-label="Previous featured seminar"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md border border-white/20 hover:bg-black/75 transition-all cursor-pointer"
                        >
                          <ChevronUp className="h-5 w-5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          data-testid="hero-next-slide"
                          onClick={() => handleHeroStep(1)}
                          aria-label="Next featured seminar"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-950 shadow-lg hover:bg-zinc-100 transition-all cursor-pointer"
                        >
                          <ChevronDown className="h-5 w-5" aria-hidden="true" />
                        </button>
                        <span className="mt-0.5 font-mono text-[0.6875rem] font-medium text-white/80 tabular-nums">
                          {safeHeroIndex + 1}/{heroVideos.length}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Watch Progress Bar on Hero Bottom Edge */}
                  {featuredProgress?.hasProgress && (
                    <div
                      role="progressbar"
                      aria-label={`Watch progress for ${featuredVideo.title}: ${featuredProgress.statusLabel}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={featuredProgress.percent}
                      data-testid="featured-watch-progress-bar"
                      data-progress-pct={featuredProgress.percent}
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-1.5 bg-white/20"
                    >
                      <div
                        className="h-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.85)] transition-[width] duration-300"
                        style={{ width: `${featuredProgress.percent}%` }}
                      />
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Mobile / Tablet Compact Continue Watching Strip (Shown < xl when personal progress exists) */}
            {showCuratedHome && continueWatchingItems.hasPersonalHistory && (
              <section aria-label="Continue watching" className="xl:hidden mb-8">
                <div className="mb-3.5 flex items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white">
                    Continue watching
                  </h2>
                  <TransitionLink
                    href="/library?tab=history"
                    className="text-xs font-medium text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                  >
                    See all
                  </TransitionLink>
                </div>
                <div className="flex gap-3.5 overflow-x-auto no-scrollbar pb-1">
                  {continueWatchingItems.items.map(({ video, progressSeconds }) => {
                    const prog = computeWatchProgress(progressSeconds, video.durationSeconds);
                    return (
                      <TransitionLink
                        key={video.id}
                        href={`/watch/${video.id}`}
                        videoId={video.id}
                        data-vt-video-id={video.id}
                        data-vt-source="continue"
                        className="group flex w-[min(72vw,15.625rem)] shrink-0 items-center gap-3 rounded-2xl bg-white dark:bg-[#121218] p-2.5 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs hover:border-rose-300 dark:hover:border-rose-500/40 transition-colors"
                      >
                        <div
                          data-vt-role="poster"
                          className="relative h-[3.875rem] w-[6rem] shrink-0 overflow-hidden rounded-xl bg-zinc-900"
                        >
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                          <ContentRatingBadge
                            rating={video.contentRating}
                            variant="micro"
                            className="absolute top-1 left-1 z-10"
                          />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-zinc-950 shadow-sm">
                              <Play className="h-3 w-3 fill-current ml-0.5" />
                            </span>
                          </div>
                          {prog.hasProgress && (
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
                              <div
                                className="h-full bg-rose-500"
                                style={{ width: `${prog.percent}%` }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            data-vt-role="title"
                            className="text-xs font-semibold text-zinc-950 dark:text-white line-clamp-2 leading-snug group-hover:text-rose-600 dark:group-hover:text-rose-400"
                          >
                            {video.title}
                          </p>
                          <p className="mt-1 font-mono text-[0.6875rem] text-zinc-500 tabular-nums">
                            {prog.isCompleted
                              ? 'Watched'
                              : `${formatDuration(prog.remainingSeconds)} left`}
                          </p>
                        </div>
                      </TransitionLink>
                    );
                  })}
                </div>
              </section>
            )}

            {/* SECTION 1: TRENDING NOW (Reference 1 & 2 Cinema Poster Row) */}
            {showCuratedHome && trendingRow.length > 0 && (
              <section aria-label="Trending now" className="mb-9">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h2 className="inline-flex items-center gap-2 font-display text-lg sm:text-xl font-bold tracking-tight text-zinc-950 dark:text-white">
                    <span>Trending now</span>
                    <Flame
                      className="h-4 w-4 text-rose-600 dark:text-rose-500 shrink-0"
                      aria-hidden="true"
                    />
                  </h2>
                  <button
                    type="button"
                    onClick={() => setSortBy('most-viewed')}
                    className="inline-flex items-center gap-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <span>See all</span>
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>

                <div
                  data-testid="trending-grid"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                >
                  {trendingRow.map((video, idx) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      index={idx}
                      variant="cinema"
                      progressSeconds={resolveVideoProgressSeconds(
                        video.id,
                        video.watchProgressSeconds,
                        localProgressMap
                      )}
                      onToggleBookmark={handleToggleBookmark}
                      onShare={(v) =>
                        setShareTarget({
                          videoId: v.id,
                          title: v.title,
                          thumbnailUrl: v.thumbnailUrl,
                          sourceUrl: v.videoUrl,
                        })
                      }
                    />
                  ))}
                </div>
              </section>
            )}

            {/* SECTION 2: YOU MIGHT LIKE / FILTERED CATEGORY GRID */}
            <section aria-label="Recommended seminars">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-zinc-950 dark:text-white">
                  {activeCategory === 'all'
                    ? initialSearchQuery.trim()
                      ? 'Matching Videos'
                      : 'You Might Like'
                    : categories.find((c) => c.slug === activeCategory)?.name ?? 'Videos'}
                </h2>
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {filteredVideos.length} {filteredVideos.length === 1 ? 'video' : 'videos'}
                </span>
              </div>

              {filteredVideos.length === 0 ? (
                videos.length === 0 ? (
                  <div
                    data-testid="empty-catalog-state"
                    className="relative overflow-hidden rounded-[1.75rem] border border-amber-500/25 bg-[#09080B] px-6 py-12 sm:px-10 sm:py-16 text-center shadow-[0_24px_70px_rgba(0,0,0,0.28)]"
                  >
                    {/* Subtle warm obsidian-gold & velvet-rose atmospheric glow */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_22%,rgba(245,158,11,0.20),rgba(225,29,72,0.09)_50%,transparent_78%)]"
                    />

                    <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center">
                      <ParticleOrbCrest
                        variant="hero"
                        className="border-amber-400/55 shadow-[0_0_46px_rgba(245,158,11,0.34),inset_0_0_24px_rgba(251,191,36,0.22)]"
                      />

                      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-300/90">
                        <span className="inline-flex items-center gap-1">
                          <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                          <span>Hey Lady</span>
                        </span>
                        <span aria-hidden="true" className="text-amber-500/40">·</span>
                        <span className="inline-flex items-center gap-1 text-rose-400">
                          <Flame className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>18+ Adults Only</span>
                        </span>
                      </div>

                      <h1 className="mt-3 font-display text-[clamp(1.75rem,3.4vw,2.625rem)] font-bold tracking-tight text-white leading-[1.12]">
                        Luxury 18+ Cinema, Curated by{' '}
                        <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-rose-400 bg-clip-text text-transparent">
                          Hey Lady
                        </span>
                      </h1>

                      <p className="mt-3 max-w-xl text-sm sm:text-base leading-relaxed text-zinc-300">
                        Your exclusive adults-only streaming vault is live. Publish your first verified 18+ release in Creator Studio to showcase HD streams, creator spotlights, and curated collections.
                      </p>

                      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                        <Button asChild variant="primary" size="md">
                          <TransitionLink href="/admin">
                            <Crown className="h-4 w-4" aria-hidden="true" />
                            <span>Open Creator Studio</span>
                          </TransitionLink>
                        </Button>
                        <TransitionLink
                          href="/educators"
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-400/35 bg-white/[0.04] px-5 text-sm font-medium text-amber-100 hover:border-amber-300/65 hover:bg-white/[0.08] transition-colors"
                        >
                          <Gem className="h-4 w-4 text-amber-300" aria-hidden="true" />
                          <span>Explore VIP Creators</span>
                        </TransitionLink>
                      </div>

                      <div className="mt-9 w-full border-t border-white/10 pt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-zinc-400">
                        <span className="inline-flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                          <span>18+ Verified &amp; RTA Labeled</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Lock className="h-3.5 w-3.5 text-rose-400 shrink-0" aria-hidden="true" />
                          <span>Discreet Private Viewing</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Gem className="h-3.5 w-3.5 text-amber-300 shrink-0" aria-hidden="true" />
                          <span>Ultra-HD Adult Streaming</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    data-testid="empty-catalog-state"
                    className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#121218] px-6 py-16 text-center shadow-xs"
                  >
                    <p className="font-display text-lg font-semibold text-zinc-950 dark:text-white">
                      No videos match your filter.
                    </p>
                    <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                      Switch categories or clear your search to explore all Hey Lady releases.
                    </p>
                    <div className="mt-6 flex items-center justify-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveCategory('all')}
                      >
                        Show All Categories
                      </Button>
                    </div>
                  </div>
                )
              ) : (
                <div
                  data-testid="video-grid"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                >
                  {discoveryRow.map((video, idx) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      index={idx}
                      variant="cinema"
                      progressSeconds={resolveVideoProgressSeconds(
                        video.id,
                        video.watchProgressSeconds,
                        localProgressMap
                      )}
                      onToggleBookmark={handleToggleBookmark}
                      onShare={(v) =>
                        setShareTarget({
                          videoId: v.id,
                          title: v.title,
                          thumbnailUrl: v.thumbnailUrl,
                          sourceUrl: v.videoUrl,
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* RIGHT SIDEBAR RAIL (Inspired by Reference 1: Continue Watching + Featured Educators) */}
          {(continueWatchingItems.items.length > 0 || featuredEducators.length > 0) && (
            <aside
              aria-label="Continue watching and featured educators"
              data-testid="home-right-rail"
              className="hidden xl:flex flex-col w-[19rem] 2xl:w-[20.5rem] shrink-0 gap-6 sticky top-[5.5rem]"
            >
              {/* Continue Watching Panel */}
              {continueWatchingItems.items.length > 0 && (
                <div className="rounded-[1.5rem] bg-white dark:bg-[#121218] border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-[0_2px_12px_rgba(15,23,42,0.03)] dark:shadow-none">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <h2 className="font-display text-[1.0625rem] font-bold tracking-tight text-zinc-950 dark:text-white">
                      {continueWatchingItems.hasPersonalHistory ? 'Continue watching' : 'Up next'}
                    </h2>
                    <TransitionLink
                      href="/library?tab=history"
                      className="text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                    >
                      History
                    </TransitionLink>
                  </div>

                  <div className="space-y-3.5">
                    {continueWatchingItems.items.map(({ video, progressSeconds }) => {
                      const prog = computeWatchProgress(progressSeconds, video.durationSeconds);
                      return (
                        <TransitionLink
                          key={video.id}
                          href={`/watch/${video.id}`}
                          videoId={video.id}
                          data-vt-video-id={video.id}
                          data-vt-source="continue"
                          className="group flex items-center gap-3.5 rounded-2xl p-1 -m-1 hover:bg-[#F4F5F8] dark:hover:bg-[#1A1A22] transition-colors"
                        >
                          <div
                            data-vt-role="poster"
                            className="relative h-[4.625rem] w-[7.125rem] shrink-0 overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-black/8 dark:ring-white/10"
                          >
                            <img
                              src={video.thumbnailUrl}
                              alt={video.title}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <ContentRatingBadge
                              rating={video.contentRating}
                              variant="micro"
                              className="absolute top-1.5 left-1.5 z-10"
                            />
                            <div className="absolute inset-0 bg-black/28 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/88 text-zinc-950 shadow-md backdrop-blur-xs transition-transform duration-200 group-hover:scale-110">
                                <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                              </span>
                            </div>
                            {prog.hasProgress && (
                              <div className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
                                <div
                                  className="h-full bg-rose-500"
                                  style={{ width: `${prog.percent}%` }}
                                />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p
                              data-vt-role="title"
                              className="font-display text-[0.8438rem] font-bold leading-snug text-zinc-950 dark:text-white line-clamp-2 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors"
                            >
                              {video.title}
                            </p>
                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 truncate">
                              {video.category.name}
                            </p>
                            <p className="mt-1 font-mono text-[0.6875rem] text-zinc-400 dark:text-zinc-500 tabular-nums">
                              {prog.hasProgress
                                ? prog.isCompleted
                                  ? 'Watched'
                                  : `${prog.percent}% · ${formatDuration(prog.remainingSeconds)} left`
                                : formatDuration(video.durationSeconds)}
                            </p>
                          </div>
                        </TransitionLink>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Featured Educators Panel (Reference 1 Avatar Feed Style — Real Kinship Educators) */}
              {featuredEducators.length > 0 && (
                <div className="rounded-[1.5rem] bg-white dark:bg-[#121218] border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-[0_2px_12px_rgba(15,23,42,0.03)] dark:shadow-none">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <h2 className="font-display text-[1.0625rem] font-bold tracking-tight text-zinc-950 dark:text-white">
                      Featured educators
                    </h2>
                    <TransitionLink
                      href="/educators"
                      className="text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                    >
                      See all
                    </TransitionLink>
                  </div>

                  <div className="space-y-3">
                    {featuredEducators.map((ed) => (
                      <TransitionLink
                        key={ed.id}
                        href={`/creator/${ed.username}`}
                        className="group flex items-center gap-3 rounded-xl p-1.5 -mx-1.5 hover:bg-[#F4F5F8] dark:hover:bg-[#1A1A22] transition-colors"
                      >
                        <EducatorAvatar
                          name={ed.name}
                          src={ed.avatarUrl}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <p className="text-[0.8438rem] font-semibold text-zinc-950 dark:text-white truncate group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                              {ed.name}
                            </p>
                            {ed.isEducator && (
                              <BadgeCheck
                                className="h-3.5 w-3.5 text-rose-600 dark:text-rose-500 shrink-0"
                                aria-label="Verified Educator"
                              />
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                            {ed.credentials || 'Relationship Psychology'}
                          </p>
                        </div>
                      </TransitionLink>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          )}
        </div>
      </div>

      <ShareModal target={shareTarget} onClose={() => setShareTarget(null)} />
    </div>
  );
}
