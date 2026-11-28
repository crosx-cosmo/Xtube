'use client';

import * as React from 'react';
import {
  ArrowRight,
  EyeOff,
  Flame,
  Lock,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AGE_VERIFICATION_STORAGE_KEY,
  parseAgeVerificationRecord,
  serializeAgeVerificationRecord,
} from '@/lib/age-verification';
import {
  AdultStickerCluster,
  AdultStickerStamp,
} from '@/components/adult-stickers';
import { ParticleOrbCrest } from '@/components/brand-logo';

const ageStoreListeners = new Set<() => void>();
let inMemoryAgeVerified = false;

function notifyAgeStoreListeners() {
  for (const listener of ageStoreListeners) {
    listener();
  }
}

function subscribeAgeVerification(onStoreChange: () => void): () => void {
  ageStoreListeners.add(onStoreChange);
  if (typeof window === 'undefined') {
    return () => {
      ageStoreListeners.delete(onStoreChange);
    };
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === AGE_VERIFICATION_STORAGE_KEY) {
      notifyAgeStoreListeners();
    }
  };

  window.addEventListener('storage', handleStorage);
  return () => {
    ageStoreListeners.delete(onStoreChange);
    window.removeEventListener('storage', handleStorage);
  };
}

function getClientAgeVerifiedSnapshot(): boolean {
  if (inMemoryAgeVerified) {
    return true;
  }
  if (typeof window === 'undefined') {
    return true;
  }
  try {
    const raw = window.localStorage.getItem(AGE_VERIFICATION_STORAGE_KEY);
    return parseAgeVerificationRecord(raw);
  } catch {
    return inMemoryAgeVerified;
  }
}

function getServerAgeVerifiedSnapshot(): boolean {
  // Return true during SSR so search metadata renders cleanly; client hydration immediately checks localStorage.
  return true;
}

export interface AgeVerificationModalProps {
  /** Optional override for deterministic unit testing */
  forceOpen?: boolean;
  onVerified?: () => void;
}

/**
 * Initial-load 18+ Age Verification Overlay Modal with full-viewport backdrop
 * blur and a prominent "I am 18+" confirmation button to comply with adult
 * website safety guidelines.
 */
