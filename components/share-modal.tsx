'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  Mail,
  MessageCircle,
  Send,
  Share2,
  X,
} from 'lucide-react';
import { copyTextToClipboard } from '@/lib/api-client';
import { buildShareLinks } from '@/lib/video-utils';
import { ContentRatingBadge } from '@/components/content-rating-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ShareTarget {
  videoId: string;
  title: string;
  thumbnailUrl?: string;
  sourceUrl?: string;
}

interface ShareModalProps {
  target: ShareTarget | null;
  onClose: () => void;
}

const noopSubscribe = () => () => {};
const getWindowOrigin = () =>
  typeof window !== 'undefined' ? window.location.origin : '';
const getServerOrigin = () => '';

export function ShareModal({ target, onClose }: ShareModalProps) {
  const [copied, setCopied] = React.useState(false);
  const [nativeStatus, setNativeStatus] = React.useState<string | null>(null);
  const origin = React.useSyncExternalStore(
    noopSubscribe,
    getWindowOrigin,
    getServerOrigin
  );

  // Reset state when switching shared video without calling setState inside an effect
  const targetId = target?.videoId ?? null;
  const [prevTargetId, setPrevTargetId] = React.useState<string | null>(targetId);
  if (targetId !== prevTargetId) {
    setPrevTargetId(targetId);
    setCopied(false);
    setNativeStatus(null);
  }

  // Escape key dismiss
  React.useEffect(() => {
    if (!target) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [target, onClose]);

  const activeUrl = target
    ? `${origin || 'https://heylady.app'}/watch/${target.videoId}`
    : '';

  const shareLinks = target
    ? buildShareLinks({ url: activeUrl, title: target.title })
    : null;

  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCopy = async () => {
    if (!activeUrl) return;
    await copyTextToClipboard(activeUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  const handleNativeShare = async () => {
    if (!target || !canNativeShare) return;
    try {
      await navigator.share({
        title: target.title,
        text: target.title,
        url: activeUrl,
      });
      setNativeStatus('Shared!');
      window.setTimeout(() => setNativeStatus(null), 2000);
    } catch {
      // User dismissed native share sheet
    }
  };

  const socialChannels = shareLinks
    ? [
        {
          id: 'whatsapp',
          label: 'WhatsApp',
          href: shareLinks.whatsapp,
          icon: MessageCircle,
          accent: 'hover:border-emerald-500/60 hover:text-emerald-600 dark:hover:text-emerald-300',
        },
        {
          id: 'twitter',
          label: 'X / Twitter',
          href: shareLinks.twitter,
          icon: Share2,
          accent: 'hover:border-sky-500/60 hover:text-sky-600 dark:hover:text-sky-300',
        },
        {
          id: 'telegram',
          label: 'Telegram',
          href: shareLinks.telegram,
          icon: Send,
          accent: 'hover:border-cyan-500/60 hover:text-cyan-600 dark:hover:text-cyan-300',
        },
        {
          id: 'reddit',
          label: 'Reddit',
          href: shareLinks.reddit,
          icon: Globe,
          accent: 'hover:border-orange-500/60 hover:text-orange-600 dark:hover:text-orange-300',
        },
        {
          id: 'linkedin',
          label: 'LinkedIn',
          href: shareLinks.linkedin,
          icon: ExternalLink,
          accent: 'hover:border-blue-500/60 hover:text-blue-600 dark:hover:text-blue-300',
        },
        {
          id: 'email',
          label: 'Email',
          href: shareLinks.email,
          icon: Mail,
          accent: 'hover:border-rose-500/60 hover:text-rose-600 dark:hover:text-rose-300',
        },
      ]
    : [];

  return (
    <AnimatePresence>
      {target && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Close share dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/55 dark:bg-black/75 backdrop-blur-xs cursor-default"
          />

          {/* Dialog Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] p-5 sm:p-6 shadow-2xl text-zinc-900 dark:text-zinc-100"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="share-dialog-title"
                  className="font-display text-lg font-bold text-zinc-950 dark:text-white"
                >
                  Share Video
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Copy a link or share directly to your favorite platform.
                </p>
              </div>
              <motion.button
                type="button"
                onClick={onClose}
                whileHover={{ scale: 1.12, rotate: 90 }}
                whileTap={{ scale: 0.88, rotate: 180 }}
                transition={{ type: 'spring', stiffness: 420, damping: 20 }}
                aria-label="Close share modal"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </motion.button>
            </div>

            {/* Video Preview Pill */}
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#121215] p-2.5">
              {target.thumbnailUrl && (
                <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-900">
                  <img
                    src={target.thumbnailUrl}
                    alt={target.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                  <ContentRatingBadge
                    variant="micro"
                    className="absolute top-1 left-1"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-950 dark:text-white line-clamp-2 leading-snug">
                  {target.title}
                </p>
                <p className="mt-0.5 text-[0.6875rem] text-zinc-500 dark:text-zinc-400 truncate">
                  Official Hey Lady Watch Link
                </p>
              </div>
            </div>

            {/* Direct Copyable URL Box */}
            <div className="mt-4 flex items-center gap-2">
              <label htmlFor="share-link-input" className="sr-only">
                Shareable URL
              </label>
              <input
                id="share-link-input"
                type="text"
                readOnly
                value={activeUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="h-10 flex-1 min-w-0 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#0F0F11] px-3 font-mono text-xs text-zinc-800 dark:text-zinc-200 focus:border-rose-500 focus:outline-none"
              />
              <Button
                type="button"
                variant={copied ? 'sage' : 'primary'}
                size="sm"
                onClick={handleCopy}
                className="h-10 px-4 shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            {/* Social Share Channels Grid */}
            <div className="mt-5">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2.5">
                Share directly via
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {socialChannels.map((ch) => {
                  const Icon = ch.icon;
                  return (
                    <motion.a
                      key={ch.id}
                      href={ch.href}
                      target={ch.id === 'email' ? undefined : '_blank'}
                      rel={ch.id === 'email' ? undefined : 'noopener noreferrer'}
                      whileHover={{ y: -2, scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      className={cn(
                        'flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#121215] px-3 py-2.5 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors',
                        ch.accent
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{ch.label}</span>
                    </motion.a>
                  );
                })}
              </div>
            </div>

            {/* Native Device Share (Mobile / Supported Browsers) */}
            {canNativeShare && (
              <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="subtle"
                  size="sm"
                  onClick={handleNativeShare}
                  className="w-full"
                >
                  <Share2 className="h-4 w-4" />
                  {nativeStatus ?? 'More Share Options (Device Sheet)'}
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
