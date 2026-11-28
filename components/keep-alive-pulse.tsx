'use client';

import * as React from 'react';
import {
  RENDER_KEEP_ALIVE_INTERVAL_MS,
  isKeepAliveDue,
} from '@/lib/keep-alive';

/**
 * Automatic 10-Minute Render Anti-Sleep Client Heartbeat.
 *
 * Render's free web services sleep after 15 minutes of inactivity.
 * Every 10 minutes (600,000 ms), this component sends a silent background
 * request to both the backend (`/api/keep-alive`) and the frontend (`/`)
 * so Render never enters sleep mode while any visitor or creator tab is open.
 */
export function KeepAlivePulse() {
  const lastPingRef = React.useRef<number | null>(null);

  const sendKeepAlivePulse = React.useCallback(async (reason: string) => {
    const now = Date.now();
    lastPingRef.current = now;
    try {
      await Promise.allSettled([
        fetch(`/api/keep-alive?source=${encodeURIComponent(reason)}&_t=${now}`, {
          method: 'GET',
          cache: 'no-store',
          keepalive: true,
        }),
        fetch(`/?_ka=${now}`, {
          method: 'HEAD',
          cache: 'no-store',
          keepalive: true,
        }),
      ]);
    } catch {
      // Silent retry on next 10-minute cycle
    }
  }, []);

  React.useEffect(() => {
    // Initial boot registration so the server daemon is guaranteed active
    void sendKeepAlivePulse('client-init');

    // Every 10 minutes (600,000 ms), wake both Backend API and Frontend route
    const intervalId = window.setInterval(() => {
      void sendKeepAlivePulse('client-10m-interval');
    }, RENDER_KEEP_ALIVE_INTERVAL_MS);

    // If a sleeping laptop/mobile tab wakes up after >= 10 minutes, ping immediately
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        isKeepAliveDue(lastPingRef.current, Date.now(), RENDER_KEEP_ALIVE_INTERVAL_MS)
      ) {
        void sendKeepAlivePulse('client-tab-resume');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sendKeepAlivePulse]);

  return null;
}
