'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const streamButtonStyles = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0F0F11] disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        primary: 'bg-rose-600 text-white hover:bg-rose-500',
        dark: 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white font-semibold',
        outline:
          'border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600',
        subtle:
          'bg-zinc-200/85 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300/80 dark:hover:bg-zinc-700',
        ghost:
          'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white',
        sage: 'bg-emerald-50 dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 border border-emerald-500/35 dark:border-emerald-500/30 hover:bg-emerald-100/80 dark:hover:bg-zinc-700/90',
      },
      size: {
        sm: 'h-9 px-3.5 text-xs',
        md: 'h-10 px-4 py-2',
        lg: 'h-11 px-6 text-sm',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof streamButtonStyles> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Component = asChild ? Slot : 'button';
    return (
      <Component
        ref={ref}
        className={cn(streamButtonStyles({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
