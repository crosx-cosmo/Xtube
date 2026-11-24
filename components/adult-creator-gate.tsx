'use client';

import * as React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Crown,
  Flame,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
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
          className="fixed inset-0 z-[100] flex min-h-dvh w-full items-center justify-center bg-zinc-950/92 dark:bg-[#09090B]/96 backdrop-blur-xl px-4 py-8 sm:p-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-amber-500/30 dark:border-amber-400/25 bg-white dark:bg-[#121015] p-7 sm:p-9 shadow-2xl"
          >
            {/* Subtle top luxury champagne-gold & rose accent bar */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500"
            />

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ParticleOrbCrest variant="modal" />
                <div>
                  <p className="font-display text-base font-bold tracking-tight text-zinc-950 dark:text-white leading-none">
                    Hey{' '}
                    <span className="bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 dark:from-amber-300 dark:via-yellow-200 dark:to-amber-400 bg-clip-text text-transparent">
                      Lady
                    </span>
                  </p>
                  <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Adult Creator Studio
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                <Flame className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>18+ Only</span>
              </span>
            </div>

            <h2
              id="adult-creator-gate-title"
              className="mt-6 font-display text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-white"
            >
              Are You 18+?
            </h2>

            <p
              id="adult-creator-gate-description"
              className="mt-3 text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300"
            >
              The Hey Lady Adult Creator Portal is restricted strictly to verified adults aged{' '}
              <strong className="font-semibold text-zinc-950 dark:text-white">
                18 years or older
              </strong>
              . By selecting Yes, you confirm that you meet the legal age requirement to access creator studio monetization and sign in.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-hidden="true" />
                <span>RTA Verified</span>
              </span>
              <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">·</span>
              <span className="inline-flex items-center gap-1">
                <Lock className="h-3.5 w-3.5 text-rose-500 shrink-0" aria-hidden="true" />
                <span>Discreet Access</span>
              </span>
              <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">·</span>
              <span className="inline-flex items-center gap-1">
                <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-hidden="true" />
                <span>VIP Monetization</span>
              </span>
            </div>

            <div className="mt-7 pt-6 border-t border-zinc-200 dark:border-zinc-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="md"
                data-testid="age-gate-no-btn"
                onClick={onDecline}
                className="w-full sm:w-auto"
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
                className="w-full sm:w-auto"
              >
                <span>Yes, I&apos;m 18+</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
