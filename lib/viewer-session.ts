import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { getNeonSql } from './db';
import { isValidViewerId } from './db-utils';

export const VIEWER_COOKIE_NAME = 'kinship_viewer_id';
const VIEWER_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

/**
 * Reads the validated persistent viewer cookie if present on the incoming request.
 * Returns null for first-time anonymous visitors and crawlers (enabling zero-join
 * shared-cache reads). Never mutates the database on read.
 */
export async function getOptionalViewerId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(VIEWER_COOKIE_NAME)?.value?.trim();
    return isValidViewerId(raw) ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Resolves an existing viewer ID from cookie or mints a fresh one for a write
 * interaction (bookmark, like, comment, watch history, creator follow).
 */
export async function resolveOrCreateViewerId(): Promise<{
  viewerId: string;
  isNew: boolean;
}> {
  const existing = await getOptionalViewerId();
  if (existing) {
    return { viewerId: existing, isNew: false };
  }
  return {
    viewerId: `viewer-${crypto.randomUUID()}`,
    isNew: true,
  };
}

/**
 * Lazily ensures a real PostgreSQL `users` row exists for an anonymous viewer
 * before inserting FK-backed rows (bookmarks, likes, watch_history, comments,
 * creator_follows). Uses a single idempotent INSERT ... ON CONFLICT DO NOTHING.
 */
export async function ensureViewerRowInDb(viewerId: string): Promise<void> {
  const sql = getNeonSql();
  const suffix = viewerId.replace(/^viewer-/, '').slice(0, 8);
  const username = `member_${suffix}`;
  const email = `${username}@viewer.kinship.local`;

  await sql`
    INSERT INTO users (id, name, username, email, avatar_url, bio, credentials, is_educator, is_admin, followers_count)
    VALUES (${viewerId}, 'Community Member', ${username}, ${email}, NULL, '', '', FALSE, FALSE, 0)
    ON CONFLICT (id) DO NOTHING
  `;
}

export function attachViewerCookie(
  response: NextResponse,
  viewerId: string,
  secure: boolean
): void {
  response.cookies.set(VIEWER_COOKIE_NAME, viewerId, {
    httpOnly: true,
    sameSite: secure ? 'none' : 'lax',
    secure,
    partitioned: secure,
    path: '/',
    maxAge: VIEWER_COOKIE_MAX_AGE_SECONDS,
  });
}
