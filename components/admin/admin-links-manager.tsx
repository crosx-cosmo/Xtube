'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Clock,
  ExternalLink,
  Pencil,
  Plus,
  Search,
  Share2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type {
  UploadChapterInput,
  VideoChapter,
  VideoWithMeta,
} from '@/lib/types';
import type { ShareTarget } from '@/components/share-modal';
import {
  extractSourceHost,
  formatDuration,
  formatViews,
} from '@/lib/video-utils';
import { filterAdminVideos } from '@/lib/admin-studio-utils';
import { ContentRatingBadge } from '@/components/content-rating-badge';
import { cn } from '@/lib/utils';

type AdminVideoRow = VideoWithMeta & { chapters: VideoChapter[] };

interface AdminLinksManagerProps {
  videos: AdminVideoRow[];
  editingId: string | null;
  confirmDeleteId: string | null;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  thumbnailMeta: { name: string; sizeLabel: string } | null;
  thumbnailUploading: boolean;
  isDragOver: boolean;
  categoryName: string;
  educatorName: string;
  durationHours: number;
  durationMinutes: number;
  durationSecondsPart: number;
  totalDurationSeconds: number;
  description: string;
  reflectionPrompt: string;
  chapters: UploadChapterInput[];
  errors: Record<string, string>;
  saving: boolean;
  previewImgBroken: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  searchQuery: string;
  selectedCategorySlug: string;
  onSearchQueryChange: (value: string) => void;
  onClearCategoryFilter: () => void;
  onTitleChange: (value: string) => void;
  onVideoUrlChange: (value: string) => void;
  onCategoryNameChange: (value: string) => void;
  onEducatorNameChange: (value: string) => void;
  onDurationHoursChange: (value: number) => void;
  onDurationMinutesChange: (value: number) => void;
  onDurationSecondsChange: (value: number) => void;
  onDescriptionChange: (value: string) => void;
  onReflectionPromptChange: (value: string) => void;
  onDragOverChange: (over: boolean) => void;
  onThumbnailInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onThumbnailDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onClearThumbnail: () => void;
  onPreviewImgBroken: () => void;
  onAddChapter: () => void;
  onUpdateChapter: (idx: number, field: 'timestamp' | 'title', value: string) => void;
  onRemoveChapter: (idx: number) => void;
  onResetForm: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onStartEdit: (video: AdminVideoRow) => void;
  onShare: (target: ShareTarget) => void;
  onSetConfirmDeleteId: (id: string | null) => void;
  onDelete: (id: string) => void;
}

const INPUT_CLASS =
  'h-10 w-full rounded-xl border border-white/10 bg-[#0A0909] px-3.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500/70 focus:ring-2 focus:ring-orange-500/15 focus:outline-none transition-all';

