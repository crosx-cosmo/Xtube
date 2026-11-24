export interface ScrollImmersiveOptions {
  /** ScrollY below which chrome is always visible (px). */
  topRevealY?: number;
  /** Minimum ScrollY before entering full-screen scroll mode (px). */
  enterThresholdY?: number;
  /** Minimum downward scroll delta required to enter full-screen mode (px). */
  downDeltaThreshold?: number;
  /** Minimum upward scroll delta required to restore chrome (px). */
  upDeltaThreshold?: number;
}

const DEFAULTS: Required<ScrollImmersiveOptions> = {
  topRevealY: 48,
  enterThresholdY: 72,
  downDeltaThreshold: 10,
  upDeltaThreshold: 14,
};

/**
 * Pure hysteresis state machine for immersive full-screen scrolling.
 * - Always shows chrome near the top of the page.
 * - Hides chrome when scrolling deliberately downward past enterThresholdY.
 * - Restores chrome when scrolling deliberately upward.
 * - Ignores micro-jitter to prevent visual flicker.
 */
export function computeImmersiveScrollState(
  prevImmersive: boolean,
  currentY: number,
  lastY: number,
  options?: ScrollImmersiveOptions
): boolean {
  const cfg = { ...DEFAULTS, ...options };
  const safeCurrent = Number.isFinite(currentY) ? Math.max(0, currentY) : 0;
  const safeLast = Number.isFinite(lastY) ? Math.max(0, lastY) : 0;

  if (safeCurrent <= cfg.topRevealY) {
    return false;
  }

  const delta = safeCurrent - safeLast;

  if (!prevImmersive && safeCurrent >= cfg.enterThresholdY && delta >= cfg.downDeltaThreshold) {
    return true;
  }

  if (prevImmersive && delta <= -cfg.upDeltaThreshold) {
    return false;
  }

  return prevImmersive;
}
