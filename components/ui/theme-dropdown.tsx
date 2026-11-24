'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown } from 'lucide-react';
import {
  findSelectedOptionIndex,
  getNextDropdownIndex,
} from '@/lib/dropdown-utils';
import { cn } from '@/lib/utils';

export interface ThemeDropdownOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

interface ThemeDropdownProps<T extends string = string> {
  id?: string;
  value: T;
  options: readonly ThemeDropdownOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  menuLabel?: string;
  leadingIcon?: React.ReactNode;
  align?: 'left' | 'right';
  variant?: 'public' | 'studio';
  compactLabelOnMobile?: boolean;
  className?: string;
  testId?: string;
}

export function ThemeDropdown<T extends string = string>({
  id,
  value,
  options,
  onChange,
  ariaLabel,
  menuLabel,
  leadingIcon,
  align = 'right',
  variant = 'public',
  compactLabelOnMobile = false,
  className,
  testId,
}: ThemeDropdownProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(() =>
    findSelectedOptionIndex(options, value)
  );
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const reactId = React.useId();
  const triggerId = id ?? `theme-dropdown-${reactId}`;
  const listboxId = `${triggerId}-listbox`;

  const selectedOption =
    options.find((opt) => opt.value === value) ?? options[0] ?? null;

  const openMenu = React.useCallback(
    (initialIndex?: number) => {
      setHighlightedIndex(
        typeof initialIndex === 'number'
          ? initialIndex
          : findSelectedOptionIndex(options, value)
      );
      setOpen(true);
    },
    [options, value]
  );

  const closeMenu = React.useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  const selectOption = React.useCallback(
    (nextValue: T) => {
      onChange(nextValue);
      closeMenu(true);
    },
    [onChange, closeMenu]
  );

  // Dismiss on outside click / touch
  React.useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (containerRef.current && target && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu(true);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, closeMenu]);

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        const startIdx = findSelectedOptionIndex(options, value);
        openMenu(
          event.key === 'ArrowDown'
            ? getNextDropdownIndex(startIdx, 'ArrowDown', options.length)
            : getNextDropdownIndex(startIdx, 'ArrowUp', options.length)
        );
      } else {
        setHighlightedIndex((prev) =>
          getNextDropdownIndex(prev, event.key, options.length)
        );
      }
      return;
    }

    if (event.key === 'Home' && open) {
      event.preventDefault();
      setHighlightedIndex(getNextDropdownIndex(highlightedIndex, 'Home', options.length));
      return;
    }

    if (event.key === 'End' && open) {
      event.preventDefault();
      setHighlightedIndex(getNextDropdownIndex(highlightedIndex, 'End', options.length));
      return;
    }

    if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault();
      const targetOpt = options[highlightedIndex];
      if (targetOpt) {
        selectOption(targetOpt.value);
      }
      return;
    }

    if (event.key === 'Tab' && open) {
      setOpen(false);
    }
  };

  const isStudio = variant === 'studio';

  return (
    <div ref={containerRef} className={cn('relative inline-flex', className)}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={
          open && options[highlightedIndex]
            ? `${listboxId}-opt-${highlightedIndex}`
            : undefined
        }
        data-testid={testId}
        onClick={() => (open ? closeMenu(false) : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          'inline-flex h-9 items-center gap-2 rounded-full border px-3 sm:px-3.5 text-xs font-medium whitespace-nowrap shrink-0 transition-all duration-150 cursor-pointer focus-visible:outline-none',
          isStudio
            ? cn(
                'border-white/10 bg-[#141110] text-zinc-200 hover:bg-[#1B1715] hover:border-white/20',
                open &&
                  'border-orange-500/70 ring-2 ring-orange-500/20 bg-[#1B1715] text-white'
              )
            : cn(
                'border-zinc-200/90 dark:border-white/[0.1] bg-white dark:bg-[#16161F] text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-[#1D1D28] hover:border-zinc-300 dark:hover:border-white/20 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none',
                open &&
                  'border-rose-500/80 dark:border-rose-500/75 ring-2 ring-rose-500/15 dark:ring-rose-500/20 text-zinc-950 dark:text-white'
              )
        )}
      >
        {leadingIcon && (
          <span
            className={cn(
              'shrink-0 transition-colors',
              open
                ? isStudio
                  ? 'text-orange-400'
                  : 'text-rose-600 dark:text-rose-400'
                : 'text-zinc-400 dark:text-zinc-500'
            )}
            aria-hidden="true"
          >
            {leadingIcon}
          </span>
        )}
        <span
          className={cn(
            'truncate',
            compactLabelOnMobile ? 'max-w-[5.75rem] sm:max-w-none' : 'max-w-[8.75rem] sm:max-w-none'
          )}
        >
          {selectedOption?.label ?? ''}
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500 transition-transform duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]',
            open && 'rotate-180 text-rose-600 dark:text-rose-400',
            open && isStudio && 'text-orange-400'
          )}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'absolute top-[calc(100%+0.5rem)] z-50 min-w-[13.5rem] max-w-[calc(100vw-1.5rem)] rounded-2xl border p-1.5 backdrop-blur-xl',
              align === 'right' ? 'right-0' : 'left-0',
              isStudio
                ? 'border-white/12 bg-[#141110]/95 shadow-[0_18px_48px_rgba(0,0,0,0.72)]'
                : 'border-zinc-200/90 dark:border-white/[0.1] bg-white/95 dark:bg-[#14141C]/95 shadow-[0_16px_42px_rgba(15,23,42,0.14)] dark:shadow-[0_18px_48px_rgba(0,0,0,0.68)]'
            )}
          >
            {menuLabel && (
              <div className="px-2.5 pt-1 pb-1.5 text-[0.6875rem] font-medium text-zinc-400 dark:text-zinc-500">
                {menuLabel}
              </div>
            )}
            <ul
              id={listboxId}
              role="listbox"
              aria-label={ariaLabel}
              data-testid={testId ? `${testId}-menu` : undefined}
              className="space-y-0.5"
            >
              {options.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;
                return (
                  <li
                    key={opt.value}
                    id={`${listboxId}-opt-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <button
                      type="button"
                      tabIndex={-1}
                      data-testid={testId ? `${testId}-option-${opt.value}` : undefined}
                      onPointerMove={() => setHighlightedIndex(idx)}
                      onClick={() => selectOption(opt.value)}
                      className={cn(
                        'flex w-full items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors duration-100 cursor-pointer',
                        isSelected
                          ? isStudio
                            ? 'bg-orange-500/15 text-orange-200'
                            : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300'
                          : isHighlighted
                            ? isStudio
                              ? 'bg-white/[0.07] text-white'
                              : 'bg-zinc-100/90 dark:bg-white/[0.07] text-zinc-950 dark:text-white'
                            : isStudio
                              ? 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/80 dark:hover:bg-white/[0.06] hover:text-zinc-950 dark:hover:text-white'
                      )}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        {opt.icon && (
                          <span
                            className={cn(
                              'shrink-0',
                              isSelected
                                ? isStudio
                                  ? 'text-orange-400'
                                  : 'text-rose-600 dark:text-rose-400'
                                : 'text-zinc-400 dark:text-zinc-500'
                            )}
                            aria-hidden="true"
                          >
                            {opt.icon}
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold leading-tight truncate">
                            {opt.label}
                          </span>
                          {opt.description && (
                            <span
                              className={cn(
                                'mt-0.5 block text-[0.6875rem] leading-tight truncate',
                                isSelected
                                  ? isStudio
                                    ? 'text-orange-300/80'
                                    : 'text-rose-600/80 dark:text-rose-300/75'
                                  : 'text-zinc-400 dark:text-zinc-500'
                              )}
                            >
                              {opt.description}
                            </span>
                          )}
                        </span>
                      </span>

                      {isSelected && (
                        <Check
                          className={cn(
                            'h-3.5 w-3.5 shrink-0',
                            isStudio
                              ? 'text-orange-400'
                              : 'text-rose-600 dark:text-rose-400'
                          )}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
