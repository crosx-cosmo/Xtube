import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { mapApiError } from '@/lib/db-utils';
import {
  RATE_LIMIT_TIERS,
  enforceRateLimit,
  verifySameOriginMutation,
} from '@/lib/http-utils';
import { deleteCommentByAdmin } from '@/lib/repository';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const originError = verifySameOriginMutation(request);
  if (originError) return originError;

  const limited = enforceRateLimit(
    request,
    RATE_LIMIT_TIERS.ADMIN_MUTATION,
    'admin-delete-comment'
  );
  if (limited) return limited;

  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin authorization required to moderate comments.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { id } = await context.params;
    const deleted = await deleteCommentByAdmin(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Comment not found.' }, { status: 404 });
    }

    return NextResponse.json(
      { deleted: true, id },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[DELETE /api/admin/comments/[id]] Error:', error);
    const { status, message } = mapApiError(error, 'Unable to delete comment.');
    return NextResponse.json({ error: message }, { status });
  }
}
