import type { AdultStickerKind } from '@/components/adult-stickers';

export interface FloatingAdultStickerNode {
  id: string;
  kind: AdultStickerKind;
  symbol: string;
  caption: string;
  /** Viewport percentage position (0 - 100) */
  topPct: number;
  leftPct: number;
  /** Parallax displacement depth in rem when pointer is at edge (-1..1) */
  depthRem: number;
  /** Base tilt angle in degrees */
  baseRotateDeg: number;
  /** Additional rotation degrees per normalized pointer unit */
  rotateSensitivityDeg: number;
  /** Continuous idle float duration in seconds */
  floatDurationSec: number;
  /** Continuous idle float phase delay in seconds */
  floatDelaySec: number;
  /** Visibility breakpoint tier so mobile viewports stay uncluttered */
  tier: 'all' | 'tablet-up' | 'desktop-only';
}

export const FLOATING_ADULT_STICKER_NODES: readonly FloatingAdultStickerNode[] = [
  {
    id: 'float-18-plus-top-right',
    kind: '18-plus',
    symbol: '18+',
    caption: 'ADULTS ONLY',
    topPct: 14,
    leftPct: 91,
    depthRem: 1.65,
    baseRotateDeg: -9,
    rotateSensitivityDeg: 8,
    floatDurationSec: 5.4,
    floatDelaySec: 0,
    tier: 'all',
  },
  {
    id: 'float-xxx-mid-left',
    kind: 'xxx-uncensored',
    symbol: 'XXX',
    caption: 'UNCENSORED',
    topPct: 34,
    leftPct: 4.5,
    depthRem: -1.45,
    baseRotateDeg: 7,
    rotateSensitivityDeg: -7,
    floatDurationSec: 6.2,
    floatDelaySec: 0.6,
    tier: 'tablet-up',
  },
  {
    id: 'float-hot-vip-mid-right',
    kind: 'hot-vip',
    symbol: 'HOT',
    caption: 'VIP LOUNGE',
    topPct: 48,
    leftPct: 93,
    depthRem: 2.1,
    baseRotateDeg: 10,
    rotateSensitivityDeg: 10,
    floatDurationSec: 5.8,
    floatDelaySec: 1.1,
    tier: 'all',
  },
  {
    id: 'float-nsfw-bottom-left',
    kind: 'adults-only',
    symbol: 'NSFW',
    caption: '18+ VAULT',
    topPct: 74,
    leftPct: 6,
    depthRem: 1.75,
    baseRotateDeg: -8,
    rotateSensitivityDeg: 9,
    floatDurationSec: 6.6,
    floatDelaySec: 0.3,
    tier: 'tablet-up',
  },
  {
    id: 'float-4k-bottom-right',
    kind: 'private-4k',
    symbol: '60FPS',
    caption: 'RAW 4K HD',
    topPct: 81,
    leftPct: 90.5,
    depthRem: -1.85,
    baseRotateDeg: -6,
    rotateSensitivityDeg: -8,
    floatDurationSec: 5.2,
    floatDelaySec: 1.5,
    tier: 'all',
  },
  {
    id: 'float-rta-upper-left',
    kind: 'rta-verified',
    symbol: 'RTA',
    caption: 'VERIFIED 18+',
    topPct: 16,
    leftPct: 16,
    depthRem: 1.25,
    baseRotateDeg: 5,
    rotateSensitivityDeg: 6,
    floatDurationSec: 7.0,
    floatDelaySec: 0.9,
    tier: 'desktop-only',
  },
] as const;

/**
 * Normalizes raw client pointer coordinates into [-1, 1] range relative to viewport center.
 * Clamps out-of-range coordinates safely and handles zero/invalid viewport dimensions.
 */
export function normalizePointerCoordinates(
  clientX: number,
  clientY: number,
  viewportWidth: number,
  viewportHeight: number
): { nx: number; ny: number } {
  if (
    !Number.isFinite(clientX) ||
    !Number.isFinite(clientY) ||
    !Number.isFinite(viewportWidth) ||
    !Number.isFinite(viewportHeight) ||
    viewportWidth <= 0 ||
    viewportHeight <= 0
  ) {
    return { nx: 0, ny: 0 };
  }

  const rawX = (clientX / viewportWidth - 0.5) * 2;
  const rawY = (clientY / viewportHeight - 0.5) * 2;

  const nx = Math.max(-1, Math.min(1, rawX));
  const ny = Math.max(-1, Math.min(1, rawY));

  return {
    nx: Object.is(nx, -0) ? 0 : nx,
    ny: Object.is(ny, -0) ? 0 : ny,
  };
}

/**
 * Computes parallax translation (in pixels, given root font size) and rotation (in degrees)
 * for a floating adult sticker node given normalized pointer coordinates [-1, 1].
 */
export function computeStickerParallaxOffset(
  node: Pick<
    FloatingAdultStickerNode,
    'depthRem' | 'baseRotateDeg' | 'rotateSensitivityDeg'
  >,
  nx: number,
  ny: number,
  rootFontSizePx = 16
): { xPx: number; yPx: number; rotateDeg: number } {
  const clampedX = Math.max(-1, Math.min(1, Number.isFinite(nx) ? nx : 0));
  const clampedY = Math.max(-1, Math.min(1, Number.isFinite(ny) ? ny : 0));

  const maxOffsetPx = node.depthRem * rootFontSizePx;
  const xPx = Number((clampedX * maxOffsetPx).toFixed(2));
  const yPx = Number((clampedY * maxOffsetPx * 0.85).toFixed(2));
  const rotateDeg = Number(
    (
      node.baseRotateDeg +
      (clampedX * 0.65 + clampedY * 0.35) * node.rotateSensitivityDeg
    ).toFixed(2)
  );

  return {
    xPx: Object.is(xPx, -0) ? 0 : xPx,
    yPx: Object.is(yPx, -0) ? 0 : yPx,
    rotateDeg: Object.is(rotateDeg, -0) ? 0 : rotateDeg,
  };
}
