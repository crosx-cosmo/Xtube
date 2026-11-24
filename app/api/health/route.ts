import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/db';
import { resolveObjectStorageConfig } from '@/lib/object-storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  const health = await checkDatabaseHealth();
  const storage = resolveObjectStorageConfig();
  return NextResponse.json(
    {
      ...health,
      objectStorage: {
        configured: storage.configured,
        bucket: storage.bucket,
        region: storage.region,
      },
      timestamp: new Date().toISOString(),
    },
    {
      status: health.ok ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
