'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowBigUp,
  BadgeCheck,
  ExternalLink,
  EyeOff,
  MessageSquare,
  Pencil,
  RefreshCw,
  Reply,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import type { AdminCommentItem, CategoryWithCount } from '@/lib/types';
import { formatEditorialDate, slugifyCategory } from '@/lib/video-utils';
import { cn } from '@/lib/utils';

interface AdminCategoriesManagerProps {
  categories: CategoryWithCount[];
  editingCategoryId: string | null;
  confirmDeleteCatId: string | null;
  catName: string;
  catSlug: string;
  catSlugTouched: boolean;
  catDescription: string;
  catErrors: Record<string, string>;
  catSaving: boolean;
  catDeleteError: string | null;
  onCatNameChange: (name: string) => void;
  onCatSlugChange: (slug: string) => void;
  onCatDescriptionChange: (description: string) => void;
  onResetCategoryForm: () => void;
  onCategorySubmit: (e: React.FormEvent) => void;
  onStartEditCategory: (cat: CategoryWithCount) => void;
  onRequestDeleteCategory: (id: string | null) => void;
  onConfirmDeleteCategory: (id: string) => void;
}

const INPUT_CLASS =
  'h-10 w-full rounded-xl border border-white/10 bg-[#0A0909] px-3.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500/70 focus:ring-2 focus:ring-orange-500/15 focus:outline-none transition-all';

