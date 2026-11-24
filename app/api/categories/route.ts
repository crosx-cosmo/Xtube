import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { mapApiError } from '@/lib/db-utils';
import {
  PUBLIC_COLLECTION_CACHE_CONTROL,
  RATE_LIMIT_TIERS,
  enforceRateLimit,
  parseJsonBody,
  verifySameOriginMutation,
} from '@/lib/http-utils';
import { createCategory, getCategories } from '@/lib/repository';
import type { AdminCategoryPayload } from '@/lib/types';

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, RATE_LIMIT_TIERS.PUBLIC_READ, 'categories-list');
  if (limited) return limited;

  try {
    const categories = await getCategories();
    return NextResponse.json(
      { categories },
      {
        headers: {
          'Cache-Control': PUBLIC_COLLECTION_CACHE_CONTROL,
        },
      }
    );
  } catch (error) {
    console.error('[GET /api/categories] Error:', error);
    const { status, message } = mapApiError(error, 'Unable to load categories.');
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  const originError = verifySameOriginMutation(request);
  if (originError) return originError;

  const limited = enforceRateLimit(request, RATE_LIMIT_TIERS.ADMIN_MUTATION, 'category-create');
  if (limited) return limited;

  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin authorization required to manage categories.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const parsed = await parseJsonBody<AdminCategoryPayload>(request, 8192);
    if (parsed.errorResponse) return parsed.errorResponse;

    const result = await createCategory(parsed.data!);

    if (result.errors) {
      return NextResponse.json({ errors: result.errors }, { status: 400 });
    }

    revalidatePath('/');
    revalidatePath('/admin');

    return NextResponse.json(
      { category: result.category },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[POST /api/categories] Error:', error);
    const { status, message } = mapApiError(error, 'Unable to create category.');
    return NextResponse.json({ error: message }, { status });
  }
}
