import { NextRequest, NextResponse } from 'next/server';
import { getNeonSql, isNeonConfigured } from '@/lib/db';
import {
  PRIVATE_NO_STORE_CACHE_CONTROL,
  RATE_LIMIT_TIERS,
  enforceRateLimit,
} from '@/lib/http-utils';
import {
  KEEP_ALIVE_INTERVAL_MINUTES,
  RENDER_SLEEP_THRESHOLD_MINUTES,
  ensureServerKeepAliveDaemon,
  recordKeepAlivePing,
} from '@/lib/keep-alive';

export const dynamic = 'force-dynamic';

/**
 * Dedicated Render Anti-Sleep Endpoint (`/api/keep-alive`).
 * Triggered automatically every 10 minutes by:
 *   1. The client-side KeepAlivePulse component while any tab is open
 *   2. The server-side 10-minute self-ping background daemon
 *   3. Any optional external monitor (UptimeRobot / cron-job.org)
 */
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, RATE_LIMIT_TIERS.PUBLIC_READ, 'keep-alive');
  if (limited) return limited;

  ensureServerKeepAliveDaemon();

  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source')?.trim() || 'client-heartbeat';
  const state = recordKeepAlivePing(source);

  // Lightly warm Neon serverless connection if configured without blocking on failure
  let databaseWarm = false;
  if (isNeonConfigured()) {
    try {
      const sql = getNeonSql();
      await sql`SELECT 1`;
      databaseWarm = true;
    } catch {
      databaseWarm = false;
    }
  }

  return NextResponse.json(
    {
      alive: true,
      service: 'hey-lady-render-keep-alive',
      intervalMinutes: KEEP_ALIVE_INTERVAL_MINUTES,
      renderSleepThresholdMinutes: RENDER_SLEEP_THRESHOLD_MINUTES,
      databaseWarm,
      ...state,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': PRIVATE_NO_STORE_CACHE_CONTROL,
        'X-Keep-Alive-Interval': '600',
      },
    }
  );
}

export async function HEAD(request: NextRequest) {
  const limited = enforceRateLimit(request, RATE_LIMIT_TIERS.PUBLIC_READ, 'keep-alive-head');
  if (limited) return limited;

  ensureServerKeepAliveDaemon();
  recordKeepAlivePing('head-probe');

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': PRIVATE_NO_STORE_CACHE_CONTROL,
      'X-Keep-Alive-Interval': '600',
    },
  });
}
