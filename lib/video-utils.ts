import type { AdminVideoLinkPayload, CommentItem, CommentNode, VideoChapter } from './types';

/**
 * Formats seconds into MM:SS or H:MM:SS for tabular video timecodes.
 */
export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export interface DurationHms {
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Splits total seconds into whole Hours, Minutes, and Seconds.
 */
export function splitDurationToHms(totalSeconds: number): DurationHms {
  const safe = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  return {
    hours: Math.floor(safe / 3600),
    minutes: Math.floor((safe % 3600) / 60),
    seconds: safe % 60,
  };
}

/**
 * Combines Hours, Minutes, and Seconds into total non-negative integer seconds.
 */
export function combineHmsToSeconds(hours: number, minutes: number, seconds: number): number {
  const safeHours = Number.isFinite(hours) ? Math.max(0, Math.floor(hours)) : 0;
  const safeMinutes = Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes)) : 0;
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return safeHours * 3600 + safeMinutes * 60 + safeSeconds;
}

/**
 * Parses a timestamp string ("MM:SS" or "H:MM:SS") into total seconds.
 * Returns null if the format is invalid or out of bounds.
 */
export function parseTimestampToSeconds(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(':');
  if (parts.length !== 2 && parts.length !== 3) return null;

  const nums = parts.map((p) => {
    if (!/^\d+$/.test(p)) return Number.NaN;
    return Number.parseInt(p, 10);
  });

  if (nums.some((n) => Number.isNaN(n) || n < 0)) return null;

  if (parts.length === 2) {
    const [minutes, seconds] = nums;
    if (seconds >= 60) return null;
    return minutes * 60 + seconds;
  }

  const [hours, minutes, seconds] = nums;
  if (minutes >= 60 || seconds >= 60) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

const PRIVATE_OR_LOOPBACK_HOST_PATTERN =
  /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|169\.254\.\d+\.\d+|\[::1\]|\[fe80:[^\]]*\]|\[fc00:[^\]]*\]|\[fd[0-9a-f]{2}:[^\]]*\]|.*\.local|.*\.internal)$/i;

/**
 * Validates that an external destination video link uses safe public http:// or https:// protocol.
 * Blocks javascript:, data:, embedded credentials, private/loopback SSRF targets, or malformed URLs.
 */
export function isValidExternalVideoUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 2048) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }
    if (parsed.username || parsed.password) {
      return false;
    }
    const hostname = parsed.hostname.trim().toLowerCase();
    if (!hostname || !hostname.includes('.') || PRIVATE_OR_LOOPBACK_HOST_PATTERN.test(hostname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates thumbnail sources: allows device-uploaded raster base64 data URLs
 * (PNG, JPEG, WebP, GIF), `/api/thumbnails/thumbnails/...` object storage proxy paths,
 * local `/images/...` static assets, or safe http(s) URLs.
 * Explicitly blocks SVG/HTML/javascript payloads and path traversal.
 */
export function isValidThumbnailUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\s]+$/i.test(trimmed)) {
    return true;
  }
  if (
    /^\/api\/thumbnails\/thumbnails\/[a-zA-Z0-9._/-]+\.(?:jpg|jpeg|png|webp|gif)$/i.test(
      trimmed
    ) &&
    !trimmed.includes('..')
  ) {
    return true;
  }
  if (trimmed.startsWith('/images/')) return true;
  return isValidExternalVideoUrl(trimmed);
}

/**
 * Extracts a clean display hostname from an external source link (e.g., "youtube.com").
 */
export function extractSourceHost(input: string): string {
  try {
    const parsed = new URL(input.trim());
    return parsed.hostname.replace(/^www\./i, '');
  } catch {
    return 'external source';
  }
}

/**
 * Formats view or like counts cleanly (e.g., 842, 14.2K, 1.3M).
 */
