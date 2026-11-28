'use client';

import * as React from 'react';
import {
  THEME_STORAGE_KEY,
  type ThemeMode,
  buildBoudoirVelvetTransitionSpec,
  getNextTheme,
  resolveInitialTheme,
} from '@/lib/theme-utils';

interface ThemeContextValue {
  theme: ThemeMode;
  mounted: boolean;
  setTheme: (next: ThemeMode, origin?: { x: number; y: number }) => void;
  toggleTheme: (origin?: { x: number; y: number }) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

const listeners = new Set<() => void>();

function notifyThemeListeners() {
  for (const listener of listeners) {
    listener();
  }
}

function applyThemeToDom(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isDark = theme === 'dark';
  root.classList.toggle('dark', isDark);
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

function readClientTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch {
    // Fall back to DOM class if localStorage is unavailable
  }
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function subscribeTheme(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  if (typeof window === 'undefined') {
    return () => {
      listeners.delete(onStoreChange);
    };
  }

  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY) {
      const next = resolveInitialTheme(e.newValue);
      applyThemeToDom(next);
      notifyThemeListeners();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener('storage', onStorage);
  };
}

function getServerThemeSnapshot(): ThemeMode {
  return 'light';
}

function subscribeMounted(): () => void {
  return () => {};
}

function getClientMounted(): boolean {
  return true;
}

function getServerMounted(): boolean {
  return false;
}

let activeStageEl: HTMLElement | null = null;
let activeStageTimer: number | null = null;
let activeCommitTimer: number | null = null;

/**
 * Locked 60FPS/120FPS GPU-Composited 18+ Boudoir Velvet Curtain & Neon Silk Pulse Choreography.
 * Animates ONLY `transform` and `opacity` on isolated compositor layers (zero `startViewTransition`
 * texture-capture freeze, zero `filter` blur lag, and 100% visible across all browsers).
 */
function runBoudoirVelvetTransition(
  x: number,
  y: number,
  next: ThemeMode,
  onCommitTheme: () => void
) {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    onCommitTheme();
    return;
  }

