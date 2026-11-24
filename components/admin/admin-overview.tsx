'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Clock,
  ExternalLink,
  FolderPlus,
  ImagePlus,
  Link2,
  MessageSquare,
  Pencil,
  Plus,
  Share2,
  Sparkles,
  Tag,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { CategoryWithCount, VideoChapter, VideoWithMeta } from '@/lib/types';
import type { ShareTarget } from '@/components/share-modal';
import {
  computeViewSharePercent,
  filterAdminVideos,
  getTimeOfDayGreeting,
} from '@/lib/admin-studio-utils';
import { formatDuration, formatViews } from '@/lib/video-utils';
import { cn } from '@/lib/utils';

type AdminVideoRow = VideoWithMeta & { chapters: VideoChapter[] };

interface AdminOverviewProps {
  adminName: string;
  videos: AdminVideoRow[];
  categories: CategoryWithCount[];
  totalViews: number;
  totalComments: number;
  searchQuery: string;
  selectedCategorySlug: string;
  onSelectCategorySlug: (slug: string) => void;
  onQuickCompose: (draft: {
    url: string;
    categoryName: string;
    durationMinutes: number;
  }) => void;
  onQuickUploadThumbnail: () => void;
  onOpenNewCategory: () => void;
  onOpenComments: () => void;
  onOpenAllLinks: () => void;
  onEditVideo: (video: AdminVideoRow) => void;
  onShareVideo: (target: ShareTarget) => void;
}

const DURATION_PRESETS = [8, 12, 18, 25];