export function formatViews(views: number): string {
  const safe = Math.max(0, Math.floor(views));
  if (safe >= 1_000_000) {
    return `${(safe / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (safe >= 1_000) {
    return `${(safe / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return safe.toLocaleString('en-US');
}

/**
 * Formats an ISO date into a clean short date (e.g., Oct 14, 2026).
 */
export function formatEditorialDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Recent';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Sorts video chapters in ascending timestamp order without mutating the input array.
 */
export function sortChapters<T extends Pick<VideoChapter, 'timestampSeconds'>>(chapters: T[]): T[] {
  return [...chapters].sort((a, b) => a.timestampSeconds - b.timestampSeconds);
}

/**
 * Determines the active chapter index for a given playback position in seconds.
 */
export function getActiveChapterIndex(
  chapters: Pick<VideoChapter, 'timestampSeconds'>[],
  currentTimeSeconds: number
): number {
  if (chapters.length === 0) return -1;
  const sorted = sortChapters(chapters);
  let active = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (currentTimeSeconds >= sorted[i].timestampSeconds) {
      active = i;
    } else {
      break;
    }
  }
  return active;
}

/**
 * Organizes flat comments (with optional parentId) into a nested discussion tree.
 * Top-level comments are sorted by upvotes descending then newest first; replies are chronological.
 */
export function buildCommentTree(flatComments: CommentItem[]): CommentNode[] {
  const nodeMap = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const comment of flatComments) {
    nodeMap.set(comment.id, { ...comment, replies: [] });
  }

  for (const comment of flatComments) {
    const node = nodeMap.get(comment.id);
    if (!node) continue;

    if (comment.parentId && nodeMap.has(comment.parentId)) {
      nodeMap.get(comment.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRepliesChronological = (nodes: CommentNode[]) => {
    nodes.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    for (const node of nodes) {
      sortRepliesChronological(node.replies);
    }
  };

  roots.sort((a, b) => {
    if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  for (const root of roots) {
    sortRepliesChronological(root.replies);
  }

  return roots;
}

/**
 * Extracts crisp 2-letter initials from a full name for avatars.
 */
export function getInitials(name: string): string {
  const cleaned = name
    .replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s+/i, '')
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'K';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export interface UploadValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  parsedChapters: Array<{ timestampSeconds: number; title: string }>;
}

/**
 * Validates the Admin Video Link submission payload (link saver, thumbnail URL, metadata & chapters).
 * Rejects non-HTTP(S) destination links and malformed timestamps.
 */
export function validateUploadPayload(payload: AdminVideoLinkPayload): UploadValidationResult {
  const errors: Record<string, string> = {};
  const parsedChapters: Array<{ timestampSeconds: number; title: string }> = [];

  if (!payload.title || payload.title.trim().length < 5) {
    errors.title = 'Enter a video title of at least 5 characters.';
  }

  if (!payload.description || payload.description.trim().length < 20) {
    errors.description = 'Provide a description of at least 20 characters.';
  }

  const hasCategoryName = Boolean(payload.categoryName && payload.categoryName.trim().length > 0);
  const hasCategoryId = Boolean(payload.categoryId && payload.categoryId.trim().length > 0);
  if (hasCategoryName) {
    const trimmedCat = payload.categoryName!.trim();
    if (trimmedCat.length < 2 || trimmedCat.length > 60) {
      errors.categoryId = 'Topic category must be between 2 and 60 characters.';
    }
  } else if (!hasCategoryId) {
    errors.categoryId = 'Enter a topic category (at least 2 characters).';
  }

  if (payload.educatorName !== undefined) {
    const trimmedEdu = payload.educatorName.trim();
    if (!trimmedEdu && !payload.userId?.trim()) {
      errors.educatorName = 'Enter an educator or channel name (at least 2 characters).';
    } else if (trimmedEdu && (trimmedEdu.length < 2 || trimmedEdu.length > 80)) {
      errors.educatorName = 'Educator channel name must be between 2 and 80 characters.';
    }
  }

  if (!Number.isFinite(payload.durationSeconds) || Math.floor(payload.durationSeconds) < 1) {
    errors.durationSeconds = 'Enter a duration of at least 1 second (hours, minutes, or seconds).';
  }

  if (!payload.reflectionPrompt || payload.reflectionPrompt.trim().length < 12) {
    errors.reflectionPrompt = 'Include a thoughtful reflection prompt for viewers.';
  }

  if (!payload.videoUrl || !isValidExternalVideoUrl(payload.videoUrl)) {
    errors.videoUrl =
      'Enter a valid external source link starting with https:// or http:// (e.g., https://www.youtube.com/watch?v=...).';
  }

  if (!payload.thumbnailUrl || !isValidThumbnailUrl(payload.thumbnailUrl)) {
    errors.thumbnailUrl =
      'Upload a thumbnail image from your device (PNG, JPG, WebP, or GIF).';
  }

  const seenTimestamps = new Set<number>();
  for (let i = 0; i < payload.chapters.length; i++) {
    const ch = payload.chapters[i];
    const hasAnyValue = ch.timestamp.trim() || ch.title.trim();
    if (!hasAnyValue) continue;

    const seconds = parseTimestampToSeconds(ch.timestamp);
    if (seconds === null) {
      errors.chapters = `Chapter ${i + 1} has an invalid timestamp. Use MM:SS (e.g., 01:20).`;
      break;
    }
    if (!ch.title.trim()) {
      errors.chapters = `Chapter ${i + 1} needs a title.`;
      break;
    }
    if (seenTimestamps.has(seconds)) {
      errors.chapters = `Duplicate chapter timestamp at ${ch.timestamp}.`;
      break;
    }
    seenTimestamps.add(seconds);
    parsedChapters.push({ timestampSeconds: seconds, title: ch.title.trim() });
  }

  parsedChapters.sort((a, b) => a.timestampSeconds - b.timestampSeconds);

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    parsedChapters,
  };
}

/**
 * Converts a category name or draft slug into a clean URL-safe slug (e.g., "Conflict Resolution" -> "conflict-resolution").
 */
export function slugifyCategory(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export interface CategoryValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  normalized: {
    name: string;
    slug: string;
    description: string;
  };
}

/**
 * Validates an Admin category create/edit payload.
 */
export function validateCategoryPayload(input: {
  name: string;
  slug?: string;
  description?: string;
}): CategoryValidationResult {
  const errors: Record<string, string> = {};
  const name = (input.name ?? '').trim();
  const slug = slugifyCategory(input.slug?.trim() ? input.slug : name);
  const description = (input.description ?? '').trim();

  if (name.length < 2 || name.length > 60) {
    errors.name = 'Category name must be between 2 and 60 characters.';
  }

  if (slug.length < 2 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.slug = 'Provide a valid URL slug using lowercase letters, numbers, and hyphens.';
  }

  if (description.length > 240) {
    errors.description = 'Description must be 240 characters or fewer.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalized: { name, slug, description },
  };
}

export interface SocialShareLinks {
  whatsapp: string;
  twitter: string;
  telegram: string;
  reddit: string;
  linkedin: string;
  email: string;
}

/**
 * Builds encoded external share links for WhatsApp, X, Telegram, Reddit, LinkedIn, and Email.
 */
export function buildShareLinks(params: {
  url: string;
  title: string;
}): SocialShareLinks {
  const safeUrl = params.url.trim();
  const safeTitle = params.title.trim();
  const encodedUrl = encodeURIComponent(safeUrl);
  const encodedTitle = encodeURIComponent(safeTitle);
  const combined = encodeURIComponent(`${safeTitle} — ${safeUrl}`);

  return {
    whatsapp: `https://wa.me/?text=${combined}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    reddit: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${combined}`,
  };
}

export interface WatchProgressSummary {
  /** Visual percentage 0..100 (minimum 3% when started, snaps to 100% at >=95%). */
  percent: number;
  hasProgress: boolean;
  isCompleted: boolean;
  clampedSeconds: number;
  remainingSeconds: number;
  statusLabel: string;
}

/**
 * Computes normalized watch progress metrics for thumbnail progress bars and accessible labels.
 */
export function computeWatchProgress(
  progressSeconds: number | undefined | null,
  durationSeconds: number
): WatchProgressSummary {
  const safeDuration =
    Number.isFinite(durationSeconds) && durationSeconds > 0
      ? Math.floor(durationSeconds)
      : 0;
  const rawProgress =
    typeof progressSeconds === 'number' && Number.isFinite(progressSeconds)
      ? Math.max(0, Math.floor(progressSeconds))
      : 0;

  if (safeDuration <= 0 || rawProgress <= 0) {
    return {
      percent: 0,
      hasProgress: false,
      isCompleted: false,
      clampedSeconds: 0,
      remainingSeconds: safeDuration,
      statusLabel: '',
    };
  }

  const clampedSeconds = Math.min(safeDuration, rawProgress);
  const rawPct = (clampedSeconds / safeDuration) * 100;
  const isCompleted = rawPct >= 95;
  const percent = isCompleted ? 100 : Math.max(3, Math.min(94, Math.round(rawPct)));
  const remainingSeconds = isCompleted ? 0 : Math.max(0, safeDuration - clampedSeconds);
  const statusLabel = isCompleted ? 'Watched' : `${percent}% watched`;

  return {
    percent,
    hasProgress: true,
    isCompleted,
    clampedSeconds,
    remainingSeconds,
    statusLabel,
  };
}


