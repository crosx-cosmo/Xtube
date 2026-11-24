'use client';

import * as React from 'react';

export const WATCH_PROGRESS_STORAGE_KEY = 'kinship-watch-progress';

type ProgressOverrideMap = Record<string, number>;

const EMPTY_MAP: ProgressOverrideMap = {};
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedMap: ProgressOverrideMap = EMPTY_MAP;

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

function readLocalProgressMap(): ProgressOverrideMap {
  if (typeof window === 'undefined') return EMPTY_MAP;
  try {
    const raw = window.localStorage.getItem(WATCH_PROGRESS_STORAGE_KEY);
    if (raw === cachedRaw) {
      return cachedMap;
    }
    cachedRaw = raw;
    if (!raw) {
      cachedMap = EMPTY_MAP;
      return cachedMap;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const sanitized: ProgressOverrideMap = {};
      for (const [key, val] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof val === 'number' && Number.isFinite(val) && val >= 0) {
          sanitized[key] = Math.floor(val);
        }
      }
      cachedMap = sanitized;
      return cachedMap;
    }
    cachedMap = EMPTY_MAP;
    return cachedMap;
  } catch {
    return EMPTY_MAP;
  }
}

function getServerSnapshot(): ProgressOverrideMap {
  return EMPTY_MAP;
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  if (typeof window === 'undefined') {
    return () => {
      listeners.delete(onStoreChange);
    };
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key === WATCH_PROGRESS_STORAGE_KEY) {
      notifyListeners();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener('storage', onStorage);
  };
}

/**
 * Updates the client-side watch progress cache for immediate Home Feed synchronization.
 */
export function setLocalWatchProgress(videoId: string, progressSeconds: number) {
  if (typeof window === 'undefined' || !videoId) return;
  const safe = Math.max(0, Math.floor(Number.isFinite(progressSeconds) ? progressSeconds : 0));
  const current = readLocalProgressMap();
  const next: ProgressOverrideMap = { ...current, [videoId]: safe };
  try {
    const serialized = JSON.stringify(next);
    window.localStorage.setItem(WATCH_PROGRESS_STORAGE_KEY, serialized);
    cachedRaw = serialized;
    cachedMap = next;
  } catch {
    cachedMap = next;
  }
  notifyListeners();
}

/**
 * Clears all client-side watch progress overrides (called when clearing watch history).
 */
export function clearLocalWatchProgress() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(WATCH_PROGRESS_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
  cachedRaw = null;
  cachedMap = EMPTY_MAP;
  notifyListeners();
}

/**
 * Subscribes to live client-side watch progress updates with React 19 useSyncExternalStore.
 */
export function useWatchProgressMap(): ProgressOverrideMap {
  return React.useSyncExternalStore(subscribe, readLocalProgressMap, getServerSnapshot);
}

/**
 * Merges server-hydrated watch progress with any fresher client-side override.
 */
export function resolveVideoProgressSeconds(
  videoId: string,
  serverProgressSeconds: number | undefined,
  localOverrides: ProgressOverrideMap
): number {
  if (Object.prototype.hasOwnProperty.call(localOverrides, videoId)) {
    return localOverrides[videoId];
  }
  return typeof serverProgressSeconds === 'number' && Number.isFinite(serverProgressSeconds)
    ? Math.max(0, Math.floor(serverProgressSeconds))
    : 0;
}
