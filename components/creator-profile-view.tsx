'use client';

import * as React from 'react';
import { BadgeCheck, UserCheck, UserPlus } from 'lucide-react';
import type { User, VideoWithMeta } from '@/lib/types';
import { formatViews } from '@/lib/video-utils';
import { EducatorAvatar } from '@/components/ui/avatar';
import { VideoCard } from '@/components/video-card';
import { Button } from '@/components/ui/button';
import { TransitionLink } from '@/components/transition-link';

interface CreatorProfileViewProps {
  creator: User;
  videos: VideoWithMeta[];
  totalViews: number;
  initialIsFollowing: boolean;
}

export function CreatorProfileView({
  creator,
  videos,
  totalViews,
  initialIsFollowing,
}: CreatorProfileViewProps) {
  const [isFollowing, setIsFollowing] = React.useState(initialIsFollowing);
  const [followersCount, setFollowersCount] = React.useState(creator.followersCount);

  const handleToggleFollow = async () => {
    const next = !isFollowing;
    setIsFollowing(next);
    setFollowersCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      const res = await fetch(`/api/creators/${creator.username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId: creator.id }),
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

  return (
    <div className="max-w-[105rem] mx-auto px-4 sm:px-6 py-8">
      {/* Channel Banner / Header */}
      <section className="rounded-2xl bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <EducatorAvatar
              name={creator.name}
              src={creator.avatarUrl}
              size="xl"
            />
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
                  {creator.name}
                </h1>
                {creator.isEducator && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                    <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                    Verified Educator
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                @{creator.username} · {formatViews(followersCount)} followers ·{' '}
                {videos.length} {videos.length === 1 ? 'video' : 'videos'} ·{' '}
                {formatViews(totalViews)} views
              </p>

              <p className="mt-2.5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {creator.bio}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <Button
              type="button"
              variant={isFollowing ? 'sage' : 'dark'}
              size="md"
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
                  Follow Channel
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      <section aria-labelledby="published-heading">
        <div className="mb-5 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <h2
            id="published-heading"
            className="font-display text-lg font-semibold text-zinc-950 dark:text-white"
          >
            Videos
          </h2>
        </div>

        {videos.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] px-6 py-14 text-center">
            <p className="font-display text-lg text-zinc-950 dark:text-white">
              No curated videos in this channel yet.
            </p>
            <div className="mt-4">
              <Button asChild variant="subtle" size="sm">
                <TransitionLink href="/">Browse All Videos</TransitionLink>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
            {videos.map((video, idx) => (
              <VideoCard key={video.id} video={video} index={idx} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
