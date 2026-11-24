'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, MessageSquare, Plus, TrendingUp } from 'lucide-react';
import type {
  AdminCommentItem,
  CategoryWithCount,
  User,
  VideoChapter,
  VideoWithMeta,
} from '@/lib/types';
import {
  buildEngagementBars,
  computeViewSharePercent,
  getEducatorInitials,
} from '@/lib/admin-studio-utils';
import { formatViews } from '@/lib/video-utils';
import { cn } from '@/lib/utils';

type AdminVideoRow = VideoWithMeta & { chapters: VideoChapter[] };

interface AdminInsightsRailProps {
  videos: AdminVideoRow[];
  categories: CategoryWithCount[];
  educators: User[];
  comments: AdminCommentItem[];
  totalViews: number;
  totalLikes: number;
  onEditVideo: (video: AdminVideoRow) => void;
  onOpenAllLinks: () => void;
  onOpenAddWithEducator: (educatorName?: string) => void;
  onOpenComments: () => void;
  onFilterByCategory: (slug: string) => void;
}

const AVATAR_TONES = [
  'from-orange-500/85 to-amber-600/85',
  'from-rose-500/85 to-pink-600/85',
  'from-sky-500/85 to-indigo-600/85',
  'from-emerald-500/85 to-teal-600/85',
];

