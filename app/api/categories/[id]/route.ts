import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { mapApiError } from '@/lib/db-utils';
import {
  RATE_LIMIT_TIERS,
  enforceRateLimit,
  parseJsonBody,
  verifySameOriginMutation,
} from '@/lib/http-utils';
import { deleteCategory, updateCategory } from '@/lib/repository';
import type { AdminCategoryPayload } from '@/lib/types';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const originError = verifySameOriginMutation(request);
  if (originError) return originError;

  const limited = enforceRateLimit(request, RATE_LIMIT_TIERS.ADMIN_MUTATION, 'category-update');
  if (limited) return limited;

  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin authorization required to edit categories.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { id } = await context.params;
    const parsed = await parseJsonBody<AdminCategoryPayload>(request, 8192);
    if (parsed.errorResponse) return parsed.errorResponse;

    const result = await updateCategory(id, parsed.data!);

    if (result.notFound) {
      return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
    }
    if (result.errors) {
      return NextResponse.json({ errors: result.errors }, { status: 400 });
    }

    revalidatePath('/');
    revalidatePath('/admin');

    return NextResponse.json(
      { category: result.category },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[PATCH /api/categories/[id]] Error:', error);
    const { status, message } = mapApiError(error, 'Unable to update category.');
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const originError = verifySameOriginMutation(request);
  if (originError) return originError;

  const limited = enforceRateLimit(request, RATE_LIMIT_TIERS.ADMIN_MUTATION, 'category-delete');
  if (limited) return limited;

  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin authorization required to delete categories.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { id } = await context.params;
    const result = await deleteCategory(id);

    if (result.notFound) {
      return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
    }
    if (!result.deleted) {
      return NextResponse.json(
        { error: result.error ?? 'Unable to delete category.' },
        { status: 409 }
      );
    }

    revalidatePath('/');
    revalidatePath('/admin');

    return NextResponse.json(
      { deleted: true, id },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[DELETE /api/categories/[id]] Error:', error);
    const { status, message } = mapApiError(error, 'Unable to delete category.');
    return NextResponse.json({ error: message }, { status });
  }
}