export function AdminOverview({
  adminName,
  videos,
  categories,
  totalViews,
  totalComments,
  searchQuery,
  selectedCategorySlug,
  onSelectCategorySlug,
  onQuickCompose,
  onQuickUploadThumbnail,
  onOpenNewCategory,
  onOpenComments,
  onOpenAllLinks,
  onEditVideo,
  onShareVideo,
}: AdminOverviewProps) {
  const [quickUrl, setQuickUrl] = React.useState('');
  const [quickCategory, setQuickCategory] = React.useState(
    () => categories[0]?.name ?? 'Attachment Theory'
  );
  const [quickDurationMin, setQuickDurationMin] = React.useState(12);
  const greeting = React.useSyncExternalStore(
    React.useCallback(() => () => {}, []),
    () => getTimeOfDayGreeting(new Date().getHours()),
    () => 'Welcome back'
  );

  const firstName = React.useMemo(() => {
    const trimmed = adminName.trim();
    if (!trimmed) return 'Admin';
    return trimmed.split(/\s+/)[0];
  }, [adminName]);

  const filteredVideos = React.useMemo(
    () =>
      filterAdminVideos(videos, {
        query: searchQuery,
        categorySlug: selectedCategorySlug,
      }),
    [videos, searchQuery, selectedCategorySlug]
  );

  const showcaseVideos = filteredVideos.slice(0, 4);

  const categoryCards = React.useMemo(() => {
    return categories.slice(0, 4).map((cat) => {
      const catVideos = videos.filter((v) => v.categoryId === cat.id);
      const topVideo = catVideos[0] ?? videos[0];
      const catViews = catVideos.reduce((acc, v) => acc + v.views, 0);
      return {
        category: cat,
        thumbnailUrl: topVideo?.thumbnailUrl ?? '',
        duration: topVideo ? formatDuration(topVideo.durationSeconds) : '00:00',
        totalPlays: catViews,
      };
    });
  }, [categories, videos]);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onQuickCompose({
      url: quickUrl.trim(),
      categoryName: quickCategory,
      durationMinutes: quickDurationMin,
    });
    setQuickUrl('');
  };

  const cycleCategory = () => {
    if (categories.length === 0) return;
    const idx = categories.findIndex((c) => c.name === quickCategory);
    const next = categories[(idx + 1) % categories.length];
    setQuickCategory(next.name);
  };

  const cycleDuration = () => {
    const idx = DURATION_PRESETS.indexOf(quickDurationMin);
    setQuickDurationMin(DURATION_PRESETS[(idx + 1) % DURATION_PRESETS.length]);
  };

  return (
    <div className="space-y-6">
      {/* Hero Warm Copper-Lit Quick Composer */}
      <section
        aria-label="Quick video composer"
        className="relative overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[#13100F] p-5 sm:p-7"
      >
        {/* Atmospheric Copper Radial Glow matching Reference */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_95%_at_58%_8%,rgba(234,88,12,0.34),rgba(154,52,18,0.16)_46%,transparent_78%)]"
        />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs text-zinc-200 backdrop-blur-md">
            <Sparkles className="h-3 w-3 text-orange-400" aria-hidden="true" />
            <span>
              {greeting}, {firstName}
            </span>
          </div>

          <h1 className="mt-4 font-display text-[clamp(1.75rem,1.35rem+1.4vw,2.375rem)] font-semibold tracking-tight text-white leading-[1.1] max-w-lg text-balance">
            What will you publish today?
          </h1>

          {/* Glass Composer Box */}
          <form
            onSubmit={handleQuickSubmit}
            data-testid="admin-quick-composer"
            className="mt-5 rounded-2xl border border-white/10 bg-[#0B0909]/70 backdrop-blur-md p-3.5 sm:p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
          >
            <label htmlFor="studio-quick-url" className="sr-only">
              Paste an external video URL or title to publish
            </label>
            <textarea
              id="studio-quick-url"
              rows={2}
              value={quickUrl}
              onChange={(e) => setQuickUrl(e.target.value)}
              placeholder="Paste a YouTube, Vimeo, or external video link—or type a seminar title to start publishing..."
              className="w-full resize-none bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none leading-relaxed"
            />

            <div className="mt-3 pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onQuickUploadThumbnail}
                  aria-label="Upload cover thumbnail from device"
                  title="Upload cover thumbnail from device"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-zinc-300 hover:bg-white/[0.1] hover:text-white transition-colors cursor-pointer"
                >
                  <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={cycleCategory}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 text-xs text-zinc-200 hover:bg-white/[0.1] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Tag className="h-3 w-3 text-orange-400" aria-hidden="true" />
                  <span className="max-w-[8.75rem] truncate">{quickCategory}</span>
                </button>

                <button
                  type="button"
                  onClick={cycleDuration}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 font-mono text-xs text-zinc-200 hover:bg-white/[0.1] transition-colors cursor-pointer tabular-nums whitespace-nowrap"
                >
                  <Clock className="h-3 w-3 text-zinc-400" aria-hidden="true" />
                  <span>{quickDurationMin} min</span>
                </button>
              </div>

              <button
                type="submit"
                data-testid="studio-quick-compose-submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-4 text-xs font-semibold text-[#090808] hover:bg-zinc-100 active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-black/30 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Publish Link</span>
              </button>
            </div>
          </form>

          {/* 4 Quick Action Studio Tiles */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() =>
                onQuickCompose({
                  url: '',
                  categoryName: quickCategory,
                  durationMinutes: quickDurationMin,
                })
              }
              className="group flex items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-black/35 hover:bg-white/[0.06] hover:border-white/15 px-3 py-2.5 text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-zinc-200">
                  <Link2 className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">Add link</p>
                  <p className="text-[0.6875rem] text-zinc-400 truncate">External URL</p>
                </div>
              </div>
              <ArrowRight
                className="h-3.5 w-3.5 shrink-0 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all"
                aria-hidden="true"
              />
            </button>

            <button
              type="button"
              onClick={onQuickUploadThumbnail}
              className="group flex items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-black/35 hover:bg-white/[0.06] hover:border-white/15 px-3 py-2.5 text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-zinc-200">
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">Upload cover</p>
                  <p className="text-[0.6875rem] text-zinc-400 truncate">From device</p>
                </div>
              </div>
              <ArrowRight
                className="h-3.5 w-3.5 shrink-0 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all"
                aria-hidden="true"
              />
            </button>

            <button
              type="button"
              onClick={onOpenNewCategory}
              className="group flex items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-black/35 hover:bg-white/[0.06] hover:border-white/15 px-3 py-2.5 text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-zinc-200">
                  <FolderPlus className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">Categories</p>
                  <p className="text-[0.6875rem] text-zinc-400 truncate tabular-nums">
                    {categories.length} topics
                  </p>
                </div>
              </div>
              <ArrowRight
                className="h-3.5 w-3.5 shrink-0 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all"
                aria-hidden="true"
              />
            </button>

            <button
              type="button"
              onClick={onOpenComments}
              className="group flex items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-black/35 hover:bg-white/[0.06] hover:border-white/15 px-3 py-2.5 text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-zinc-200">
                  <MessageSquare className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">Comments</p>
                  <p className="text-[0.6875rem] text-zinc-400 truncate tabular-nums">
                    {totalComments} notes
                  </p>
                </div>
              </div>
              <ArrowRight
                className="h-3.5 w-3.5 shrink-0 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </section>

      {/* Recent Videos 4-Column Cinema Poster Grid (Mirrors "Recent projects" in Reference) */}
      <section aria-labelledby="studio-recent-videos-heading">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5">
          <div className="flex items-center justify-between sm:justify-start gap-2.5 min-w-0">
            <h2
              id="studio-recent-videos-heading"
              className="font-display text-base font-semibold text-white shrink-0"
            >
              Recent videos
            </h2>

            <button
              type="button"
              onClick={onOpenAllLinks}
              className="sm:hidden inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>View all</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            <div
              role="tablist"
              aria-label="Filter recent videos by topic"
              className="hidden sm:flex items-center gap-1.5 overflow-x-auto no-scrollbar"
            >
              <button
                type="button"
                role="tab"
                aria-selected={selectedCategorySlug === 'all'}
                onClick={() => onSelectCategorySlug('all')}
                className={cn(
                  'h-7 rounded-lg px-2.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap',
                  selectedCategorySlug === 'all'
                    ? 'bg-white text-[#090808] font-semibold'
                    : 'bg-white/[0.06] text-zinc-300 hover:bg-white/[0.11] hover:text-white'
                )}
              >
                All
              </button>
              {categories.slice(0, 3).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedCategorySlug === cat.slug}
                  onClick={() => onSelectCategorySlug(cat.slug)}
                  className={cn(
                    'h-7 rounded-lg px-2.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap',
                    selectedCategorySlug === cat.slug
                      ? 'bg-white text-[#090808] font-semibold'
                      : 'bg-white/[0.06] text-zinc-300 hover:bg-white/[0.11] hover:text-white'
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Filter recent videos by topic"
            className="flex sm:hidden items-center gap-1.5 overflow-x-auto no-scrollbar"
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedCategorySlug === 'all'}
              onClick={() => onSelectCategorySlug('all')}
              className={cn(
                'h-7 rounded-lg px-2.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0',
                selectedCategorySlug === 'all'
                  ? 'bg-white text-[#090808] font-semibold'
                  : 'bg-white/[0.06] text-zinc-300 hover:bg-white/[0.11] hover:text-white'
              )}
            >
              All
            </button>
            {categories.slice(0, 3).map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={selectedCategorySlug === cat.slug}
                onClick={() => onSelectCategorySlug(cat.slug)}
                className={cn(
                  'h-7 rounded-lg px-2.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0',
                  selectedCategorySlug === cat.slug
                    ? 'bg-white text-[#090808] font-semibold'
                    : 'bg-white/[0.06] text-zinc-300 hover:bg-white/[0.11] hover:text-white'
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onOpenAllLinks}
            className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>View all</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        {showcaseVideos.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#131111] p-8 text-center">
            <p className="text-sm font-medium text-zinc-200">
              No videos match the current filter.
            </p>
            <button
              type="button"
              onClick={() => onSelectCategorySlug('all')}
              className="mt-3 inline-flex h-8 items-center rounded-lg bg-white px-3.5 text-xs font-semibold text-[#090808] hover:bg-zinc-200 cursor-pointer"
            >
              Show all videos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {showcaseVideos.map((video, index) => {
              const sharePct = computeViewSharePercent(video.views, totalViews);
              return (
                <motion.article
                  key={video.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: index * 0.04 }}
                  className="group relative aspect-[3/4] overflow-hidden rounded-[1.25rem] border border-white/[0.09] bg-[#161312]"
                >
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
                  />

                  {/* Cinematic Dark Scrim */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-[#090808] via-[#090808]/45 to-black/15"
                  />

                  {/* Top Status & Duration Row */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 backdrop-blur-md border border-white/10 px-2.5 py-1 text-[0.6875rem] font-medium text-zinc-100">
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          index === 0 ? 'bg-orange-400' : 'bg-emerald-400'
                        )}
                        aria-hidden="true"
                      />
                      <span>{index === 0 ? 'Featured' : 'Published'}</span>
                    </span>

                    <span className="rounded-full bg-black/55 backdrop-blur-md border border-white/10 px-2 py-0.5 font-mono text-[0.625rem] font-medium text-zinc-100 tabular-nums">
                      {formatDuration(video.durationSeconds)}
                    </span>
                  </div>

                  {/* Quick Hover Actions */}
                  <div className="absolute top-12 right-3 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => onEditVideo(video)}
                      aria-label={`Edit ${video.title}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/70 border border-white/15 text-white hover:bg-orange-500 hover:border-orange-400 transition-colors cursor-pointer backdrop-blur-md"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onShareVideo({
                          videoId: video.id,
                          title: video.title,
                          thumbnailUrl: video.thumbnailUrl,
                          sourceUrl: video.videoUrl,
                        })
                      }
                      aria-label={`Share ${video.title}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/70 border border-white/15 text-white hover:bg-white hover:text-black transition-colors cursor-pointer backdrop-blur-md"
                    >
                      <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <Link
                      href={`/watch/${video.id}`}
                      aria-label={`Open ${video.title}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/70 border border-white/15 text-white hover:bg-white hover:text-black transition-colors backdrop-blur-md"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>

                  {/* Bottom Details + Subtle View-Share Line */}
                  <div className="absolute inset-x-0 bottom-0 p-3.5">
                    <div className="h-1 w-full overflow-hidden rounded-full bg-white/15 mb-2.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-300"
                        style={{ width: `${Math.max(14, sharePct)}%` }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onEditVideo(video)}
                      className="text-left block w-full cursor-pointer group/title"
                    >
                      <h3 className="text-[0.8125rem] font-semibold text-white leading-snug line-clamp-2 group-hover/title:text-orange-300 transition-colors">
                        {video.title}
                      </h3>
                    </button>
                    <p className="mt-1 text-[0.6875rem] text-zinc-400 truncate tabular-nums">
                      {video.category.name} · {formatViews(video.views)} plays
                    </p>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </section>

      {/* Top Categories Strip (Mirrors "Trending templates" bottom row in Reference) */}
      <section aria-labelledby="studio-top-categories-heading">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2
            id="studio-top-categories-heading"
            className="font-display text-base font-semibold text-white"
          >
            Top categories
          </h2>
          <button
            type="button"
            onClick={onOpenNewCategory}
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <span>Manage all</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {categoryCards.map(({ category, thumbnailUrl, duration, totalPlays }) => (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelectCategorySlug(category.slug)}
              className={cn(
                'group flex items-center gap-2.5 rounded-2xl border p-2 text-left transition-all cursor-pointer',
                selectedCategorySlug === category.slug
                  ? 'border-orange-500/45 bg-orange-500/10'
                  : 'border-white/[0.08] bg-[#131111] hover:border-white/15 hover:bg-[#191615]'
              )}
            >
              <div className="relative h-11 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-900">
                {thumbnailUrl && (
                  <img
                    src={thumbnailUrl}
                    alt={category.name}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                )}
                <span className="absolute bottom-0.5 left-0.5 rounded bg-black/80 px-1 py-0.5 font-mono text-[0.5625rem] text-zinc-200 tabular-nums">
                  {duration}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate group-hover:text-orange-300 transition-colors">
                  {category.name}
                </p>
                <p className="mt-0.5 text-[0.6875rem] text-zinc-400 truncate tabular-nums">
                  {category.videoCount}v · {formatViews(totalPlays)}
                </p>
              </div>

              <ArrowRight
                className="h-3.5 w-3.5 shrink-0 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all"
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
