'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import { ArrowBigUp, BadgeCheck, EyeOff, MessageSquare, Reply } from 'lucide-react';
import type { CommentItem, CommentNode } from '@/lib/types';
import { buildCommentTree, formatEditorialDate } from '@/lib/video-utils';
import { EducatorAvatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface DiscussionSectionProps {
  videoId: string;
  initialComments: CommentItem[];
  draftSeed?: string;
  onDraftSeedConsumed?: () => void;
}

export function DiscussionSection({
  videoId,
  initialComments,
  draftSeed,
  onDraftSeedConsumed,
}: DiscussionSectionProps) {
  const [comments, setComments] = React.useState<CommentItem[]>(initialComments);
  const [recentRootIds, setRecentRootIds] = React.useState<string[]>([]);
  const [content, setContent] = React.useState('');
  const [isAnonymous, setIsAnonymous] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [replyingToId, setReplyingToId] = React.useState<string | null>(null);
  const [replyContent, setReplyContent] = React.useState('');
  const [replyAnonymous, setReplyAnonymous] = React.useState(false);

  const [prevDraftSeed, setPrevDraftSeed] = React.useState<string | undefined>(draftSeed);
  const composerRef = React.useRef<HTMLTextAreaElement>(null);

  if (draftSeed && draftSeed !== prevDraftSeed) {
    setPrevDraftSeed(draftSeed);
    setContent(draftSeed);
  }

  React.useEffect(() => {
    if (draftSeed && draftSeed.trim()) {
      composerRef.current?.focus();
      onDraftSeedConsumed?.();
    }
  }, [draftSeed, onDraftSeedConsumed]);

  const tree = React.useMemo(() => {
    const built = buildCommentTree(comments);
    if (recentRootIds.length === 0) return built;
    const recentSet = new Set(recentRootIds);
    const pinned = built.filter((n) => recentSet.has(n.id));
    const rest = built.filter((n) => !recentSet.has(n.id));
    return [...pinned, ...rest];
  }, [comments, recentRootIds]);

  const handleSubmitRoot = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const trimmed = content.trim();
    if (!trimmed) {
      setErrorMsg('Write a reflection or question before posting.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/videos/${videoId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: trimmed,
          isAnonymous,
          parentId: null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not post your comment.');
        return;
      }
      setComments((prev) => [data.comment, ...prev]);
      setRecentRootIds((prev) => [data.comment.id, ...prev]);
      setContent('');
    } catch {
      setErrorMsg('Network error while posting comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    const trimmed = replyContent.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/videos/${videoId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: trimmed,
          isAnonymous: replyAnonymous,
          parentId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.comment) {
        setComments((prev) => [...prev, data.comment]);
        setReplyContent('');
        setReplyingToId(null);
        setReplyAnonymous(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (commentId: string) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        const nextUpvoted = !c.hasUpvoted;
        return {
          ...c,
          hasUpvoted: nextUpvoted,
          upvotes: Math.max(0, c.upvotes + (nextUpvoted ? 1 : -1)),
        };
      })
    );

    try {
      const res = await fetch(`/api/comments/${commentId}/upvote`, {
        method: 'POST',
      });
      if (res.ok) {
        const updated = await res.json();
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? { ...c, upvotes: updated.upvotes, hasUpvoted: updated.hasUpvoted }
              : c
          )
        );
      }
    } catch {
      // Keep optimistic state if offline
    }
  };

  return (
    <section
      aria-labelledby="discussion-heading"
      className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800"
    >
      <div className="flex items-center gap-2.5 mb-5">
        <MessageSquare className="h-5 w-5 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
        <h2
          id="discussion-heading"
          className="font-display text-xl font-semibold text-zinc-950 dark:text-white"
        >
          {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'} & Q&A
        </h2>
      </div>

      {/* Streaming Comment Composer */}
      <form
        onSubmit={handleSubmitRoot}
        className="rounded-xl bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5"
      >
        <label htmlFor="discussion-composer" className="sr-only">
          Add a comment or question
        </label>
        <textarea
          ref={composerRef}
          id="discussion-composer"
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment, reflection, or question..."
          className="w-full resize-y rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#111114] px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:border-rose-500 focus:bg-white dark:focus:bg-[#111114] focus:outline-none focus:ring-2 focus:ring-rose-500/20"
        />

        {errorMsg && (
          <p role="alert" className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
            {errorMsg}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Switch
              id="anonymous-post-toggle"
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
            />
            <label
              htmlFor="anonymous-post-toggle"
              className="flex items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer select-none"
            >
              <EyeOff className="h-4 w-4 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
              <span>Anonymous Post</span>
            </label>
          </div>

          <Button type="submit" variant="primary" size="sm" disabled={submitting}>
            {submitting ? 'Posting...' : isAnonymous ? 'Post Anonymously' : 'Comment'}
          </Button>
        </div>
      </form>

      {/* Comments List */}
      <div className="mt-6 space-y-5" data-testid="comments-list">
        {tree.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] p-8 text-center">
            <p className="font-display text-base text-zinc-900 dark:text-zinc-200">
              No comments yet.
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Be the first to share a thought or ask a question—openly or anonymously.
            </p>
          </div>
        ) : (
          tree.map((node) => (
            <CommentThreadItem
              key={node.id}
              node={node}
              depth={0}
              replyingToId={replyingToId}
              replyContent={replyContent}
              replyAnonymous={replyAnonymous}
              submitting={submitting}
              onStartReply={(id) => {
                setReplyingToId(replyingToId === id ? null : id);
                setReplyContent('');
              }}
              onChangeReplyContent={setReplyContent}
              onChangeReplyAnonymous={setReplyAnonymous}
              onSubmitReply={handleSubmitReply}
              onUpvote={handleUpvote}
            />
          ))
        )}
      </div>
    </section>
  );
}

