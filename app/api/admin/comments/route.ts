import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { mapApiError } from '@/lib/db-utils';
import { listAdminComments } from '@/lib/repository';

export async function GET() {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin authorization required to view user comments.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const comments = await listAdminComments();
    return NextResponse.json(
      { comments },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[GET /api/admin/comments] Error:', error);
    const { status, message } = mapApiError(error, 'Unable to load comments.');
    return NextResponse.json({ error: message }, { status });
  }
}
