'use client';

import * as React from 'react';
import { Bookmark, Clock, Trash2 } from 'lucide-react';
import type { VideoWithMeta, WatchHistoryEntry } from '@/lib/types';
import { VideoCard } from '@/components/video-card';
import { TransitionLink } from '@/components/transition-link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { requestApiJson } from '@/lib/api-client';
import { formatDuration, formatEditorialDate } from '@/lib/video-utils';
import {
  clearLocalWatchProgress,
  resolveVideoProgressSeconds,
  useWatchProgressMap,
} from '@/lib/watch-progress-store';

interface LibraryViewProps {
  initialBookmarks: VideoWithMeta[];
  initialHistory: WatchHistoryEntry[];
  initialTab?: 'saved' | 'history';
}

export function LibraryView({
  initialBookmarks,
  initialHistory,
  initialTab = 'saved',
}: LibraryViewProps) {
  const [bookmarks, setBookmarks] = React.useState<VideoWithMeta[]>(initialBookmarks);
  const [history, setHistory] = React.useState<WatchHistoryEntry[]>(initialHistory);
  const [clearing, setClearing] = React.useState(false);
  const localProgressMap = useWatchProgressMap();

  const handleToggleBookmark = async (videoId: string) => {
    setBookmarks((prev) => prev.filter((v) => v.id !== videoId));
    await requestApiJson('/api/bookmarks', {
      method: 'POST',
      json: { videoId },
    });
  };

  const handleClearHistory = async () => {
    setClearing(true);
    try {
      const { ok } = await requestApiJson('/api/bookmarks', {
        method: 'DELETE',
      });
      if (ok) {
        setHistory([]);
        clearLocalWatchProgress();
      }
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="max-w-[105rem] mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
          Library
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Your saved seminars and recent watch history.
        </p>
      </div>

      <Tabs defaultValue={initialTab}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="saved">
              <Bookmark className="h-4 w-4" aria-hidden="true" />
              Saved Videos
              <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                ({bookmarks.length})
              </span>
            </TabsTrigger>
            <TabsTrigger value="history">
              <Clock className="h-4 w-4" aria-hidden="true" />
              Watch History
              <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                ({history.length})
              </span>
            </TabsTrigger>
          </TabsList>

          {history.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={clearing}
              onClick={handleClearHistory}
            >
              <Trash2 className="h-4 w-4" />
              Clear Watch History
            </Button>
          )}
        </div>

        <TabsContent value="saved">
          {bookmarks.length === 0 ? (
            <div className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#121218] px-6 py-16 text-center">
              <p className="font-display text-lg font-semibold text-zinc-950 dark:text-white">
                No saved videos yet.
              </p>
              <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                Save videos from the feed or watch page to revisit them anytime.
              </p>
              <div className="mt-6">
                <Button asChild variant="primary" size="sm">
                  <TransitionLink href="/">Browse Videos</TransitionLink>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {bookmarks.map((video, idx) => (
                <VideoCard
                  key={video.id}
                  video={{ ...video, isBookmarked: true }}
                  index={idx}
                  variant="cinema"
                  progressSeconds={resolveVideoProgressSeconds(
                    video.id,
                    video.watchProgressSeconds,
                    localProgressMap
                  )}
                  onToggleBookmark={handleToggleBookmark}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          {history.length === 0 ? (
            <div className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#121218] px-6 py-16 text-center">
              <p className="font-display text-lg font-semibold text-zinc-950 dark:text-white">
                Your watch history is empty.
              </p>
              <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                Videos you watch will show up here with playback progress bars.
              </p>
              <div className="mt-6">
                <Button asChild variant="outline" size="sm">
                  <TransitionLink href="/">Explore Feed</TransitionLink>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {history.map((entry, idx) => (
                <div key={entry.videoId} className="space-y-2">
                  <VideoCard
                    video={entry.video}
                    index={idx}
                    variant="cinema"
                    progressSeconds={entry.progressSeconds}
                  />
                  <div className="flex items-center justify-between px-1 text-xs text-zinc-500">
                    <span>Watched {formatEditorialDate(entry.watchedAt)}</span>
                    <span className="font-mono tabular-nums">
                      At {formatDuration(entry.progressSeconds)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
