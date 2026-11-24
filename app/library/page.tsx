import type { Metadata } from 'next';
import { getUserLibrary } from '@/lib/repository';
import { LibraryView } from '@/components/library-view';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Favorites & Watch History',
  description: 'Your private saved videos and recently watched progress on Hey Lady.',
  robots: { index: false, follow: false },
};

interface LibraryPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const params = await searchParams;
  const { bookmarks, history } = await getUserLibrary();
  const initialTab = params.tab === 'history' ? 'history' : 'saved';

  return (
    <LibraryView
      initialBookmarks={bookmarks}
      initialHistory={history}
      initialTab={initialTab}
    />
  );
}
