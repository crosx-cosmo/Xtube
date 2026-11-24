export type ThemeMode = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'kinship-theme';

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
 * Computes the minimum circle radius needed to cover an entire viewport
 * starting from the pointer/button origin (x, y) for a radial View Transition wipe.
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