export function AdminCategoriesManager({
  categories,
  editingCategoryId,
  confirmDeleteCatId,
  catName,
  catSlug,
  catSlugTouched,
  catDescription,
  catErrors,
  catSaving,
  catDeleteError,
  onCatNameChange,
  onCatSlugChange,
  onCatDescriptionChange,
  onResetCategoryForm,
  onCategorySubmit,
  onStartEditCategory,
  onRequestDeleteCategory,
  onConfirmDeleteCategory,
}: AdminCategoriesManagerProps) {
  return (
    <div
      id="admin-categories-section"
      className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start"
    >
      {/* Left: Add / Edit Category Tag Form */}
      <form
        onSubmit={onCategorySubmit}
        className="xl:col-span-5 rounded-[1.5rem] border border-white/[0.08] bg-[#131111] p-5 sm:p-6 space-y-5"
      >
        <div className="flex items-center justify-between gap-2 pb-4 border-b border-white/[0.08]">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">
              {editingCategoryId ? 'Edit Category Tag' : 'Add New Category Tag'}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Category tags appear in the homepage filter bar and navigation sidebar.
            </p>
          </div>
          {editingCategoryId && (
            <button
              type="button"
              onClick={onResetCategoryForm}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.1] hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Cancel
            </button>
          )}
        </div>

        <div>
          <label
            htmlFor="admin-cat-name"
            className="block text-xs font-medium text-zinc-300 mb-1.5"
          >
            Category Name
          </label>
          <input
            id="admin-cat-name"
            type="text"
            value={catName}
            onChange={(e) => {
              const next = e.target.value;
              onCatNameChange(next);
              if (!catSlugTouched) {
                onCatSlugChange(slugifyCategory(next));
              }
            }}
            placeholder="e.g., Mindful Communication"
            className={INPUT_CLASS}
          />
          {catErrors.name && (
            <p role="alert" className="mt-1.5 text-xs text-rose-400">
              {catErrors.name}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="admin-cat-slug"
            className="block text-xs font-medium text-zinc-300 mb-1.5"
          >
            URL Slug
          </label>
          <input
            id="admin-cat-slug"
            type="text"
            value={catSlug}
            onChange={(e) => onCatSlugChange(e.target.value)}
            placeholder="mindful-communication"
            className="h-10 w-full rounded-xl border border-white/10 bg-[#0A0909] px-3.5 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500/70 focus:outline-none"
          />
          <p className="mt-1 text-[0.6875rem] text-zinc-500 font-mono truncate">
            Homepage filter URL: /?category={slugifyCategory(catSlug || catName) || 'your-slug'}
          </p>
          {catErrors.slug && (
            <p role="alert" className="mt-1.5 text-xs text-rose-400">
              {catErrors.slug}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="admin-cat-description"
            className="block text-xs font-medium text-zinc-300 mb-1.5"
          >
            Short Description (Optional)
          </label>
          <textarea
            id="admin-cat-description"
            rows={3}
            value={catDescription}
            onChange={(e) => onCatDescriptionChange(e.target.value)}
            placeholder="Briefly describe what videos belong under this topic..."
            className="w-full rounded-xl border border-white/10 bg-[#0A0909] px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500/70 focus:outline-none resize-y"
          />
          {catErrors.description && (
            <p role="alert" className="mt-1.5 text-xs text-rose-400">
              {catErrors.description}
            </p>
          )}
        </div>

        {catErrors.form && (
          <p role="alert" className="text-xs text-rose-400">
            {catErrors.form}
          </p>
        )}

        <div className="pt-2 flex items-center justify-end gap-2">
          {editingCategoryId && (
            <button
              type="button"
              onClick={onResetCategoryForm}
              className="h-10 rounded-xl px-4 text-xs font-medium text-zinc-400 hover:bg-white/[0.06] hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={catSaving}
            className="h-10 rounded-xl bg-white px-5 text-xs font-semibold text-[#090808] hover:bg-zinc-100 active:scale-[0.98] disabled:opacity-60 transition-all cursor-pointer"
          >
            {catSaving
              ? 'Saving...'
              : editingCategoryId
              ? 'Update Category'
              : 'Add Category'}
          </button>
        </div>
      </form>

      {/* Right: Live Homepage Category Tags List */}
      <section
        aria-labelledby="categories-list-heading"
        className="xl:col-span-7 rounded-[1.5rem] border border-white/[0.08] bg-[#131111] overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-white/[0.08]">
          <h2
            id="categories-list-heading"
            className="font-display text-lg font-semibold text-white"
          >
            Homepage Category Tags ({categories.length})
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Changes sync immediately to the public topic bar and navigation sidebar.
          </p>
        </div>

        {catDeleteError && (
          <div
            role="alert"
            className="mx-5 mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300"
          >
            {catDeleteError}
          </div>
        )}

        <div className="divide-y divide-white/[0.06]">
          {categories.map((cat) => {
            const isEditingThis = editingCategoryId === cat.id;
            const isConfirmingDelete = confirmDeleteCatId === cat.id;

            return (
              <div
                key={cat.id}
                className={cn(
                  'p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors',
                  isEditingThis ? 'bg-orange-500/10' : 'hover:bg-white/[0.03]'
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.07] px-2.5 py-1 text-xs font-semibold text-white">
                      <Tag className="h-3 w-3 text-orange-400" aria-hidden="true" />
                      {cat.name}
                    </span>
                    <Link
                      href={`/?category=${cat.slug}`}
                      className="font-mono text-[0.6875rem] text-zinc-400 hover:text-orange-300 transition-colors"
                    >
                      /?category={cat.slug}
                    </Link>
                    <span className="text-xs text-zinc-500 tabular-nums">
                      · {cat.videoCount} {cat.videoCount === 1 ? 'video' : 'videos'}
                    </span>
                  </div>
                  {cat.description && (
                    <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed line-clamp-2">
                      {cat.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onStartEditCategory(cat)}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 text-xs font-medium text-zinc-100 hover:bg-white/[0.12] transition-colors cursor-pointer"
                  >
                    <Pencil className="h-3 w-3" aria-hidden="true" />
                    Edit
                  </button>

                  {!isConfirmingDelete ? (
                    <button
                      type="button"
                      onClick={() => onRequestDeleteCategory(cat.id)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-zinc-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                      Delete
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onConfirmDeleteCategory(cat.id)}
                        className="inline-flex h-8 items-center rounded-lg bg-rose-600 px-2.5 text-xs font-semibold text-white hover:bg-rose-500 cursor-pointer"
                      >
                        Confirm Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => onRequestDeleteCategory(null)}
                        className="inline-flex h-8 items-center rounded-lg px-2 text-xs text-zinc-400 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

interface AdminCommentsManagerProps {
  comments: AdminCommentItem[];
  filteredComments: AdminCommentItem[];
  commentSearch: string;
  commentsLoading: boolean;
  confirmDeleteCommentId: string | null;
  onCommentSearchChange: (value: string) => void;
  onRefreshComments: () => void;
  onRequestDeleteComment: (id: string | null) => void;
  onConfirmDeleteComment: (id: string) => void;
}

export function AdminCommentsManager({
  comments,
  filteredComments,
  commentSearch,
  commentsLoading,
  confirmDeleteCommentId,
  onCommentSearchChange,
  onRefreshComments,
  onRequestDeleteComment,
  onConfirmDeleteComment,
}: AdminCommentsManagerProps) {
  return (
    <section
      id="admin-comments-section"
      aria-labelledby="admin-comments-heading"
      className="rounded-[1.5rem] border border-white/[0.08] bg-[#131111] overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2
            id="admin-comments-heading"
            className="font-display text-lg font-semibold text-white"
          >
            User Comments ({filteredComments.length}
            {commentSearch.trim() ? ` of ${comments.length}` : ''})
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Review and moderate viewer reflections, questions, and replies across your videos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500"
              aria-hidden="true"
            />
            <label htmlFor="admin-comments-search" className="sr-only">
              Search user comments
            </label>
            <input
              id="admin-comments-search"
              type="search"
              value={commentSearch}
              onChange={(e) => onCommentSearchChange(e.target.value)}
              placeholder="Filter comments or video..."
              className="h-9 w-full rounded-xl border border-white/10 bg-[#0A0909] pl-8 pr-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500/70 focus:outline-none"
            />
          </div>

          <button
            type="button"
            disabled={commentsLoading}
            onClick={onRefreshComments}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-xs font-medium text-zinc-100 hover:bg-white/[0.12] disabled:opacity-60 transition-colors cursor-pointer"
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', commentsLoading && 'animate-spin')}
              aria-hidden="true"
            />
            <span>{commentsLoading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {commentsLoading && comments.length === 0 ? (
        <div className="p-10 text-center text-sm text-zinc-400">
          Loading user comments...
        </div>
      ) : filteredComments.length === 0 ? (
        <div className="p-10 text-center">
          <MessageSquare
            className="mx-auto h-7 w-7 text-zinc-600"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm font-medium text-zinc-200">
            {commentSearch.trim()
              ? 'No comments match your filter.'
              : 'No user comments yet.'}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Viewer comments posted on watch pages will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.06]" data-testid="admin-comments-list">
          {filteredComments.map((comment) => {
            const displayName = comment.isAnonymous
              ? 'Anonymous Learner'
              : comment.author.name;
            const isConfirming = confirmDeleteCommentId === comment.id;

            return (
              <article
                key={comment.id}
                className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-white/[0.03] transition-colors"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <span className="font-semibold text-white">{displayName}</span>
                    {comment.isAnonymous && (
                      <span className="inline-flex items-center gap-1 rounded bg-white/[0.08] px-1.5 py-0.5 text-[0.6875rem] text-zinc-300">
                        <EyeOff className="h-3 w-3" aria-hidden="true" />
                        Anonymous
                      </span>
                    )}
                    {!comment.isAnonymous && comment.author.isEducator && (
                      <span className="inline-flex items-center gap-1 text-orange-400 font-medium">
                        <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        Educator
                      </span>
                    )}
                    {comment.parentId && (
                      <span className="inline-flex items-center gap-1 rounded bg-orange-500/15 px-1.5 py-0.5 text-[0.6875rem] font-medium text-orange-300">
                        <Reply className="h-3 w-3" aria-hidden="true" />
                        Reply
                      </span>
                    )}
                    <span aria-hidden="true" className="text-zinc-600">
                      ·
                    </span>
                    <span className="text-zinc-400">
                      {formatEditorialDate(comment.createdAt)}
                    </span>
                    <span aria-hidden="true" className="text-zinc-600">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1 text-zinc-400 tabular-nums">
                      <ArrowBigUp className="h-3.5 w-3.5" aria-hidden="true" />
                      {comment.upvotes}
                    </span>
                  </div>

                  <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                    {comment.content}
                  </p>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-500">On video:</span>
                    <Link
                      href={`/watch/${comment.videoId}`}
                      className="font-medium text-orange-400 hover:underline truncate max-w-md"
                    >
                      {comment.videoTitle}
                    </Link>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/watch/${comment.videoId}`}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 text-xs font-medium text-zinc-100 hover:bg-white/[0.12] transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    View
                  </Link>

                  {!isConfirming ? (
                    <button
                      type="button"
                      aria-label={`Delete comment by ${displayName}`}
                      onClick={() => onRequestDeleteComment(comment.id)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-zinc-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                      Delete
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onConfirmDeleteComment(comment.id)}
                        className="inline-flex h-8 items-center rounded-lg bg-rose-600 px-2.5 text-xs font-semibold text-white hover:bg-rose-500 cursor-pointer"
                      >
                        Confirm Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => onRequestDeleteComment(null)}
                        className="inline-flex h-8 items-center rounded-lg px-2 text-xs text-zinc-400 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