export function AdminLinksManager({
  videos,
  editingId,
  confirmDeleteId,
  title,
  videoUrl,
  thumbnailUrl,
  thumbnailMeta,
  thumbnailUploading,
  isDragOver,
  categoryName,
  educatorName,
  durationHours,
  durationMinutes,
  durationSecondsPart,
  totalDurationSeconds,
  description,
  reflectionPrompt,
  chapters,
  errors,
  saving,
  previewImgBroken,
  fileInputRef,
  searchQuery,
  selectedCategorySlug,
  onSearchQueryChange,
  onClearCategoryFilter,
  onTitleChange,
  onVideoUrlChange,
  onCategoryNameChange,
  onEducatorNameChange,
  onDurationHoursChange,
  onDurationMinutesChange,
  onDurationSecondsChange,
  onDescriptionChange,
  onReflectionPromptChange,
  onDragOverChange,
  onThumbnailInputChange,
  onThumbnailDrop,
  onClearThumbnail,
  onPreviewImgBroken,
  onAddChapter,
  onUpdateChapter,
  onRemoveChapter,
  onResetForm,
  onSubmit,
  onStartEdit,
  onShare,
  onSetConfirmDeleteId,
  onDelete,
}: AdminLinksManagerProps) {
  const visibleVideos = React.useMemo(
    () =>
      filterAdminVideos(videos, {
        query: searchQuery,
        categorySlug: selectedCategorySlug,
      }),
    [videos, searchQuery, selectedCategorySlug]
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
      {/* Left: Add / Edit External Video Link Form */}
      <form
        onSubmit={onSubmit}
        data-testid="admin-video-link-form"
        className="xl:col-span-6 rounded-[1.5rem] border border-white/[0.08] bg-[#131111] p-5 sm:p-6 space-y-5"
      >
        <div className="flex items-center justify-between gap-2 pb-4 border-b border-white/[0.08]">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">
              {editingId ? 'Edit Saved Video Link' : 'Add New Video Link'}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Paste the external destination URL and upload a cover thumbnail from your device.
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={onResetForm}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.1] hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Cancel Edit
            </button>
          )}
        </div>

        {/* Original Source Video Link */}
        <div>
          <label
            htmlFor="admin-source-url"
            className="block text-xs font-medium text-zinc-300 mb-1.5"
          >
            Original Source Video Link (Redirect Destination)
          </label>
          <input
            id="admin-source-url"
            type="url"
            value={videoUrl}
            onChange={(e) => onVideoUrlChange(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=... or any external video URL"
            className={INPUT_CLASS}
          />
          {errors.videoUrl && (
            <p role="alert" className="mt-1.5 text-xs text-rose-400">
              {errors.videoUrl}
            </p>
          )}
        </div>

        {/* Device Thumbnail Upload Section */}
        <div>
          <label
            htmlFor="admin-thumbnail-file"
            className="block text-xs font-medium text-zinc-300 mb-1.5"
          >
            Thumbnail Image (Upload from Device)
          </label>

          <input
            ref={fileInputRef}
            id="admin-thumbnail-file"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={onThumbnailInputChange}
            className="sr-only"
          />

          {thumbnailUrl && !previewImgBroken ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                onDragOverChange(true);
              }}
              onDragLeave={() => onDragOverChange(false)}
              onDrop={onThumbnailDrop}
              className={cn(
                'rounded-2xl border p-3.5 transition-colors bg-[#0A0909]',
                isDragOver ? 'border-orange-500 bg-orange-500/10' : 'border-white/10'
              )}
            >
              <div className="flex flex-col sm:flex-row gap-3.5 items-start sm:items-center">
                <div className="relative w-full sm:w-44 aspect-video shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
                  <img
                    src={thumbnailUrl}
                    alt="Uploaded thumbnail preview"
                    referrerPolicy="no-referrer"
                    onError={onPreviewImgBroken}
                    className="h-full w-full object-cover"
                  />
                  <ContentRatingBadge
                    variant="micro"
                    className="absolute top-1.5 left-1.5"
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-2.5">
                  <div>
                    <p className="text-sm font-medium text-white truncate">
                      {thumbnailMeta?.name ?? 'Uploaded thumbnail'}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {thumbnailMeta?.sizeLabel ?? 'Ready to save'} · 16:9 cover image
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={thumbnailUploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.06] px-3 text-xs font-medium text-zinc-100 hover:bg-white/[0.12] transition-colors cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                      {thumbnailUploading ? 'Processing...' : 'Replace from Device'}
                    </button>
                    <button
                      type="button"
                      onClick={onClearThumbnail}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-zinc-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                onDragOverChange(true);
              }}
              onDragLeave={() => onDragOverChange(false)}
              onDrop={onThumbnailDrop}
              className={cn(
                'rounded-2xl border border-dashed p-6 text-center transition-colors',
                isDragOver
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-white/15 bg-[#0A0909] hover:border-white/25'
              )}
            >
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/25">
                <Upload className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="mt-3 text-sm font-medium text-zinc-100">
                {thumbnailUploading
                  ? 'Uploading to hey-lady bucket...'
                  : 'Drag and drop a thumbnail image here'}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                PNG, JPG, WebP, or GIF · Stored in hey-lady object storage (max 10 MB)
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  disabled={thumbnailUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.06] px-3.5 text-xs font-semibold text-white hover:bg-white/[0.12] transition-colors cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  Choose Image from Device
                </button>
              </div>
            </div>
          )}

          {errors.thumbnailUrl && (
            <p role="alert" className="mt-1.5 text-xs text-rose-400">
              {errors.thumbnailUrl}
            </p>
          )}
        </div>

        {/* Title & Topic Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="admin-title"
              className="block text-xs font-medium text-zinc-300 mb-1.5"
            >
              Video Title
            </label>
            <input
              id="admin-title"
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="e.g., Rebuilding Trust After Emotional Distance"
              className={INPUT_CLASS}
            />
            {errors.title && (
              <p role="alert" className="mt-1.5 text-xs text-rose-400">
                {errors.title}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="admin-category"
              className="block text-xs font-medium text-zinc-300 mb-1.5"
            >
              Topic Category
            </label>
            <input
              id="admin-category"
              type="text"
              value={categoryName}
              onChange={(e) => onCategoryNameChange(e.target.value)}
              placeholder="e.g., Attachment Theory or Mindful Dating"
              className={INPUT_CLASS}
            />
            <p className="mt-1 text-[0.6875rem] text-zinc-500">
              Type an existing or new category tag.
            </p>
            {errors.categoryId && (
              <p role="alert" className="mt-1.5 text-xs text-rose-400">
                {errors.categoryId}
              </p>
            )}
          </div>
        </div>

        {/* Educator Channel & Duration (H : M : S) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <div>
            <label
              htmlFor="admin-educator"
              className="block text-xs font-medium text-zinc-300 mb-1.5"
            >
              Educator Channel
            </label>
            <input
              id="admin-educator"
              type="text"
              value={educatorName}
              onChange={(e) => onEducatorNameChange(e.target.value)}
              placeholder="e.g., Dr. Clara Lindholm"
              className={INPUT_CLASS}
            />
            <p className="mt-1 text-[0.6875rem] text-zinc-500">
              Type any creator or educator channel name.
            </p>
            {errors.educatorName && (
              <p role="alert" className="mt-1.5 text-xs text-rose-400">
                {errors.educatorName}
              </p>
            )}
          </div>

          <fieldset>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <legend className="text-xs font-medium text-zinc-300">
                Duration (H : M : S)
              </legend>
              <span
                data-testid="duration-preview"
                className="inline-flex items-center gap-1 rounded-md bg-white/[0.07] px-2 py-0.5 font-mono text-[0.6875rem] font-medium text-orange-300 tabular-nums"
              >
                <Clock className="h-3 w-3" aria-hidden="true" />
                {formatDuration(totalDurationSeconds)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label
                  htmlFor="admin-duration-hours"
                  className="block text-[0.625rem] font-medium text-zinc-500 mb-1"
                >
                  Hours
                </label>
                <input
                  id="admin-duration-hours"
                  type="number"
                  min={0}
                  max={99}
                  value={durationHours}
                  onChange={(e) => {
                    const parsed = Number.parseInt(e.target.value || '0', 10);
                    onDurationHoursChange(
                      Number.isNaN(parsed) ? 0 : Math.min(99, Math.max(0, parsed))
                    );
                  }}
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#0A0909] px-2.5 font-mono text-sm text-zinc-100 focus:border-orange-500/70 focus:outline-none tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-duration-minutes"
                  className="block text-[0.625rem] font-medium text-zinc-500 mb-1"
                >
                  Minutes
                </label>
                <input
                  id="admin-duration-minutes"
                  type="number"
                  min={0}
                  max={59}
                  value={durationMinutes}
                  onChange={(e) => {
                    const parsed = Number.parseInt(e.target.value || '0', 10);
                    onDurationMinutesChange(
                      Number.isNaN(parsed) ? 0 : Math.min(59, Math.max(0, parsed))
                    );
                  }}
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#0A0909] px-2.5 font-mono text-sm text-zinc-100 focus:border-orange-500/70 focus:outline-none tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-duration-seconds"
                  className="block text-[0.625rem] font-medium text-zinc-500 mb-1"
                >
                  Seconds
                </label>
                <input
                  id="admin-duration-seconds"
                  type="number"
                  min={0}
                  max={59}
                  value={durationSecondsPart}
                  onChange={(e) => {
                    const parsed = Number.parseInt(e.target.value || '0', 10);
                    onDurationSecondsChange(
                      Number.isNaN(parsed) ? 0 : Math.min(59, Math.max(0, parsed))
                    );
                  }}
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#0A0909] px-2.5 font-mono text-sm text-zinc-100 focus:border-orange-500/70 focus:outline-none tabular-nums"
                />
              </div>
            </div>

            {errors.durationSeconds && (
              <p role="alert" className="mt-1.5 text-xs text-rose-400">
                {errors.durationSeconds}
              </p>
            )}
          </fieldset>
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="admin-description"
            className="block text-xs font-medium text-zinc-300 mb-1.5"
          >
            Description
          </label>
          <textarea
            id="admin-description"
            rows={3}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Summarize what viewers will learn when they watch this video..."
            className="w-full rounded-xl border border-white/10 bg-[#0A0909] px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500/70 focus:ring-2 focus:ring-orange-500/15 focus:outline-none resize-y"
          />
          {errors.description && (
            <p role="alert" className="mt-1.5 text-xs text-rose-400">
              {errors.description}
            </p>
          )}
        </div>

        {/* Reflection Prompt */}
        <div>
          <label
            htmlFor="admin-reflection"
            className="block text-xs font-medium text-zinc-300 mb-1.5"
          >
            Reflection Prompt (Shown Beneath Thumbnail Player)
          </label>
          <textarea
            id="admin-reflection"
            rows={2}
            value={reflectionPrompt}
            onChange={(e) => onReflectionPromptChange(e.target.value)}
            placeholder="Write a reflection question for viewers to discuss..."
            className="w-full rounded-xl border border-white/10 bg-[#0A0909] px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500/70 focus:ring-2 focus:ring-orange-500/15 focus:outline-none resize-y"
          />
          {errors.reflectionPrompt && (
            <p role="alert" className="mt-1.5 text-xs text-rose-400">
              {errors.reflectionPrompt}
            </p>
          )}
        </div>

        {/* Chapters Builder */}
        <div className="pt-3 border-t border-white/[0.08]">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-semibold text-zinc-300">
              Chapter Timestamps (MM:SS)
            </span>
            <button
              type="button"
              onClick={onAddChapter}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/12 bg-white/[0.05] px-2.5 text-xs font-medium text-zinc-200 hover:bg-white/[0.1] hover:text-white transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add Chapter
            </button>
          </div>
          <div className="space-y-2">
            {chapters.map((ch, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  aria-label={`Chapter ${idx + 1} timestamp`}
                  value={ch.timestamp}
                  onChange={(e) => onUpdateChapter(idx, 'timestamp', e.target.value)}
                  placeholder="01:20"
                  className="h-9 w-24 shrink-0 rounded-xl border border-white/10 bg-[#0A0909] px-2.5 font-mono text-xs text-zinc-100 focus:border-orange-500/70 focus:outline-none tabular-nums"
                />
                <input
                  type="text"
                  aria-label={`Chapter ${idx + 1} title`}
                  value={ch.title}
                  onChange={(e) => onUpdateChapter(idx, 'title', e.target.value)}
                  placeholder="Chapter title"
                  className="h-9 flex-1 min-w-0 rounded-xl border border-white/10 bg-[#0A0909] px-3 text-xs text-zinc-100 focus:border-orange-500/70 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => onRemoveChapter(idx)}
                  aria-label={`Remove chapter ${idx + 1}`}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-500 hover:bg-white/[0.06] hover:text-rose-400 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          {errors.chapters && (
            <p role="alert" className="mt-1.5 text-xs text-rose-400">
              {errors.chapters}
            </p>
          )}
        </div>

        {errors.form && (
          <p role="alert" className="text-xs text-rose-400">
            {errors.form}
          </p>
        )}

        <div className="pt-2 flex items-center justify-end gap-2">
          {editingId && (
            <button
              type="button"
              onClick={onResetForm}
              className="h-10 rounded-xl px-4 text-xs font-medium text-zinc-400 hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="h-10 rounded-xl bg-white px-5 text-xs font-semibold text-[#090808] hover:bg-zinc-100 active:scale-[0.98] disabled:opacity-60 transition-all cursor-pointer shadow-md shadow-black/30"
          >
            {saving
              ? 'Saving...'
              : editingId
              ? 'Update Saved Link'
              : 'Save Video Link'}
          </button>
        </div>
      </form>

      {/* Right: Saved Video Links Catalog */}
      <section
        aria-labelledby="saved-links-heading"
        className="xl:col-span-6 rounded-[1.5rem] border border-white/[0.08] bg-[#131111] overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-white/[0.08] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2
                id="saved-links-heading"
                className="font-display text-lg font-semibold text-white"
              >
                Saved Links ({visibleVideos.length})
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Edit destination URLs, swap thumbnails, share links, or remove entries.
              </p>
            </div>
            {selectedCategorySlug !== 'all' && (
              <button
                type="button"
                onClick={onClearCategoryFilter}
                className="inline-flex h-7 items-center gap-1 rounded-full bg-orange-500/15 border border-orange-500/30 px-2.5 text-[0.6875rem] font-medium text-orange-300 hover:bg-orange-500/25 cursor-pointer"
              >
                <span>Topic: {selectedCategorySlug}</span>
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500"
              aria-hidden="true"
            />
            <label htmlFor="admin-links-filter" className="sr-only">
              Filter saved video links
            </label>
            <input
              id="admin-links-filter"
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Filter by title, educator, category, or URL..."
              className="h-9 w-full rounded-xl border border-white/10 bg-[#0A0909] pl-8 pr-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500/70 focus:outline-none"
            />
          </div>
        </div>

        <div className="divide-y divide-white/[0.06] max-h-[51.25rem] overflow-y-auto">
          {visibleVideos.length === 0 ? (
            <div className="p-10 text-center text-sm text-zinc-400">
              No saved video links match your filter.
            </div>
          ) : (
            visibleVideos.map((video) => {
              const isEditingThis = editingId === video.id;
              const isConfirmingDelete = confirmDeleteId === video.id;

              return (
                <div
                  key={video.id}
                  className={cn(
                    'p-4 flex flex-col sm:flex-row gap-4 transition-colors',
                    isEditingThis
                      ? 'bg-orange-500/10'
                      : 'hover:bg-white/[0.03]'
                  )}
                >
                  <Link
                    href={`/watch/${video.id}`}
                    className="relative w-full sm:w-36 aspect-video shrink-0 overflow-hidden rounded-xl bg-zinc-900 border border-white/10 block"
                  >
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[0.625rem] text-white tabular-nums">
                      {formatDuration(video.durationSeconds)}
                    </span>
                  </Link>

                  <div className="min-w-0 flex-1 flex flex-col justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">
                        <Link
                          href={`/watch/${video.id}`}
                          className="hover:text-orange-300 transition-colors"
                        >
                          {video.title}
                        </Link>
                      </h3>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-400">
                        <span>{video.category.name}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatViews(video.views)} plays</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatViews(video.likes)} likes</span>
                      </div>

                      <a
                        href={video.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 truncate max-w-full"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">
                          {extractSourceHost(video.videoUrl)} — {video.videoUrl}
                        </span>
                      </a>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onStartEdit(video)}
                        className="inline-flex h-7 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 text-xs font-medium text-zinc-100 hover:bg-white/[0.12] transition-colors cursor-pointer"
                      >
                        <Pencil className="h-3 w-3" aria-hidden="true" />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onShare({
                            videoId: video.id,
                            title: video.title,
                            thumbnailUrl: video.thumbnailUrl,
                            sourceUrl: video.videoUrl,
                          })
                        }
                        className="inline-flex h-7 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 text-xs font-medium text-zinc-100 hover:bg-white/[0.12] transition-colors cursor-pointer"
                      >
                        <Share2 className="h-3 w-3" aria-hidden="true" />
                        Share
                      </button>

                      {!isConfirmingDelete ? (
                        <button
                          type="button"
                          onClick={() => onSetConfirmDeleteId(video.id)}
                          className="inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-zinc-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" aria-hidden="true" />
                          Delete
                        </button>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onDelete(video.id)}
                            className="inline-flex h-7 items-center rounded-lg bg-rose-600 px-2.5 text-xs font-semibold text-white hover:bg-rose-500 cursor-pointer"
                          >
                            Confirm Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => onSetConfirmDeleteId(null)}
                            className="inline-flex h-7 items-center rounded-lg px-2 text-xs text-zinc-400 hover:text-white cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
