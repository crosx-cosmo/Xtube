'use client';

import * as React from 'react';
import Link from 'next/link';
import { BadgeCheck, UserCheck, UserPlus } from 'lucide-react';
import type { User } from '@/lib/types';
import { formatViews } from '@/lib/video-utils';
import { EducatorAvatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export type EducatorSummary = User & {
  videoCount: number;
  totalViews: number;
  isFollowing: boolean;
};

interface EducatorsDirectoryProps {
  initialEducators: EducatorSummary[];
}

export function EducatorsDirectory({ initialEducators }: EducatorsDirectoryProps) {
  const [educators, setEducators] = React.useState(initialEducators);

  const handleToggleFollow = async (educator: EducatorSummary) => {
    setEducators((prev) =>
      prev.map((item) =>
        item.id === educator.id
          ? {
              ...item,
              isFollowing: !item.isFollowing,
              followersCount: Math.max(
                0,
                item.followersCount + (item.isFollowing ? -1 : 1)
              ),
            }
          : item
      )
    );

    try {
      const res = await fetch(`/api/creators/${educator.username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId: educator.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setEducators((prev) =>
          prev.map((item) =>
            item.id === educator.id
              ? {
                  ...item,
                  isFollowing: Boolean(data.isFollowing),
                  followersCount: data.followersCount,
                }
              : item
          )
        );
      }
    } catch {
      // Keep optimistic state
    }
  };

  return (
    <div className="max-w-[90rem] mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8 max-w-2xl">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
          Verified Educator Channels
        </h1>
        <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
          Follow clinicians, philosophers, and relationship educators publishing weekly video seminars.
        </p>
      </div>

      {educators.length === 0 ? (
        <div
          data-testid="empty-educators-state"
          className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#121218] px-6 py-16 text-center shadow-xs"
        >
          <p className="font-display text-lg font-semibold text-zinc-950 dark:text-white">
            No educator channels yet.
          </p>
          <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            Educator profiles appear automatically once videos are added to your database.
          </p>
          <div className="mt-6">
            <Button asChild variant="outline" size="sm">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {educators.map((educator) => (
            <article
              key={educator.id}
              className="rounded-[1.5rem] bg-white dark:bg-[#121218] border border-zinc-200/80 dark:border-zinc-800/80 p-5 sm:p-6 shadow-[0_2px_12px_rgba(15,23,42,0.03)] dark:shadow-none flex flex-col justify-between gap-5"
            >
              <div className="flex items-start gap-4">
                <Link href={`/creator/${educator.username}`} className="shrink-0">
                  <EducatorAvatar
                    name={educator.name}
                    src={educator.avatarUrl}
                    size="lg"
                  />
                </Link>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/creator/${educator.username}`}
                      className="font-display text-lg font-semibold text-zinc-950 dark:text-white hover:text-rose-600 dark:hover:text-rose-400 transition-colors truncate"
                    >
                      {educator.name}
                    </Link>
                    <BadgeCheck
                      className="h-4 w-4 text-rose-600 dark:text-rose-500 shrink-0"
                      aria-label="Verified Educator"
                    />
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {educator.credentials}
                  </p>
                  <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed line-clamp-2">
                    {educator.bio}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums flex items-center gap-2">
                  <span>{formatViews(educator.followersCount)} followers</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {educator.videoCount}{' '}
                    {educator.videoCount === 1 ? 'video' : 'videos'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/creator/${educator.username}`}>Visit Channel</Link>
                  </Button>
                  <Button
                    type="button"
                    variant={educator.isFollowing ? 'sage' : 'dark'}
                    size="sm"
                    onClick={() => handleToggleFollow(educator)}
                    aria-pressed={educator.isFollowing}
                  >
                    {educator.isFollowing ? (
                      <>
                        <UserCheck className="h-3.5 w-3.5" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5" />
                        Follow
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
