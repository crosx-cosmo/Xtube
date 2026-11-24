'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, mounted, toggleTheme } = useTheme();
  const isDark = mounted && theme === 'dark';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    toggleTheme({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      data-testid="theme-toggle"
      onClick={handleClick}
      className={cn(
        'relative inline-flex h-9 w-[4.125rem] shrink-0 items-center rounded-full border p-1 transition-colors duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0F0F11]',
        isDark
          ? 'border-zinc-700/90 bg-zinc-900 hover:border-zinc-600'
          : 'border-amber-300/80 bg-amber-100/80 hover:border-amber-400',
        className
      )}
    >
      {/* Subtle Sun / Moon track landmarks */}
      <span
        aria-hidden="true"
        className="pointer-events-none flex w-full items-center justify-between px-1.5"
      >
        <Sun
          className={cn(
            'h-3.5 w-3.5 transition-opacity duration-200',
            isDark ? 'text-zinc-500 opacity-60' : 'text-amber-500 opacity-0'
          )}
        />
        <Moon
          className={cn(
            'h-3.5 w-3.5 transition-opacity duration-200',
            isDark ? 'text-rose-400 opacity-0' : 'text-amber-700/60 opacity-70'
          )}
        />
      </span>

      {/* Spring-Animated Sliding Thumb with Morphing Sun/Moon Icon */}
      <motion.span
        aria-hidden="true"
        initial={false}
        animate={{ x: isDark ? 28 : 0 }}
        transition={{
          type: 'spring',
          stiffness: 520,
          damping: 32,
          mass: 0.75,
        }}
        className={cn(
          'absolute left-1 top-1 flex h-7 w-7 items-center justify-center rounded-full shadow-sm transition-colors duration-300',
          isDark
            ? 'bg-zinc-800 text-rose-400 ring-1 ring-white/10'
            : 'bg-white text-amber-500 ring-1 ring-amber-200'
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.span
              key="moon"
              initial={{ rotate: -80, scale: 0.55, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 80, scale: 0.55, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center justify-center"
            >
              <Moon className="h-3.5 w-3.5 fill-current" />
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              initial={{ rotate: 80, scale: 0.55, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: -80, scale: 0.55, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center justify-center"
            >
              <Sun className="h-3.5 w-3.5 fill-current" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.span>
    </button>
  );
}