interface CommentThreadItemProps {
  node: CommentNode;
  depth: number;
  replyingToId: string | null;
  replyContent: string;
  replyAnonymous: boolean;
  submitting: boolean;
  onStartReply: (id: string) => void;
  onChangeReplyContent: (val: string) => void;
  onChangeReplyAnonymous: (val: boolean) => void;
  onSubmitReply: (parentId: string) => void;
  onUpvote: (commentId: string) => void;
}

function CommentThreadItem({
  node,
  depth,
  replyingToId,
  replyContent,
  replyAnonymous,
  submitting,
  onStartReply,
  onChangeReplyContent,
  onChangeReplyAnonymous,
  onSubmitReply,
  onUpvote,
}: CommentThreadItemProps) {
  const displayName = node.isAnonymous ? 'Anonymous Learner' : node.author.name;
  const isReplyingHere = replyingToId === node.id;

  return (
    <div className={cn(depth > 0 && 'ml-7 sm:ml-11 pl-4 border-l border-zinc-200 dark:border-zinc-800')}>
      <article className="flex items-start gap-3">
        <EducatorAvatar
          name={displayName}
          src={node.isAnonymous ? null : node.author.avatarUrl}
          anonymous={node.isAnonymous}
          size="sm"
        />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{displayName}</span>
            {!node.isAnonymous && node.author.isEducator && (
              <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Educator
              </span>
            )}
            {node.isAnonymous && (
              <span className="text-zinc-500">· Identity hidden</span>
            )}
            <span aria-hidden="true" className="text-zinc-400 dark:text-zinc-600">
              ·
            </span>
            <span className="text-zinc-500 dark:text-zinc-400">{formatEditorialDate(node.createdAt)}</span>
          </div>

          <p className="mt-1.5 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
            {node.content}
          </p>

          <div className="mt-2.5 flex items-center gap-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => onUpvote(node.id)}
              aria-label={`Upvote comment by ${displayName}, currently ${node.upvotes} upvotes`}
              aria-pressed={Boolean(node.hasUpvoted)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium tabular-nums transition-colors cursor-pointer',
                node.hasUpvoted
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white'
              )}
            >
              <ArrowBigUp
                className={cn('h-4 w-4', node.hasUpvoted && 'fill-current')}
              />
              <span>{node.upvotes}</span>
            </motion.button>

            {depth < 2 && (
              <button
                type="button"
                onClick={() => onStartReply(node.id)}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
              >
                <Reply className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reply</span>
              </button>
            )}
          </div>

          {isReplyingHere && (
            <div className="mt-3 rounded-lg bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 p-3">
              <label htmlFor={`reply-input-${node.id}`} className="sr-only">
                Reply to {displayName}
              </label>
              <textarea
                id={`reply-input-${node.id}`}
                rows={2}
                value={replyContent}
                onChange={(e) => onChangeReplyContent(e.target.value)}
                placeholder={`Reply to ${displayName}...`}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#111114] px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:border-rose-500 focus:bg-white dark:focus:bg-[#111114] focus:outline-none"
              />
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id={`reply-anon-${node.id}`}
                    checked={replyAnonymous}
                    onCheckedChange={onChangeReplyAnonymous}
                  />
                  <label
                    htmlFor={`reply-anon-${node.id}`}
                    className="text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer"
                  >
                    Reply anonymously
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onStartReply(node.id)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={submitting || !replyContent.trim()}
                    onClick={() => onSubmitReply(node.id)}
                  >
                    Post Reply
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </article>

      {node.replies.length > 0 && (
        <div className="mt-4 space-y-4">
          {node.replies.map((reply) => (
            <CommentThreadItem
              key={reply.id}
              node={reply}
              depth={depth + 1}
              replyingToId={replyingToId}
              replyContent={replyContent}
              replyAnonymous={replyAnonymous}
              submitting={submitting}
              onStartReply={onStartReply}
              onChangeReplyContent={onChangeReplyContent}
              onChangeReplyAnonymous={onChangeReplyAnonymous}
              onSubmitReply={onSubmitReply}
              onUpvote={onUpvote}
            />
          ))}
        </div>
      )}
    </div>
  );
}