  // Clean up any in-flight stage immediately so rapid clicks never queue lag
  if (activeCommitTimer !== null) {
    window.clearTimeout(activeCommitTimer);
    activeCommitTimer = null;
  }
  if (activeStageTimer !== null) {
    window.clearTimeout(activeStageTimer);
    activeStageTimer = null;
  }
  if (activeStageEl) {
    activeStageEl.remove();
    activeStageEl = null;
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const spec = buildBoudoirVelvetTransitionSpec(next, x, y, vw, vh);
  const isToDark = next === 'dark';

  const stage = document.createElement('div');
  stage.setAttribute('aria-hidden', 'true');
  stage.setAttribute('data-testid', 'theme-prism-stage');
  stage.setAttribute('data-transition-mode', spec.mode);
  stage.style.position = 'fixed';
  stage.style.inset = '0';
  stage.style.pointerEvents = 'none';
  stage.style.zIndex = '2147483640';
  stage.style.overflow = 'hidden';
  stage.style.contain = 'strict';

  // Layer 1: Radial Boudoir Velvet & Rose-Gold Silk Dome expanding from (x, y)
  const diameter = Math.ceil(spec.endRadius * 2.25);
  const velvetDome = document.createElement('div');
  velvetDome.style.position = 'fixed';
  velvetDome.style.left = `${x}px`;
  velvetDome.style.top = `${y}px`;
  velvetDome.style.width = `${diameter}px`;
  velvetDome.style.height = `${diameter}px`;
  velvetDome.style.borderRadius = '9999px';
  velvetDome.style.background = spec.veilGradient;
  velvetDome.style.willChange = 'transform, opacity';
  velvetDome.style.transform = 'translate3d(-50%, -50%, 0) scale(0.03)';
  velvetDome.style.opacity = '0';
  stage.appendChild(velvetDome);

  velvetDome.animate(
    [
      { transform: 'translate3d(-50%, -50%, 0) scale(0.03)', opacity: 0.96 },
      {
        transform: 'translate3d(-50%, -50%, 0) scale(0.62)',
        opacity: 0.92,
        offset: 0.34,
      },
      { transform: 'translate3d(-50%, -50%, 0) scale(1.08)', opacity: 0 },
    ],
    {
      duration: spec.durationMs,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards',
    }
  );

  // Layer 2: Diagonal Satin Light-Ribbon Sweep across Viewport
  const silkRibbon = document.createElement('div');
  silkRibbon.style.position = 'absolute';
  silkRibbon.style.inset = '-40%';
  silkRibbon.style.background = spec.sweepRibbonGradient;
  silkRibbon.style.willChange = 'transform, opacity';
  silkRibbon.style.transform = 'translate3d(-36%, -36%, 0)';
  silkRibbon.style.opacity = '0';
  stage.appendChild(silkRibbon);

  silkRibbon.animate(
    [
      { transform: 'translate3d(-38%, -38%, 0)', opacity: 0 },
      { transform: 'translate3d(-4%, -4%, 0)', opacity: 0.95, offset: 0.35 },
      { transform: 'translate3d(38%, 38%, 0)', opacity: 0 },
    ],
    {
      duration: spec.durationMs,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards',
    }
  );

  // Layer 3: Dual Sensual Neon Halo Rings (Outer Circular Silk Ring + Inner Rotating Diamond Frame)
  const ringTargetScale = Math.max(12, (spec.endRadius * 1.85) / 28);
  const outerRing = document.createElement('div');
  outerRing.style.position = 'fixed';
  outerRing.style.left = `${x}px`;
  outerRing.style.top = `${y}px`;
  outerRing.style.width = '3.5rem';
  outerRing.style.height = '3.5rem';
  outerRing.style.borderRadius = '9999px';
  outerRing.style.border = spec.outerRingBorder;
  outerRing.style.boxShadow = spec.ringGlow;
  outerRing.style.willChange = 'transform, opacity';
  outerRing.style.transform = 'translate3d(-50%, -50%, 0) scale(0.2)';
  stage.appendChild(outerRing);

  outerRing.animate(
    [
      { transform: 'translate3d(-50%, -50%, 0) scale(0.22)', opacity: 0.98 },
      {
        transform: `translate3d(-50%, -50%, 0) scale(${(ringTargetScale * 0.48).toFixed(1)})`,
        opacity: 0.82,
        offset: 0.42,
      },
      {
        transform: `translate3d(-50%, -50%, 0) scale(${ringTargetScale.toFixed(1)})`,
        opacity: 0,
      },
    ],
    {
      duration: spec.durationMs,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards',
    }
  );

  const diamondFrame = document.createElement('div');
  diamondFrame.style.position = 'fixed';
  diamondFrame.style.left = `${x}px`;
  diamondFrame.style.top = `${y}px`;
  diamondFrame.style.width = '2.75rem';
  diamondFrame.style.height = '2.75rem';
  diamondFrame.style.borderRadius = '0.5rem';
  diamondFrame.style.border = spec.innerRingBorder;
  diamondFrame.style.willChange = 'transform, opacity';
  diamondFrame.style.transform = 'translate3d(-50%, -50%, 0) rotate(45deg) scale(0.2)';
  stage.appendChild(diamondFrame);

  diamondFrame.animate(
    [
      {
        transform: 'translate3d(-50%, -50%, 0) rotate(45deg) scale(0.25)',
        opacity: 0.94,
      },
      {
        transform: `translate3d(-50%, -50%, 0) rotate(135deg) scale(${(ringTargetScale * 0.72).toFixed(1)})`,
        opacity: 0,
      },
    ],
    {
      duration: spec.durationMs,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards',
    }
  );

  // Layer 4: Sensual 18+ Boudoir Neon Badge Crest floating at toggle origin
  const clampedBadgeX = Math.max(88, Math.min(vw - 88, x));
  const clampedBadgeY = Math.max(48, Math.min(vh - 48, y + 36));
  const crest = document.createElement('div');
  crest.style.position = 'fixed';
  crest.style.left = `${clampedBadgeX}px`;
  crest.style.top = `${clampedBadgeY}px`;
  crest.style.padding = '0.3rem 0.7rem';
  crest.style.borderRadius = '9999px';
  crest.style.fontFamily = 'var(--font-geist-mono), ui-monospace, monospace';
  crest.style.fontSize = '0.65rem';
  crest.style.fontWeight = '800';
  crest.style.letterSpacing = '0.12em';
  crest.style.whiteSpace = 'nowrap';
  crest.style.color = isToDark ? '#ffe4e6' : '#78350f';
  crest.style.background = isToDark
    ? 'linear-gradient(135deg, rgba(159,18,57,0.94), rgba(18,6,13,0.96))'
    : 'linear-gradient(135deg, rgba(254,243,199,0.96), rgba(255,228,230,0.96))';
  crest.style.border = isToDark
    ? '1px solid rgba(251,113,133,0.65)'
    : '1px solid rgba(251,191,36,0.75)';
  crest.style.boxShadow = isToDark
    ? '0 8px 24px rgba(225,29,72,0.45)'
    : '0 8px 24px rgba(245,158,11,0.35)';
  crest.style.willChange = 'transform, opacity';
  crest.style.transform = 'translate3d(-50%, -50%, 0) scale(0.75)';
  crest.textContent = isToDark ? `💋 ${spec.badgeText}` : `✨ ${spec.badgeText}`;
  stage.appendChild(crest);

  crest.animate(
    [
      { transform: 'translate3d(-50%, -30%, 0) scale(0.72)', opacity: 0 },
      {
        transform: 'translate3d(-50%, -50%, 0) scale(1)',
        opacity: 1,
        offset: 0.24,
      },
      {
        transform: 'translate3d(-50%, -62%, 0) scale(1)',
        opacity: 0.96,
        offset: 0.68,
      },
      { transform: 'translate3d(-50%, -85%, 0) scale(0.9)', opacity: 0 },
    ],
    {
      duration: spec.durationMs,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards',
    }
  );

  // Layer 5: 8 Rose-Gold & Crimson Ember Sparks
  for (const spark of spec.sparks) {
    const shard = document.createElement('div');
    shard.style.position = 'fixed';
    shard.style.left = `${x}px`;
    shard.style.top = `${y}px`;
    shard.style.width = '0.425rem';
    shard.style.height = '0.425rem';
    shard.style.borderRadius = '1.5px';
    shard.style.background = isToDark
      ? 'linear-gradient(135deg, #fb7185, #fbbf24)'
      : 'linear-gradient(135deg, #f59e0b, #f43f5e)';
    shard.style.willChange = 'transform, opacity';
    shard.style.transform = `translate3d(-50%, -50%, 0) rotate(${spark.angleDeg}deg) scale(0.2)`;
    stage.appendChild(shard);

    shard.animate(
      [
        {
          transform: `translate3d(-50%, -50%, 0) rotate(${spark.angleDeg}deg) scale(${spark.scale})`,
          opacity: 1,
        },
        {
          transform: `translate3d(calc(-50% + ${spark.dx}px), calc(-50% + ${spark.dy}px), 0) rotate(${spark.angleDeg + 90}deg) scale(0)`,
          opacity: 0,
        },
      ],
      {
        duration: 460,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards',
      }
    );
  }

  document.body.appendChild(stage);
  activeStageEl = stage;

  // Commit the theme at the exact crest of the velvet wave with per-node transitions frozen
  activeCommitTimer = window.setTimeout(() => {
    activeCommitTimer = null;
    const root = document.documentElement;
    root.dataset.themeSwitching = 'true';
    onCommitTheme();
    // Release transition freeze on the next frame after browser paints the new theme
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        delete root.dataset.themeSwitching;
      });
    });
  }, spec.themeCommitDelayMs);

  activeStageTimer = window.setTimeout(() => {
    activeStageTimer = null;
    if (activeStageEl === stage) {
      activeStageEl = null;
    }
    stage.remove();
  }, spec.durationMs + 40);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = React.useSyncExternalStore(
    subscribeTheme,
    readClientTheme,
    getServerThemeSnapshot
  );
  const mounted = React.useSyncExternalStore(
    subscribeMounted,
    getClientMounted,
    getServerMounted
  );

  // Keep DOM attributes synchronized whenever theme changes
  React.useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  const commitTheme = React.useCallback(
    (next: ThemeMode, origin?: { x: number; y: number }) => {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const persistAndApply = () => {
        try {
          window.localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch {
          // Ignore storage quota / private mode restrictions
        }
        applyThemeToDom(next);
        notifyThemeListeners();
      };

      if (prefersReducedMotion || typeof window === 'undefined') {
        persistAndApply();
        return;
      }

      const vw = window.innerWidth || 1440;
      const x = origin?.x ?? vw / 2;
      const y = origin?.y ?? 28;

      runBoudoirVelvetTransition(x, y, next, persistAndApply);
    },
    []
  );

  const toggleTheme = React.useCallback(
    (origin?: { x: number; y: number }) => {
      const next = getNextTheme(theme);
      commitTheme(next, origin);
    },
    [theme, commitTheme]
  );

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      mounted,
      setTheme: commitTheme,
      toggleTheme,
    }),
    [theme, mounted, commitTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
