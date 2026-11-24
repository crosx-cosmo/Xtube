import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { mapApiError } from '@/lib/db-utils';
import { getAdminCatalog } from '@/lib/repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin authorization required.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const catalog = await getAdminCatalog();
    return NextResponse.json(catalog, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[GET /api/admin/catalog] Error:', error);
    const { status, message } = mapApiError(error, 'Unable to load admin catalog.');
    return NextResponse.json(
      { error: message },
      { status, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
