'use client';

import * as React from 'react';
import * as RadixSwitch from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

export type SwitchProps = React.ComponentPropsWithoutRef<typeof RadixSwitch.Root>;

export const Switch = React.forwardRef<
  React.ComponentRef<typeof RadixSwitch.Root>,
  SwitchProps
>(({ className, ...props }, ref) => (
  <RadixSwitch.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0F0F11] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-rose-600 data-[state=unchecked]:bg-zinc-300 dark:data-[state=unchecked]:bg-zinc-700',
      className
    )}
    {...props}
  >
    <RadixSwitch.Thumb className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-150 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5" />
  </RadixSwitch.Root>
));
Switch.displayName = 'Switch';
