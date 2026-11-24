import type { Metadata } from 'next';
import { getCurrentAdminUser } from '@/lib/admin-auth';
import { getAdminCatalog } from '@/lib/repository';
import {
  formatResetErrorQueryMessage,
  sanitizeResetQueryParam,
} from '@/lib/user-auth-utils';
import { AdminDashboard } from '@/components/admin-dashboard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin Console',
  description: 'Admin-only link manager, thumbnail editor, and catalog controls.',
  robots: { index: false, follow: false },
};

interface AdminPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const EMPTY_CATALOG = {
  videos: [],
  categories: [],
  educators: [],
  comments: [],
  stats: { totalVideos: 0, totalViews: 0, totalLikes: 0, totalComments: 0 },
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const [adminUser, resolvedSearchParams] = await Promise.all([
    getCurrentAdminUser(),
    searchParams ?? Promise.resolve({} as Record<string, string | string[] | undefined>),
  ]);
  const isAuthenticated = Boolean(adminUser);

  // Only query full admin catalog when the caller has a verified admin session
  const catalog = isAuthenticated ? await getAdminCatalog() : EMPTY_CATALOG;

  const initialResetToken = sanitizeResetQueryParam(
    resolvedSearchParams.token ?? resolvedSearchParams.resetToken
  );
  const initialResetError = formatResetErrorQueryMessage(
    sanitizeResetQueryParam(resolvedSearchParams.error, 120)
  );

  return (
    <AdminDashboard
      initialAuthenticated={isAuthenticated}
      initialAdmin={adminUser}
      initialVideos={catalog.videos}
      categories={catalog.categories}
      educators={catalog.educators}
      initialComments={catalog.comments}
      initialStats={catalog.stats}
      initialResetToken={initialResetToken}
      initialResetError={initialResetError}
    />
  );
}
