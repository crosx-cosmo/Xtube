/**
 * Render 10-Minute Keep-Alive & Anti-Sleep Engine
 *
 * Render's free web services spin down after 15 minutes of inbound inactivity.
 * This module coordinates both a server-side 10-minute self-ping daemon and
 * client-side 10-minute heartbeat tracking so the frontend and backend stay
 * warm continuously.
 */

export const RENDER_KEEP_ALIVE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes (600,000 ms)
export const RENDER_SLEEP_THRESHOLD_MINUTES = 15;
export const KEEP_ALIVE_INTERVAL_MINUTES = 10;

export interface KeepAliveState {
  startedAt: string;
  lastPingAt: string | null;
  lastSource: string;
  totalPings: number;
  intervalMs: number;
  nextPingAt: string;
  daemonActive: boolean;
}

interface GlobalKeepAliveStore {
  startedAtMs: number;
  lastPingAtMs: number | null;
  lastSource: string;
  totalPings: number;
  timer: ReturnType<typeof setInterval> | null;
}

const globalForKeepAlive = globalThis as unknown as {
  __heyLadyKeepAlive?: GlobalKeepAliveStore;
};

function getStore(): GlobalKeepAliveStore {
  if (!globalForKeepAlive.__heyLadyKeepAlive) {
    globalForKeepAlive.__heyLadyKeepAlive = {
      startedAtMs: Date.now(),
      lastPingAtMs: null,
      lastSource: 'boot',
      totalPings: 0,
      timer: null,
    };
  }
  return globalForKeepAlive.__heyLadyKeepAlive;
}

/**
 * Resolves the external Render or application origin so self-pings traverse
 * the external reverse proxy / load balancer and reset Render's 15-minute timer.
 */
export function resolveExternalKeepAliveOrigin(
  env: Record<string, string | undefined> = process.env
): string {
  const candidates = [
    env.RENDER_EXTERNAL_URL,
    env.APP_URL,
  ];

  for (const raw of candidates) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed.origin;
      }
    } catch {
      // Ignore placeholder values like MY_APP_URL
    }
  }

  const port = env.PORT?.trim() || '3000';
  return `http://127.0.0.1:${port}`;
}

/**
 * Computes whether a new keep-alive ping is due given the last timestamp.
 */
export function isKeepAliveDue(
  lastPingAtMs: number | null,
  nowMs: number = Date.now(),
  intervalMs: number = RENDER_KEEP_ALIVE_INTERVAL_MS
): boolean {
  if (lastPingAtMs === null || !Number.isFinite(lastPingAtMs)) return true;
  return nowMs - lastPingAtMs >= intervalMs;
}

/**
 * Records a keep-alive heartbeat from either the browser client, server daemon, or external cron.
 */
export function recordKeepAlivePing(
  source = 'heartbeat',
  nowMs: number = Date.now()
): KeepAliveState {
  const store = getStore();
  store.lastPingAtMs = nowMs;
  store.lastSource = source.slice(0, 48) || 'heartbeat';
  store.totalPings += 1;

  return getKeepAliveState(nowMs);
}

/**
 * Returns a snapshot of the current Render keep-alive state.
 */
export function getKeepAliveState(nowMs: number = Date.now()): KeepAliveState {
  const store = getStore();
  const baseMs = store.lastPingAtMs ?? store.startedAtMs;
  const nextPingMs = baseMs + RENDER_KEEP_ALIVE_INTERVAL_MS;

  return {
    startedAt: new Date(store.startedAtMs).toISOString(),
    lastPingAt: store.lastPingAtMs ? new Date(store.lastPingAtMs).toISOString() : null,
    lastSource: store.lastSource,
    totalPings: store.totalPings,
    intervalMs: RENDER_KEEP_ALIVE_INTERVAL_MS,
    nextPingAt: new Date(Math.max(nowMs, nextPingMs)).toISOString(),
    daemonActive: Boolean(store.timer),
  };
}

/**
 * Dispatches a concurrent keep-alive wake request to both the Backend API
 * (`/api/keep-alive`) and the Frontend root (`/`) of the Render service.
 */
export async function executeServerSelfPing(origin?: string): Promise<boolean> {
  const targetOrigin = origin || resolveExternalKeepAliveOrigin();
  const ts = Date.now();
  try {
    const [apiRes, frontendRes] = await Promise.allSettled([
      fetch(`${targetOrigin}/api/keep-alive?source=server-daemon&_t=${ts}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-store',
          'User-Agent': 'HeyLady-Render-KeepAlive/1.0',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      }),
      fetch(`${targetOrigin}/?_ka=${ts}`, {
        method: 'HEAD',
        headers: {
          'Cache-Control': 'no-store',
          'User-Agent': 'HeyLady-Render-KeepAlive/1.0',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      }),
    ]);

    return (
      (apiRes.status === 'fulfilled' && apiRes.value.ok) ||
      (frontendRes.status === 'fulfilled' && frontendRes.value.ok)
    );
  } catch {
    return false;
  }
}

/**
 * Starts the singleton 10-minute background self-ping daemon inside the Node.js process.
 * Safe to call multiple times; only one interval timer is ever created.
 */
export function ensureServerKeepAliveDaemon(): KeepAliveState {
  const store = getStore();
  if (!store.timer && process.env.NODE_ENV !== 'test') {
    const timer = setInterval(() => {
      void executeServerSelfPing();
    }, RENDER_KEEP_ALIVE_INTERVAL_MS);

    if (typeof timer.unref === 'function') {
      timer.unref();
    }
    store.timer = timer;
  }
  return getKeepAliveState();
}