export function AdminInsightsRail({
  videos,
  categories,
  educators,
  comments,
  totalViews,
  totalLikes,
  onEditVideo,
  onOpenAllLinks,
  onOpenAddWithEducator,
  onOpenComments,
  onFilterByCategory,
}: AdminInsightsRailProps) {
  const sortedByViews = React.useMemo(
    () => [...videos].sort((a, b) => b.views - a.views),
    [videos]
  );

  const spotlightVideo = sortedByViews[0] ?? null;
  const secondaryQueue = sortedByViews.slice(1, 3);

  const engagementBars = React.useMemo(
    () => buildEngagementBars(videos, 10),
    [videos]
  );

  const defaultActiveBarId = React.useMemo(
    () => engagementBars.find((b) => b.isPeak)?.id ?? engagementBars[0]?.id ?? null,
    [engagementBars]
  );

  const [hoveredBarId, setHoveredBarId] = React.useState<string | null>(null);
  const activeBar =
    engagementBars.find((b) => b.id === (hoveredBarId ?? defaultActiveBarId)) ??
    engagementBars[0] ??
    null;

  const topCategory = React.useMemo(() => {
    if (categories.length === 0) return null;
    return [...categories].sort((a, b) => b.videoCount - a.videoCount)[0];
  }, [categories]);

  const recentComments = comments.slice(0, 3);

  return (
    <aside
      aria-label="Studio catalog insights"
      className="w-full xl:w-[19.125rem] 2xl:w-[20.125rem] shrink-0 space-y-4"
    >
      {/* Panel 1: Catalog Spotlight (Mirrors "Render queue" top-right panel) */}
      <section className="rounded-[1.375rem] border border-white/[0.08] bg-[#131111] p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-xs font-semibold text-white">Catalog spotlight</h2>
          <span className="font-mono text-[0.6875rem] font-medium text-orange-400 tabular-nums">
            {videos.length} live
          </span>
        </div>

        {spotlightVideo ? (
          <>
            <button
              type="button"
              onClick={() => onEditVideo(spotlightVideo)}
              className="group relative block w-full aspect-[16/9] overflow-hidden rounded-xl border border-white/10 bg-zinc-900 cursor-pointer"
            >
              <img
                src={spotlightVideo.thumbnailUrl}
                alt={spotlightVideo.title}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25"
              />
              <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md px-2 py-0.5 text-[0.625rem] font-medium text-orange-200 border border-white/10">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400" aria-hidden="true" />
                Top performing
              </span>
            </button>

            <div className="mt-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {spotlightVideo.title}
                </p>
                <p className="mt-0.5 text-[0.6875rem] text-zinc-400 truncate">
                  {spotlightVideo.category.name} · {formatViews(spotlightVideo.views)} plays
                </p>
              </div>
              <span className="font-mono text-xs font-semibold text-zinc-100 tabular-nums shrink-0">
                {computeViewSharePercent(spotlightVideo.views, totalViews)}%
              </span>
            </div>

            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-300"
                style={{
                  width: `${Math.max(
                    12,
                    computeViewSharePercent(spotlightVideo.views, totalViews)
                  )}%`,
                }}
              />
            </div>

            {secondaryQueue.length > 0 && (
              <div className="mt-3.5 space-y-2.5 pt-3 border-t border-white/[0.06]">
                {secondaryQueue.map((item) => {
                  const pct = computeViewSharePercent(item.views, totalViews);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onEditVideo(item)}
                      className="group flex w-full items-center gap-2.5 text-left rounded-lg hover:bg-white/[0.04] p-1 -m-1 transition-colors cursor-pointer"
                    >
                      <div className="h-9 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-900 border border-white/10">
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-zinc-100 truncate group-hover:text-orange-300 transition-colors">
                          {item.title}
                        </p>
                        <p className="text-[0.625rem] text-zinc-500 truncate">
                          {item.category.name}
                        </p>
                      </div>
                      <span className="font-mono text-[0.6875rem] text-zinc-400 tabular-nums shrink-0">
                        {pct}%
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-zinc-400 py-4 text-center">
            No published videos yet.
          </p>
        )}

        <button
          type="button"
          onClick={onOpenAllLinks}
          className="mt-3.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-orange-500/25 bg-gradient-to-r from-orange-500/15 to-amber-500/10 text-xs font-medium text-orange-200 hover:border-orange-500/45 hover:text-white transition-all cursor-pointer"
        >
          <span>Open link catalog</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </section>

      {/* Panel 2: Catalog Engagement Bar Chart (Mirrors "Monthly usage" in Reference) */}
      <section className="rounded-[1.375rem] border border-white/[0.08] bg-[#131111] p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold text-white">Catalog plays</h2>
          <span className="text-[0.6875rem] text-zinc-500 tabular-nums">
            {formatViews(totalLikes)} likes
          </span>
        </div>

        <div className="mt-2 flex items-baseline gap-1.5">
          <p className="font-display text-2xl font-semibold tracking-tight text-white tabular-nums">
            {formatViews(totalViews)}
          </p>
          <span className="text-xs text-zinc-500 tabular-nums">
            / {videos.length} {videos.length === 1 ? 'link' : 'links'}
          </span>
        </div>

        {activeBar && (
          <div className="mt-2.5 flex items-center justify-end">
            <span
              data-testid="engagement-active-tooltip"
              className="inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-0.5 text-[0.625rem] font-semibold text-[#090808] shadow-sm max-w-full truncate tabular-nums"
            >
              <span className="truncate max-w-[8.75rem]">{activeBar.shortLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{formatViews(activeBar.views)}</span>
            </span>
          </div>
        )}

        <div
          className="mt-3 flex h-20 items-end gap-1.5"
          role="group"
          aria-label="Views distribution across catalog videos"
        >
          {engagementBars.map((bar) => {
            const isHighlighted = activeBar?.id === bar.id;
            return (
              <button
                key={bar.id}
                type="button"
                onMouseEnter={() => setHoveredBarId(bar.id)}
                onFocus={() => setHoveredBarId(bar.id)}
                onMouseLeave={() => setHoveredBarId(null)}
                onClick={() => {
                  const target = videos.find((v) => v.id === bar.id);
                  if (target) onEditVideo(target);
                }}
                aria-label={`${bar.label}: ${formatViews(bar.views)} plays`}
                className="group relative flex flex-1 h-full items-end cursor-pointer focus:outline-none"
              >
                <span
                  className={cn(
                    'w-full rounded-t-md transition-all duration-200',
                    isHighlighted
                      ? 'bg-gradient-to-t from-orange-600 to-orange-400 shadow-[0_0_16px_rgba(249,115,22,0.45)]'
                      : 'bg-white/[0.11] group-hover:bg-white/[0.22]'
                  )}
                  style={{ height: `${bar.heightPercent}%` }}
                />
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex items-center justify-between text-[0.625rem] text-zinc-500">
          <span>Catalog mix</span>
          <span>Live Neon DB</span>
        </div>
      </section>

      {/* Panel 3: Educator Channels (Mirrors "Your avatars" in Reference) */}
      <section className="rounded-[1.375rem] border border-white/[0.08] bg-[#131111] p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-xs font-semibold text-white">Educators</h2>
          <Link
            href="/educators"
            className="text-[0.6875rem] font-medium text-zinc-400 hover:text-white transition-colors"
          >
            View all
          </Link>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {educators.slice(0, 4).map((ed, idx) => (
            <button
              key={ed.id}
              type="button"
              onClick={() => onOpenAddWithEducator(ed.name)}
              title={`Publish link for ${ed.name}`}
              className="group flex flex-col items-center gap-1.5 cursor-pointer"
            >
              <span
                className={cn(
                  'inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white ring-1 ring-white/15 group-hover:ring-orange-400/70 transition-all',
                  AVATAR_TONES[idx % AVATAR_TONES.length]
                )}
              >
                {getEducatorInitials(ed.name)}
              </span>
              <span className="text-[0.625rem] text-zinc-400 group-hover:text-white truncate w-full text-center">
                {ed.name.replace(/^(Dr\.?|Prof\.?)\s+/i, '').split(' ')[0]}
              </span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => onOpenAddWithEducator('')}
            aria-label="Add link for a new educator"
            className="group flex flex-col items-center gap-1.5 cursor-pointer"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-white/20 bg-white/[0.04] text-zinc-300 group-hover:border-orange-400/70 group-hover:text-white transition-colors">
              <Plus className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-[0.625rem] text-zinc-400 group-hover:text-white">Add</span>
          </button>
        </div>

        {topCategory && (
          <button
            type="button"
            onClick={() => onFilterByCategory(topCategory.slug)}
            className="mt-3.5 flex w-full items-center justify-between gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.07] px-3 py-2.5 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 text-orange-400">
                <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate">
                  Trending: {topCategory.name}
                </p>
                <p className="text-[0.625rem] text-zinc-400 tabular-nums">
                  {topCategory.videoCount}{' '}
                  {topCategory.videoCount === 1 ? 'video' : 'videos'} published
                </p>
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
          </button>
        )}
      </section>

      {/* Panel 4: Recent Comments Activity (Mirrors "Team activity" in Reference) */}
      <section className="rounded-[1.375rem] border border-white/[0.08] bg-[#131111] p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-xs font-semibold text-white">Recent comments</h2>
          <button
            type="button"
            onClick={onOpenComments}
            className="text-[0.6875rem] font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            See all
          </button>
        </div>

        {recentComments.length === 0 ? (
          <div className="flex items-center gap-2.5 py-2 text-xs text-zinc-500">
            <MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>No viewer comments yet.</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentComments.map((item, idx) => {
              const name = item.isAnonymous ? 'Anonymous' : item.author.name;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={onOpenComments}
                  className="group flex w-full items-center gap-2.5 text-left rounded-lg hover:bg-white/[0.04] p-1 -m-1 transition-colors cursor-pointer"
                >
                  <span
                    className={cn(
                      'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[0.625rem] font-bold text-white',
                      AVATAR_TONES[(idx + 1) % AVATAR_TONES.length]
                    )}
                  >
                    {getEducatorInitials(name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.6875rem] text-zinc-200 truncate">
                      <span className="font-semibold text-white">{name}</span>{' '}
                      <span className="text-zinc-400">on {item.videoTitle}</span>
                    </p>
                    <p className="text-[0.625rem] text-zinc-500 truncate">{item.content}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </aside>
  );
}
