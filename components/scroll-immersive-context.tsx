'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { computeImmersiveScrollState } from '@/lib/scroll-immersive';

interface ScrollImmersiveContextValue {
  isImmersiveScroll: boolean;
  restoreChrome: () => void;
  setChromeLocked: (locked: boolean) => void;
}

const ScrollImmersiveContext = React.createContext<ScrollImmersiveContextValue>({
  isImmersiveScroll: false,
  restoreChrome: () => {},
  setChromeLocked: () => {},
});

export function ScrollImmersiveProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isImmersiveScroll, setIsImmersiveScroll] = React.useState(false);
  const [prevPathname, setPrevPathname] = React.useState(pathname);

  const lockedRef = React.useRef(false);
  const lastYRef = React.useRef(0);
  const immersiveRef = React.useRef(false);
  const cooldownUntilRef = React.useRef(0);
  const rafIdRef = React.useRef<number | null>(null);

  // Reset immersive mode synchronously during render on route change (React 19 pattern)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    if (isImmersiveScroll) {
      setIsImmersiveScroll(false);
    }
  }

  React.useEffect(() => {
    immersiveRef.current = isImmersiveScroll;
  }, [isImmersiveScroll]);

  React.useEffect(() => {
    lastYRef.current = typeof window !== 'undefined' ? window.scrollY : 0;
    immersiveRef.current = false;
  }, [pathname]);

  const restoreChrome = React.useCallback(() => {
    immersiveRef.current = false;
    cooldownUntilRef.current = Date.now() + 260;
    setIsImmersiveScroll(false);
  }, []);

  const setChromeLocked = React.useCallback((locked: boolean) => {
    lockedRef.current = locked;
    if (locked && immersiveRef.current) {
      immersiveRef.current = false;
      setIsImmersiveScroll(false);
    }
  }, []);

  React.useEffect(() => {
    lastYRef.current = window.scrollY;

    const processScroll = () => {
      rafIdRef.current = null;
      const currentY = window.scrollY;

      if (lockedRef.current) {
        lastYRef.current = currentY;
        if (immersiveRef.current) {
          immersiveRef.current = false;
          setIsImmersiveScroll(false);
        }
        return;
      }

      // Always reveal immediately when back near top, even during cooldown
      if (currentY <= 48) {
        lastYRef.current = currentY;
        if (immersiveRef.current) {
          immersiveRef.current = false;
          setIsImmersiveScroll(false);
        }
        return;
      }

      // Guard against transition-induced layout reflow oscillation
      if (Date.now() < cooldownUntilRef.current) {
        lastYRef.current = currentY;
        return;
      }

      const next = computeImmersiveScrollState(
        immersiveRef.current,
        currentY,
        lastYRef.current
      );

      if (next !== immersiveRef.current) {
        immersiveRef.current = next;
        cooldownUntilRef.current = Date.now() + 340;
        lastYRef.current = currentY;
        setIsImmersiveScroll(next);
      } else if (
        Math.abs(currentY - lastYRef.current) >= 16 ||
        (next && currentY > lastYRef.current) ||
        (!next && currentY < lastYRef.current)
      ) {
        lastYRef.current = currentY;
      }
    };

    const handleScroll = () => {
      if (rafIdRef.current !== null) return;
      rafIdRef.current = window.requestAnimationFrame(processScroll);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const value = React.useMemo(
    () => ({
      isImmersiveScroll,
      restoreChrome,
      setChromeLocked,
    }),
    [isImmersiveScroll, restoreChrome, setChromeLocked]
  );

  return (
    <ScrollImmersiveContext.Provider value={value}>
      {children}
    </ScrollImmersiveContext.Provider>
  );
}

export function useImmersiveScroll(): ScrollImmersiveContextValue {
  return React.useContext(ScrollImmersiveContext);
}
