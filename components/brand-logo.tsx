'use client';

import * as React from 'react';
import {
  generateOrbParticles,
  projectOrbParticles,
} from '@/lib/particle-orb';
import { cn } from '@/lib/utils';

type OrbVariant = 'header' | 'compact' | 'modal' | 'hero';

interface ParticleOrbCrestProps {
  variant?: OrbVariant;
  className?: string;
}

const ORB_CONFIG: Record<
  OrbVariant,
  {
    pxSize: number;
    particleCount: number;
    speed: number;
    frameClass: string;
  }
> = {
  compact: {
    pxSize: 32,
    particleCount: 150,
    speed: 0.58,
    frameClass: 'h-8 w-8 rounded-full',
  },
  header: {
    pxSize: 38,
    particleCount: 190,
    speed: 0.55,
    frameClass: 'h-[2.375rem] w-[2.375rem] rounded-full',
  },
  modal: {
    pxSize: 48,
    particleCount: 240,
    speed: 0.52,
    frameClass: 'h-12 w-12 rounded-full',
  },
  hero: {
    pxSize: 152,
    particleCount: 780,
    speed: 0.42,
    frameClass:
      'h-[clamp(6.75rem,11vw,9.5rem)] w-[clamp(6.75rem,11vw,9.5rem)] rounded-full',
  },
};

/**
 * Animated 3D golden luminous particle-sphere crest matching the kinetic orb
 * aesthetic. Runs on 2D Canvas with DPR scaling, automatic tab-visibility pause,
 * hover acceleration, and prefers-reduced-motion support.
 */
export function ParticleOrbCrest({
  variant = 'header',
  className,
}: ParticleOrbCrestProps) {
  const cfg = ORB_CONFIG[variant];
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const hoveredRef = React.useRef(false);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = cfg.pxSize;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const particles = generateOrbParticles(cfg.particleCount);
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    let rafId = 0;
    let angleY = 0.65;
    let elapsed = 0;
    let lastTimestamp = performance.now();

    const drawFrame = () => {
      ctx.clearRect(0, 0, size, size);

      // Deep obsidian circular core with warm amber atmospheric halo
      const cx = size / 2;
      const cy = size / 2;
      const bgGlow = ctx.createRadialGradient(
        cx,
        cy,
        size * 0.04,
        cx,
        cy,
        size * 0.5
      );
      bgGlow.addColorStop(0, 'rgba(251, 191, 36, 0.24)');
      bgGlow.addColorStop(0.38, 'rgba(217, 119, 6, 0.12)');
      bgGlow.addColorStop(0.76, 'rgba(12, 10, 14, 0.94)');
      bgGlow.addColorStop(1, 'rgba(8, 7, 10, 1)');
      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, size, size);

      const projected = projectOrbParticles(particles, {
        size,
        angleY,
        time: elapsed,
      });

      for (let i = 0; i < projected.length; i += 1) {
        const pt = projected[i];
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.px, pt.py, pt.radius, 0, Math.PI * 2);
        ctx.fill();

        if (pt.glow && size >= 44) {
          ctx.globalAlpha = pt.alpha * 0.16;
          ctx.beginPath();
          ctx.arc(pt.px, pt.py, pt.radius * 2.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
    };

    drawFrame();
    if (reducedMotion) {
      return;
    }

    let isVisible = true;
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          isVisible = entries[0]?.isIntersecting ?? true;
        },
        { threshold: 0.05 }
      );
      observer.observe(canvas);
    }

    const step = (now: number) => {
      if (!document.hidden && isVisible) {
        const dt = Math.min(0.05, Math.max(0.001, (now - lastTimestamp) / 1000));
        const boost = hoveredRef.current ? 1.85 : 1;
        angleY += dt * cfg.speed * boost;
        elapsed += dt;
        drawFrame();
      }
      lastTimestamp = now;
      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => {
      window.cancelAnimationFrame(rafId);
      observer?.disconnect();
    };
  }, [cfg.particleCount, cfg.pxSize, cfg.speed]);

  return (
    <span
      data-testid={`brand-orb-${variant}`}
      onMouseEnter={() => {
        hoveredRef.current = true;
      }}
      onMouseLeave={() => {
        hoveredRef.current = false;
      }}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-[#09080B] border border-amber-400/45 shadow-[0_0_18px_rgba(245,158,11,0.22),inset_0_0_10px_rgba(251,191,36,0.16)] transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] group-hover:border-amber-300/75',
        cfg.frameClass,
        className
      )}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="h-full w-full block"
      />
    </span>
  );
}

interface BrandLogoProps {
  variant?: 'header' | 'drawer' | 'footer' | 'studio' | 'studio-sidebar';
  showWordmarkOnMobile?: boolean;
  className?: string;
}

/**
 * Hey Lady Luxury Brand Lockup — perfectly aligned animated 3D golden particle
 * orb paired with crisp single-line luxury typography.
 */
export function BrandLogo({
  variant = 'header',
  showWordmarkOnMobile = false,
  className,
}: BrandLogoProps) {
  const isStudio = variant === 'studio' || variant === 'studio-sidebar';
  const orbVariant: OrbVariant =
    variant === 'studio-sidebar' || variant === 'footer' ? 'compact' : 'header';

  return (
    <span
      data-testid={`brand-logo-${variant}`}
      className={cn(
        'inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 select-none',
        className
      )}
    >
      <ParticleOrbCrest variant={orbVariant} />

      <span
        className={cn(
          'inline-flex items-baseline gap-1.5 leading-none',
          !showWordmarkOnMobile && variant === 'header' && 'hidden sm:inline-flex'
        )}
      >
        <span
          className={cn(
            'font-display font-bold tracking-[-0.02em] leading-none',
            variant === 'studio-sidebar'
              ? 'text-[0.9375rem] text-white'
              : variant === 'footer'
                ? 'text-base text-zinc-950 dark:text-white'
                : isStudio
                  ? 'text-[1.125rem] text-white'
                  : 'text-[1.1875rem] text-zinc-950 dark:text-white'
          )}
        >
          Hey{' '}
          <span className="bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 dark:from-amber-300 dark:via-yellow-200 dark:to-amber-400 bg-clip-text text-transparent">
            Lady
          </span>
        </span>
      </span>
    </span>
  );
}
