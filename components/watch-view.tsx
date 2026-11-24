'use client';

import * as React from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  ChevronRight,
  ExternalLink,
  ListVideo,
  Share2,
  ThumbsUp,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import type { VideoDetail } from '@/lib/types';
import {
  computeWatchProgress,
  extractSourceHost,
  formatDuration,
  formatEditorialDate,
  formatViews,
  getActiveChapterIndex,
} from '@/lib/video-utils';
import {
  resolveVideoProgressSeconds,
  setLocalWatchProgress,
  useWatchProgressMap,
} from '@/lib/watch-progress-store';
import { VideoPlayer } from '@/components/video-player';
import { ContentRatingBadge } from '@/components/content-rating-badge';
import { ReflectionCard } from '@/components/reflection-card';
import { DiscussionSection } from '@/components/discussion-section';
import { ShareModal } from '@/components/share-modal';
import { EducatorAvatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { TransitionLink } from '@/components/transition-link';
import { useViewTransition } from '@/components/view-transition-provider';
import { cn } from '@/lib/utils';

interface WatchViewProps {
  video: VideoDetail;
}

export function WatchView({ video }: WatchViewProps) {
  const localProgressMap = useWatchProgressMap();
  const { navigateBackToBrowse, runLayoutTransition } = useViewTransition();
  const initialProgress = computeWatchProgress(
    video.watchProgressSeconds,
    video.durationSeconds
  );
  const [theaterMode, setTheaterMode] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(() =>
    initialProgress.hasProgress && !initialProgress.isCompleted
      ? initialProgress.clampedSeconds
      : 0
  );
  const [seekRequest, setSeekRequest] = React.useState<{
    seconds: number;
    nonce: number;
  } | null>(null);
  const [viewsCount, setViewsCount] = React.useState(video.views);
  const [likesCount, setLikesCount] = React.useState(video.likes);
  const [hasLiked, setHasLiked] = React.useState(Boolean(video.hasLiked));
  const [isBookmarked, setIsBookmarked] = React.useState(Boolean(video.isBookmarked));
  const [isFollowing, setIsFollowing] = React.useState(video.isFollowingCreator);
  const [followersCount, setFollowersCount] = React.useState(
    video.creator.followersCount
  );
  const [shareOpen, setShareOpen] = React.useState(false);
  const [discussionDraftSeed, setDiscussionDraftSeed] = React.useState<string>('');

  const sourceHost = extractSourceHost(video.videoUrl);
  const activeChapterIdx = getActiveChapterIndex(video.chapters, currentTime);

  const persistProgress = React.useCallback(
    (seconds: number) => {
      const clamped = Math.max(0, Math.min(video.durationSeconds, Math.floor(seconds)));
      setLocalWatchProgress(video.id, clamped);
      fetch('/api/bookmarks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id, progressSeconds: clamped }),
        keepalive: true,
      }).catch(() => {});
    },
    [video.id, video.durationSeconds]
  );

  const seekNonceRef = React.useRef(0);
  const handleSelectChapter = (timestampSeconds: number) => {
    seekNonceRef.current += 1;
    setSeekRequest({ seconds: timestampSeconds, nonce: seekNonceRef.current });
    persistProgress(timestampSeconds);
  };

  const handlePlayRedirect = () => {
    setViewsCount((v) => v + 1);
    const currentSaved = resolveVideoProgressSeconds(
      video.id,
      video.watchProgressSeconds,
      localProgressMap
    );
    const minPlayProgress = Math.max(
      currentSaved,
      Math.floor(video.durationSeconds * 0.15)
    );
    setLocalWatchProgress(video.id, minPlayProgress);
    fetch(`/api/videos/${video.id}/play`, {
      method: 'POST',
      keepalive: true,
    }).catch(() => {});
  };

  const handleToggleLike = async () => {
    const nextLiked = !hasLiked;
    setHasLiked(nextLiked);
    setLikesCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));
    try {
      const res = await fetch(`/api/videos/${video.id}/like`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setHasLiked(Boolean(data.hasLiked));
        setLikesCount(Number(data.likes));
      }
    } catch {
      setHasLiked(!nextLiked);
      setLikesCount((c) => Math.max(0, c + (nextLiked ? -1 : 1)));
    }
  };

  const handleToggleBookmark = async () => {
    const next = !isBookmarked;
    setIsBookmarked(next);
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsBookmarked(Boolean(data.isBookmarked));
      }
    } catch {
      setIsBookmarked(!next);
    }
  };

  const handleToggleFollow = async () => {
    const next = !isFollowing;
    setIsFollowing(next);
    setFollowersCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      const res = await fetch(`/api/creators/${video.creator.username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId: video.creator.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(Boolean(data.isFollowing));
        setFollowersCount(data.followersCount);
      }
    } catch {
      setIsFollowing(!next);
    }
  };

  const handleShare = () => {
    setShareOpen(true);
  };

  const handleToggleTheater = () => {
    const stageEl = document.querySelector<HTMLElement>(
      '[data-vt-source="player"] [data-vt-role="poster"]'
    );
    runLayoutTransition(() => {
      setTheaterMode((t) => !t);
    }, stageEl);
  };

  return (
    <div
      data-vt-video-id={video.id}
      data-vt-source="player"
      className="max-w-[100rem] mx-auto px-4 sm:px-6 py-4 sm:py-6"
    >
      {/* Watch Page Player Header Strip: Back Navigation + 18+ Transparency Rating */}
      <div
        data-testid="watch-player-header"
        className="mb-3.5 flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            data-testid="watch-back-btn"
            onClick={() => navigateBackToBrowse('/')}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white dark:bg-[#181820] border border-zinc-200/90 dark:border-zinc-800 px-3 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:border-rose-300 dark:hover:border-rose-500/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to Browse</span>
          </button>

          <ChevronRight
            className="hidden sm:block h-3.5 w-3.5 text-zinc-400 dark:text-zinc-600 shrink-0"
            aria-hidden="true"
          />

          <TransitionLink
            href={`/?category=${video.category.slug}`}
            className="hidden sm:inline-flex items-center text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors truncate"
          >
            {video.category.name}
          </TransitionLink>
        </div>

        <ContentRatingBadge
          rating={video.contentRating}
          variant="player-header"
          interactive
        />
      </div>

      {/* Theater Mode Full-Width Cinema Stage */}
      {theaterMode && (
        <div className="mb-6">
          <VideoPlayer
            title={video.title}
            videoUrl={video.videoUrl}
            thumbnailUrl={video.thumbnailUrl}
            durationSeconds={video.durationSeconds}
            contentRating={video.contentRating}
            chapters={video.chapters}
            currentTime={currentTime}
            onTimeUpdate={setCurrentTime}
            onUserSeek={persistProgress}
            seekRequest={seekRequest}
            theaterMode={theaterMode}
            onToggleTheater={handleToggleTheater}
            onPlayRedirect={handlePlayRedirect}
          />
        </div>
      )}

      {/* YouTube-Style Two-Column Watch Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Video + Info + Reflection + Discussion Column */}
        <div className="lg:col-span-8 min-w-0">
          {!theaterMode && (
            <VideoPlayer
              title={video.title}
              videoUrl={video.videoUrl}
              thumbnailUrl={video.thumbnailUrl}
              durationSeconds={video.durationSeconds}
              contentRating={video.contentRating}
              chapters={video.chapters}
              currentTime={currentTime}
              onTimeUpdate={setCurrentTime}
              onUserSeek={persistProgress}
              seekRequest={seekRequest}
              theaterMode={theaterMode}
              onToggleTheater={handleToggleTheater}
              onPlayRedirect={handlePlayRedirect}
            />
          )}

          {/* Video Title */}
          <h1
            data-vt-role="title"
            className="mt-4 font-display text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white leading-snug"
          >
            {video.title}
          </h1>

          {/* Channel & Viewer Action Bar (Follow, Like, Share, Save) */}
          <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <TransitionLink
                href={`/creator/${video.creator.username}`}
                className="shrink-0"
              >
                <EducatorAvatar
                  name={video.creator.name}
                  src={video.creator.avatarUrl}
                  size="md"
                />
              </TransitionLink>
              <div className="min-w-0 mr-2">
                <div className="flex items-center gap-1.5">
                  <TransitionLink
                    href={`/creator/${video.creator.username}`}
                    className="font-semibold text-sm sm:text-base text-zinc-950 dark:text-white hover:text-rose-600 dark:hover:text-rose-400 transition-colors truncate"
                  >
                    {video.creator.name}
                  </TransitionLink>
                  {video.creator.isEducator && (
                    <BadgeCheck
                      className="h-4 w-4 text-rose-600 dark:text-rose-500 shrink-0"
                      aria-label="Verified Educator"
                    />
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums truncate">
                  {formatViews(followersCount)} followers
                </p>
              </div>

              <Button
                type="button"
                variant={isFollowing ? 'sage' : 'dark'}
                size="sm"
                onClick={handleToggleFollow}
                aria-pressed={isFollowing}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="h-4 w-4" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Follow
                  </>
                )}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                type="button"
                variant={hasLiked ? 'primary' : 'subtle'}
                size="sm"
                onClick={handleToggleLike}
                aria-pressed={hasLiked}
                aria-label={hasLiked ? 'Unlike video' : 'Like video'}
              >
                <ThumbsUp
                  className={cn('h-4 w-4', hasLiked && 'fill-current')}
                />
                <span className="tabular-nums">{formatViews(likesCount)}</span>
              </Button>

              <Button
                type="button"
                variant={isBookmarked ? 'primary' : 'subtle'}
                size="sm"
                onClick={handleToggleBookmark}
                aria-pressed={isBookmarked}
              >
                <Bookmark
                  className={cn('h-4 w-4', isBookmarked && 'fill-current')}
                />
                {isBookmarked ? 'Saved' : 'Save'}
              </Button>

              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>

          {/* YouTube-Style Description & Source Destination Box */}
          <div className="mt-4 rounded-xl bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800/90 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-zinc-700 dark:text-zinc-200 tabular-nums">
                <span>{formatViews(viewsCount)} views</span>
                <span aria-hidden="true">·</span>
                <span>{formatEditorialDate(video.createdAt)}</span>
                <span aria-hidden="true">·</span>
                <TransitionLink
                  href={`/?category=${video.category.slug}`}
                  className="text-rose-600 dark:text-rose-400 hover:underline"
                >
                  {video.category.name}
                </TransitionLink>
              </div>

              <a
                href={video.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handlePlayRedirect}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-500 dark:hover:text-rose-300 transition-colors"
              >
                <span>Open original on {sourceHost}</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>

            <p className="mt-2.5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {video.description}
            </p>
          </div>

          {/* Dedicated Reflection Prompt Card */}
          <div className="mt-5">
            <ReflectionCard
              videoId={video.id}
              prompt={video.reflectionPrompt}
              onShareToDiscussion={(note) => setDiscussionDraftSeed(note)}
            />
          </div>

          {/* Discussion & Q&A */}
          <DiscussionSection
            videoId={video.id}
            initialComments={video.comments}
            draftSeed={discussionDraftSeed}
            onDraftSeedConsumed={() => setDiscussionDraftSeed('')}
          />
        </div>

        {/* Right Sidebar: Chapters Panel + Dense Up Next Video Rail */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Timestamped Chapters Sidebar */}
          <section
            aria-labelledby="chapters-heading"
            className="rounded-xl bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800/90 overflow-hidden"
          >
            <div className="flex items-center justify-between gap-2 px-4 py-3.5 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <ListVideo className="h-4 w-4 text-rose-600 dark:text-rose-500" aria-hidden="true" />
                <h2
                  id="chapters-heading"
                  className="font-display text-sm font-semibold text-zinc-950 dark:text-white"
                >
                  Chapters
                </h2>
              </div>
              <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                {video.chapters.length} parts
              </span>
            </div>

            <ol className="p-2 space-y-1" data-testid="chapters-list">
              {video.chapters.map((chapter, idx) => {
                const isActive = idx === activeChapterIdx;
                return (
                  <li key={chapter.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectChapter(chapter.timestampSeconds)}
                      aria-current={isActive ? 'step' : undefined}
                      className={cn(
                        'w-full text-left rounded-lg px-3 py-2.5 transition-colors cursor-pointer flex items-start gap-3',
                        isActive
                          ? 'bg-rose-50 dark:bg-rose-600/15 text-zinc-950 dark:text-white'
                          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300'
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 rounded bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 font-mono text-[0.6875rem] font-medium tabular-nums shrink-0',
                          isActive
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-zinc-500 dark:text-zinc-400'
                        )}
                      >
                        {formatDuration(chapter.timestampSeconds)}
                      </span>
                      <div className="min-w-0">
                        <p
                          className={cn(
                            'text-sm leading-snug',
                            isActive
                              ? 'font-semibold text-zinc-950 dark:text-white'
                              : 'font-medium'
                          )}
                        >
                          {chapter.title}
                        </p>
                        {chapter.summary && (
                          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                            {chapter.summary}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Up Next Recommendations */}
          {video.relatedVideos.length > 0 && (
            <section aria-labelledby="up-next-heading">
              <h2
                id="up-next-heading"
                className="font-display text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3"
              >
                Up Next
              </h2>
              <div className="space-y-3">
                {video.relatedVideos.map((rel) => {
                  const relSecs = resolveVideoProgressSeconds(
                    rel.id,
                    rel.watchProgressSeconds,
                    localProgressMap
                  );
                  const relProgress = computeWatchProgress(relSecs, rel.durationSeconds);
                  return (
                  <TransitionLink
                    key={rel.id}
                    href={`/watch/${rel.id}`}
                    videoId={rel.id}
                    data-vt-video-id={rel.id}
                    data-vt-source="upnext"
                    className="group flex gap-3 rounded-lg p-1.5 -mx-1.5 hover:bg-zinc-200/70 dark:hover:bg-zinc-800/60 transition-colors"
                  >
                    <div
                      data-vt-role="poster"
                      className="relative w-40 aspect-video shrink-0 overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-900"
                    >
                      <img
                        src={rel.thumbnailUrl}
                        alt={rel.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <ContentRatingBadge
                        rating={rel.contentRating}
                        variant="micro"
                        className="absolute top-1.5 left-1.5"
                      />
                      {relProgress.hasProgress && (
                        <div
                          role="progressbar"
                          aria-label={`Watch progress for ${rel.title}: ${relProgress.statusLabel}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={relProgress.percent}
                          className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-black/60"
                        >
                          <div className="h-full w-full bg-white/25 overflow-hidden">
                            <div
                              className="h-full bg-[#FF0033]"
                              style={{ width: `${relProgress.percent}%` }}
                            />
                          </div>
                        </div>
                      )}
                      <span
                        className={cn(
                          'absolute right-1 rounded bg-black/85 px-1.5 py-0.5 font-mono text-[0.625rem] text-white tabular-nums',
                          relProgress.hasProgress ? 'bottom-1.5' : 'bottom-1'
                        )}
                      >
                        {formatDuration(rel.durationSeconds)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                      <div>
                        <h3
                          data-vt-role="title"
                          className="text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-100 line-clamp-2 group-hover:text-rose-600 dark:group-hover:text-white"
                        >
                          {rel.title}
                        </h3>
                        <div className="mt-1 flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                          <span className="truncate">{rel.creator.name}</span>
                          {rel.creator.isEducator && (
                            <BadgeCheck className="h-3 w-3 text-rose-600 dark:text-rose-500 shrink-0" />
                          )}
                        </div>
                      </div>
                      <p className="text-[0.6875rem] text-zinc-500 tabular-nums">
                        {formatViews(rel.views)} views · {formatEditorialDate(rel.createdAt)}
                      </p>
                    </div>
                  </TransitionLink>
                  );
                })}
              </div>
            </section>
          )}
        </aside>
      </div>

      <ShareModal
        target={
          shareOpen
            ? {
                videoId: video.id,
                title: video.title,
                thumbnailUrl: video.thumbnailUrl,
                sourceUrl: video.videoUrl,
              }
            : null
        }
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}
