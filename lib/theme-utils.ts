export type ThemeMode = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'kinship-theme';

export interface PrismSparkVector {
  id: number;
  dx: number;
  dy: number;
  angleDeg: number;
  scale: number;
}

export interface BoudoirVelvetTransitionSpec {
  mode: 'velvet-night' | 'champagne-light';
  badgeText: string;
  originX: number;
  originY: number;
  endRadius: number;
  sweepAngleDeg: number;
  durationMs: number;
  themeCommitDelayMs: number;
  veilGradient: string;
  sweepRibbonGradient: string;
  outerRingBorder: string;
  innerRingBorder: string;
  ringGlow: string;
  sparks: PrismSparkVector[];
}

/**
 * Normalizes any persisted or untrusted theme value into a valid ThemeMode.
 * Defaults to 'light' for the crisp alabaster cinema shell, while preserving full dark mode toggling.
 */
export function resolveInitialTheme(
  stored: string | null | undefined,
  fallback: ThemeMode = 'light'
): ThemeMode {
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return fallback;
}

/**
 * Returns the opposite theme mode for toggle actions.
 */
export function getNextTheme(current: ThemeMode): ThemeMode {
  return current === 'dark' ? 'light' : 'dark';
}

/**
 * Computes the distance from (originX, originY) to the farthest viewport corner.
 */
export function computeRippleRadius(
  originX: number,
  originY: number,
  viewportWidth: number,
  viewportHeight: number
): number {
  const maxX = Math.max(originX, Math.max(0, viewportWidth - originX));
  const maxY = Math.max(originY, Math.max(0, viewportHeight - originY));
  return Math.hypot(maxX, maxY);
}

/**
 * Builds an 8-vertex rotating star-diamond polygon string in pixel coordinates.
 */
function buildOctaDiamondPolygon(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRatio: number,
  rotationDeg: number
): string {
  const points: string[] = [];
  const baseRad = (rotationDeg * Math.PI) / 180;

  for (let i = 0; i < 8; i += 1) {
    const angle = baseRad + (i * Math.PI) / 4;
    const r = i % 2 === 0 ? outerRadius : outerRadius * innerRatio;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    points.push(`${x.toFixed(1)}px ${y.toFixed(1)}px`);
  }

  return `polygon(${points.join(', ')})`;
}

/**
 * Generates multi-stage CSS `clip-path: polygon(...)` keyframes.
 */
export function buildDiamondPrismClipKeyframes(
  originX: number,
  originY: number,
  viewportWidth: number,
  viewportHeight: number
): string[] {
  const maxR = Math.max(
    64,
    computeRippleRadius(originX, originY, viewportWidth, viewportHeight)
  );

  return [
    buildOctaDiamondPolygon(originX, originY, 2, 0.28, -28),
    buildOctaDiamondPolygon(originX, originY, maxR * 0.28, 0.44, -8),
    buildOctaDiamondPolygon(originX, originY, maxR * 0.82, 0.74, 10),
    buildOctaDiamondPolygon(originX, originY, maxR * 1.55, 0.96, 22),
  ];
}

/**
 * Computes the directional angle (in degrees) from the click origin toward the
 * farthest viewport corner so the silk light-ribbon sweeps across the full screen.
 */
export function computeDiagonalSweepAngle(
  originX: number,
  originY: number,
  viewportWidth: number,
  viewportHeight: number
): number {
  const targetX = originX > viewportWidth / 2 ? 0 : viewportWidth;
  const targetY = originY > viewportHeight / 2 ? 0 : viewportHeight;
  const rad = Math.atan2(targetY - originY, targetX - originX);
  return Math.round((rad * 180) / Math.PI);
}

/**
 * Computes deterministic radial ember/spark trajectories around the toggle origin.
 */
