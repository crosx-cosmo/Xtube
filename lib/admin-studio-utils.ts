import type { VideoWithMeta } from './types';

export interface EngagementBarItem {
  id: string;
  label: string;
  shortLabel: string;
  views: number;
  heightPercent: number;
  isPeak: boolean;
}

export function getTimeOfDayGreeting(hour: number): string {
  const normalized = Number.isFinite(hour) ? ((Math.floor(hour) % 24) + 24) % 24 : 12;
  if (normalized < 12) return 'Good morning';
  if (normalized < 18) return 'Good afternoon';
  return 'Good evening';
}

export function computeViewSharePercent(videoViews: number, totalViews: number): number {
  if (!Number.isFinite(videoViews) || !Number.isFinite(totalViews) || totalViews <= 0) {
    return 0;
  }
  const clampedViews = Math.max(0, videoViews);
  return Math.min(100, Math.max(1, Math.round((clampedViews / totalViews) * 100)));
}

export function buildEngagementBars(
  videos: Pick<VideoWithMeta, 'id' | 'title' | 'views' | 'category'>[],
  maxBars = 11
): EngagementBarItem[] {
  if (!Array.isArray(videos) || videos.length === 0) {
    return [];
  }

  const limit = Math.max(1, maxBars);
  const sliced = videos.slice(0, limit);
  const maxViews = Math.max(...sliced.map((v) => Math.max(0, v.views)), 1);

  let peakIdx = 0;
  for (let i = 1; i < sliced.length; i += 1) {
    if (sliced[i].views > sliced[peakIdx].views) {
      peakIdx = i;
    }
  }

  return sliced.map((video, idx) => {
    const safeViews = Math.max(0, video.views);
    const ratio = safeViews / maxViews;
    const heightPercent = Math.round(20 + ratio * 80);
    const words = video.category?.name?.trim().split(/\s+/) ?? [];
    const shortLabel =
      words.length > 0 ? words[0].slice(0, 8) : video.title.slice(0, 8);

    return {
      id: video.id,
      label: video.title,
      shortLabel,
      views: safeViews,
      heightPercent,
      isPeak: idx === peakIdx,
    };
  });
}

export function filterAdminVideos<T extends Pick<VideoWithMeta, 'title' | 'description' | 'videoUrl' | 'category' | 'creator'>>(
  videos: T[],
  options: { query?: string; categorySlug?: string | null }
): T[] {
  const q = (options.query ?? '').trim().toLowerCase();
  const slug = (options.categorySlug ?? '').trim().toLowerCase();

  return videos.filter((video) => {
    if (slug && slug !== 'all' && video.category.slug.toLowerCase() !== slug) {
      return false;
    }
    if (!q) return true;
    return (
      video.title.toLowerCase().includes(q) ||
      video.description.toLowerCase().includes(q) ||
      video.category.name.toLowerCase().includes(q) ||
      video.creator.name.toLowerCase().includes(q) ||
      video.videoUrl.toLowerCase().includes(q)
    );
  });
}

export function getEducatorInitials(name: string): string {
  const cleaned = name
    .replace(/^(dr\.?|prof\.?|mr\.?|ms\.?|mrs\.?)\s+/i, '')
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AD';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const COLLECTION_DOT_PALETTE = [
  'bg-orange-400',
  'bg-amber-400',
  'bg-sky-400',
  'bg-emerald-400',
  'bg-rose-400',
  'bg-violet-400',
];

export function getCollectionDotClass(index: number): string {
  const safeIdx = ((Math.floor(index) % COLLECTION_DOT_PALETTE.length) + COLLECTION_DOT_PALETTE.length) % COLLECTION_DOT_PALETTE.length;
  return COLLECTION_DOT_PALETTE[safeIdx];
}
