'use client';

import * as React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Crown,
  Flame,
  Lock,
  ShieldCheck,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { AdultStickerCluster } from '@/components/adult-stickers';
import { ParticleOrbCrest } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';

interface AdultCreatorGateProps {
  open: boolean;
  onConfirm: () => void;
  onDecline: () => void;
}

export function AdultCreatorGate({
  open,
  onConfirm,
  onDecline,
}: AdultCreatorGateProps) {
  React.useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDecline();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onDecline]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="adult-creator-gate-title"
          aria-describedby="adult-creator-gate-description"
          data-testid="adult-creator-age-gate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] flex min-h-dvh w-full items-center justify-center overflow-hidden bg-[#070609] px-4 py-8 sm:p-6"
        >
          {/* Full-Bleed Semi-Transparent Bucket Background Image (hey-lady/bg-images/1000294410.jpg) */}
          <div
            aria-hidden="true"
            data-testid="age-gate-backdrop-bg-image"
            className="pointer-events-none absolute inset-0 bg-[url('/api/thumbnails/bg-images/1000294410.jpg')] bg-cover bg-center bg-no-repeat opacity-50"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_35%,rgba(225,29,72,0.20),rgba(245,158,11,0.12)_45%,rgba(7,6,9,0.82)_82%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-[#09080C]/58 to-black/80"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-amber-500/35 dark:border-amber-400/30 bg-[#121015]/72 p-7 sm:p-9 shadow-[0_28px_80px_rgba(0,0,0,0.78)]"
          >
            {/* Subtle top luxury champagne-gold & rose accent bar */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 z-10 h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500"
            />

            <div className="relative z-10">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ParticleOrbCrest variant="modal" />
                  <div>
                    <p className="font-display text-base font-bold tracking-tight text-white leading-none">
                      Hey{' '}
                      <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
                        Lady
                      </span>
                    </p>
                    <p className="mt-1 text-xs font-medium text-zinc-300/90">
                      Adult Creator Studio
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-rose-400">
                    <Flame className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>18+ Only</span>
                  </span>
                  <motion.button
                    type="button"
                    onClick={onDecline}
                    whileHover={{ scale: 1.12, rotate: 90 }}
                    whileTap={{ scale: 0.88, rotate: 180 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 20 }}
                    aria-label="Close age verification gate"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </motion.button>
                </div>
              </div>

              <h2
                id="adult-creator-gate-title"
                className="mt-6 font-display text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-xs"
              >
                Are You 18+?
              </h2>

              <p
                id="adult-creator-gate-description"
                className="mt-3 text-sm sm:text-base leading-relaxed text-zinc-200/95"
              >
                The Hey Lady Adult Creator Portal is restricted strictly to verified adults aged{' '}
                <strong className="font-semibold text-white">
                  18 years or older
                </strong>
                . By selecting Yes, you confirm that you meet the legal age requirement to access creator studio monetization and sign in.
              </p>

              <AdultStickerCluster
                variant="gate"
                className="mt-4 justify-start"
              />

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-300">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                  <span>RTA Verified</span>
                </span>
                <span aria-hidden="true" className="text-zinc-600">·</span>
                <span className="inline-flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5 text-rose-400 shrink-0" aria-hidden="true" />
                  <span>Discreet Access</span>
                </span>
                <span aria-hidden="true" className="text-zinc-600">·</span>
                <span className="inline-flex items-center gap-1">
                  <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                  <span>VIP Monetization</span>
                </span>
              </div>

              <div className="mt-7 pt-6 border-t border-white/12 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  data-testid="age-gate-no-btn"
                  onClick={onDecline}
                  className="w-full sm:w-auto border-white/15 bg-black/45 text-zinc-100 hover:bg-white/10 hover:text-white backdrop-blur-sm"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  <span>No, Go Back</span>
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  data-testid="age-gate-yes-btn"
                  onClick={onConfirm}
                  className="w-full sm:w-auto shadow-lg shadow-rose-600/30"
                >
                  <span>Yes, I&apos;m 18+</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