export function computePrismSparkVectors(
  count: number = 8,
  maxDistancePx: number = 96
): PrismSparkVector[] {
  const safeCount = Math.max(1, Math.min(24, Math.floor(count)));
  const safeDist = Math.max(16, maxDistancePx);
  const vectors: PrismSparkVector[] = [];

  for (let i = 0; i < safeCount; i += 1) {
    const angleRad = (i * 2 * Math.PI) / safeCount - Math.PI / 4;
    const isPrimaryVertex = i % 2 === 0;
    const distance = isPrimaryVertex ? safeDist : safeDist * 0.64;
    const dx = Number((Math.cos(angleRad) * distance).toFixed(2));
    const dy = Number((Math.sin(angleRad) * distance).toFixed(2));
    const angleDeg = Math.round((angleRad * 180) / Math.PI + 45);
    const scale = isPrimaryVertex ? 1.15 : 0.78;

    vectors.push({
      id: i,
      dx,
      dy,
      angleDeg,
      scale,
    });
  }

  return vectors;
}

/**
 * Builds the pure, GPU-composited 18+ Boudoir Velvet & Neon Silk transition specification.
 * Uses only transform & opacity layers to guarantee locked 60fps/120fps playback with zero main-thread lag.
 */
export function buildBoudoirVelvetTransitionSpec(
  nextTheme: ThemeMode,
  originX: number,
  originY: number,
  viewportWidth: number,
  viewportHeight: number
): BoudoirVelvetTransitionSpec {
  const isToDark = nextTheme === 'dark';
  const safeW = Math.max(320, viewportWidth);
  const safeH = Math.max(320, viewportHeight);
  const endRadius = Math.max(
    240,
    computeRippleRadius(originX, originY, safeW, safeH)
  );
  const sweepAngleDeg = computeDiagonalSweepAngle(originX, originY, safeW, safeH);

  return {
    mode: isToDark ? 'velvet-night' : 'champagne-light',
    badgeText: isToDark ? '18+ VELVET NIGHT' : '18+ SILK LOUNGE',
    originX,
    originY,
    endRadius,
    sweepAngleDeg,
    durationMs: 520,
    themeCommitDelayMs: 130,
    veilGradient: isToDark
      ? 'radial-gradient(circle, rgba(225,29,72,0.42) 0%, rgba(159,18,57,0.34) 36%, rgba(11,11,15,0.68) 70%, rgba(11,11,15,0) 100%)'
      : 'radial-gradient(circle, rgba(251,191,36,0.40) 0%, rgba(244,63,94,0.24) 38%, rgba(255,251,235,0.65) 70%, rgba(255,255,255,0) 100%)',
    sweepRibbonGradient: isToDark
      ? `linear-gradient(${sweepAngleDeg}deg, transparent 28%, rgba(225,29,72,0.26) 44%, rgba(251,191,36,0.52) 50%, rgba(136,19,55,0.34) 56%, transparent 72%)`
      : `linear-gradient(${sweepAngleDeg}deg, transparent 28%, rgba(245,158,11,0.25) 44%, rgba(255,255,255,0.85) 50%, rgba(244,63,94,0.24) 56%, transparent 72%)`,
    outerRingBorder: isToDark
      ? '2px solid rgba(244, 63, 94, 0.78)'
      : '2px solid rgba(245, 158, 11, 0.82)',
    innerRingBorder: isToDark
      ? '1.5px solid rgba(251, 191, 36, 0.65)'
      : '1.5px solid rgba(244, 63, 94, 0.58)',
    ringGlow: isToDark
      ? '0 0 32px rgba(225, 29, 72, 0.55)'
      : '0 0 32px rgba(245, 158, 11, 0.48)',
    sparks: computePrismSparkVectors(8, 104),
  };
}

/**
 * Returns deterministic skeleton card counts for HomeFeed grid sections so
 * loading states preserve exact row geometry with zero layout shift.
 */
export function getHomeFeedSkeletonCounts(isCuratedHome: boolean): {
  trendingCount: number;
  discoveryCount: number;
} {
  return {
    trendingCount: isCuratedHome ? 3 : 0,
    discoveryCount: 6,
  };
}
