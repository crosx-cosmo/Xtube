'use client';

import * as React from 'react';
import { flushSync } from 'react-dom';
import {
  THEME_STORAGE_KEY,
  type ThemeMode,
  computeRippleRadius,
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

interface ViewTransitionLike {
  ready: Promise<void>;
  finished: Promise<void>;
}

type DocumentWithTransition = Document & {
  startViewTransition?: (callback: () => void) => ViewTransitionLike;
};

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
      const root = document.documentElement;
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

      const doc = document as DocumentWithTransition;
      if (!prefersReducedMotion && typeof doc.startViewTransition === 'function') {
        const x = origin?.x ?? window.innerWidth / 2;
        const y = origin?.y ?? 28;
        const endRadius = computeRippleRadius(x, y, window.innerWidth, window.innerHeight);

        root.dataset.vt = 'theme';
        const transition = doc.startViewTransition(() => {
          flushSync(() => {
            persistAndApply();
          });
        });

        transition.ready
          .then(() => {
            root.animate(
              {
                clipPath: [
                  `circle(0px at ${x}px ${y}px)`,
                  `circle(${endRadius}px at ${x}px ${y}px)`,
                ],
              },
              {
                duration: 460,
                easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                pseudoElement: '::view-transition-new(root)',
              }
            );
          })
          .catch(() => {
            // Fallback silently if view transition was interrupted
          });

        transition.finished
          .catch(() => {})
          .finally(() => {
            if (root.dataset.vt === 'theme') {
              delete root.dataset.vt;
            }
          });
        return;
      }

      // Smooth CSS surface crossfade fallback when View Transitions API is unavailable
      if (!prefersReducedMotion) {
        root.classList.add('theme-transitioning');
        window.setTimeout(() => {
          root.classList.remove('theme-transitioning');
        }, 380);
      }
      persistAndApply();
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