export function AgeVerificationModal({
  forceOpen = false,
  onVerified,
}: AgeVerificationModalProps) {
  const isVerified = React.useSyncExternalStore(
    subscribeAgeVerification,
    getClientAgeVerifiedSnapshot,
    getServerAgeVerifiedSnapshot
  );
  const [underageRestricted, setUnderageRestricted] = React.useState(false);

  const isOpen = forceOpen || !isVerified;

  React.useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleConfirmAdult = React.useCallback(() => {
    inMemoryAgeVerified = true;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(
          AGE_VERIFICATION_STORAGE_KEY,
          serializeAgeVerificationRecord()
        );
      } catch {
        // Ignore storage quota / private browsing errors; inMemoryAgeVerified keeps session unlocked
      }
    }
    notifyAgeStoreListeners();
    onVerified?.();
  }, [onVerified]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="age-verification-modal-title"
          aria-describedby="age-verification-modal-description"
          data-testid="age-verification-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[110] flex min-h-dvh w-full items-center justify-center overflow-y-auto bg-black/75 dark:bg-[#050408]/82 backdrop-blur-2xl px-4 py-8 sm:p-6"
        >
          {/* Semi-Transparent Atmospheric Background Aura with Blur Shield */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[url('/api/thumbnails/bg-images/1000294410.jpg')] bg-cover bg-center bg-no-repeat opacity-25 mix-blend-luminosity"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_60%_at_50%_35%,rgba(225,29,72,0.24),rgba(245,158,11,0.12)_48%,rgba(5,4,8,0.88)_85%)]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{
              type: 'spring',
              stiffness: 380,
              damping: 28,
              mass: 0.8,
            }}
            className="relative z-10 w-full max-w-[33rem] overflow-hidden rounded-3xl border border-rose-500/40 bg-[#110D14]/88 p-6 sm:p-8 text-zinc-100 shadow-[0_28px_90px_rgba(0,0,0,0.85),0_0_2.5rem_rgba(225,29,72,0.22)] backdrop-blur-xl"
          >
            {/* Top Crimson & Champagne-Gold Safety Accent Bar */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-rose-600 via-amber-400 to-rose-600"
            />

            {/* Header Row: 3D Twin-Bust Emblem + Hey Lady Brand + 18+ Stamp */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ParticleOrbCrest variant="modal" />
                <div>
                  <p className="font-display text-lg font-extrabold tracking-tight text-white leading-none">
                    Hey{' '}
                    <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
                      Lady
                    </span>
                  </p>
                  <p className="mt-1 font-mono text-[0.6875rem] font-semibold uppercase tracking-widest text-rose-300/90">
                    18+ Adult Safety Gate
                  </p>
                </div>
              </div>

              <AdultStickerStamp
                kind="18-plus"
                size="sm"
                tilted
                interactive={false}
              />
            </div>

            {underageRestricted ? (
              <div
                data-testid="age-verification-restricted-view"
                className="mt-6 rounded-2xl border border-rose-500/35 bg-rose-950/35 p-5 text-center"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-rose-500/45 bg-rose-500/15 text-rose-400">
                  <EyeOff className="h-6 w-6" aria-hidden="true" />
                </div>
                <h2
                  id="age-verification-modal-title"
                  className="mt-4 font-display text-xl sm:text-2xl font-bold text-white"
                >
                  Access Restricted (18+ Only)
                </h2>
                <p
                  id="age-verification-modal-description"
                  className="mt-2 text-xs sm:text-sm leading-relaxed text-zinc-300"
                >
                  You must be at least 18 years of age (or the legal age of
                  majority in your jurisdiction) to enter Hey Lady. All adult
                  media remains blurred and locked for your safety.
                </p>
                <div className="mt-5 flex justify-center">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setUnderageRestricted(false)}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/15 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Return to Age Verification</span>
                  </motion.button>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-6">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-500/10 px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-amber-300">
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-rose-400" aria-hidden="true" />
                    <span>Adult Website Safety Compliance</span>
                  </div>

                  <h2
                    id="age-verification-modal-title"
                    className="mt-3.5 font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white"
                  >
                    Age Verification Required
                  </h2>

                  <p
                    id="age-verification-modal-description"
                    className="mt-2.5 text-xs sm:text-sm leading-relaxed text-zinc-200/95"
                  >
                    This website contains age-restricted{' '}
                    <strong className="font-semibold text-white">
                      18+ explicit adult material
                    </strong>
                    . By clicking{' '}
                    <strong className="font-semibold text-amber-300">
                      &ldquo;I am 18+&rdquo;
                    </strong>{' '}
                    below, you affirm under penalty of perjury that you are at
                    least{' '}
                    <strong className="font-semibold text-white">
                      18 years old
                    </strong>{' '}
                    (or the age of legal majority in your community) and consent
                    to viewing sexually explicit adult content.
                  </p>
                </div>

                {/* 18+ Stickers & Safety Symbols Strip */}
                <AdultStickerCluster
                  variant="gate"
                  className="mt-5 justify-start"
                />

                {/* Primary "I am 18+" Confirmation Button + Exit Option */}
                <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <motion.button
                    type="button"
                    data-testid="age-verification-confirm-btn"
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 440, damping: 22 }}
                    onClick={handleConfirmAdult}
                    className="group relative flex-1 inline-flex items-center justify-center gap-2.5 rounded-2xl border border-rose-400/60 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 px-6 py-3.5 text-sm sm:text-base font-display font-extrabold tracking-wide text-white shadow-[0_12px_32px_rgba(225,29,72,0.42)] hover:shadow-[0_14px_38px_rgba(225,29,72,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 cursor-pointer"
                  >
                    <Flame className="h-4 w-4 fill-current shrink-0" aria-hidden="true" />
                    <span>I am 18+</span>
                    <ArrowRight
                      className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </motion.button>

                  <motion.button
                    type="button"
                    data-testid="age-verification-exit-btn"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                    onClick={() => setUnderageRestricted(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3.5 text-xs sm:text-sm font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  >
                    <span>Under 18 — Exit</span>
                  </motion.button>
                </div>

                {/* Footer Safety Metadata: RTA + Discreet Session */}
                <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[0.6875rem] text-zinc-400">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck
                      className="h-3.5 w-3.5 text-amber-400 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="font-mono">RTA-5042-1996-1400-1577-RTA</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Lock
                      className="h-3.5 w-3.5 text-rose-400 shrink-0"
                      aria-hidden="true"
                    />
                    <span>Encrypted Private Session</span>
                  </span>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
