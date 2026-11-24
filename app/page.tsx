import type { Metadata } from 'next';
import {
  getCategories,
  getUserLibrary,
  listEducators,
  listVideos,
} from '@/lib/repository';
import {
  buildCanonicalUrl,
  buildItemListJsonLd,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TITLE,
} from '@/lib/seo';
import { HomeFeed } from '@/components/home-feed';

export const dynamic = 'force-dynamic';

interface HomePageProps {
  searchParams: Promise<{ category?: string; q?: string }>;
}

export async function generateMetadata({
  searchParams,
}: HomePageProps): Promise<Metadata> {
  const params = await searchParams;
  const rawCategory = params.category?.trim();
  const rawSearch = params.q?.trim();

  if (rawSearch) {
    return {
      title: `Search: ${rawSearch.slice(0, 60)}`,
      description: `Browse curated 18+ video results matching "${rawSearch.slice(0, 80)}" on ${SITE_NAME}.`,
      robots: { index: false, follow: true },
    };
  }

  if (rawCategory && rawCategory !== 'all') {
    const categories = await getCategories();
    const matched = categories.find(
      (c) => c.slug.toLowerCase() === rawCategory.toLowerCase()
    );
    if (matched) {
      const canonical = buildCanonicalUrl(
        `/?category=${encodeURIComponent(matched.slug)}`
      );
      const title = `${matched.name} — 18+ Curated HD Videos`;
      const description =
        matched.description ||
        `Stream exclusive ${matched.name} 18+ adult entertainment and verified creator releases in HD on ${SITE_NAME}.`;
      return {
        title,
        description,
        keywords: [matched.name, `${matched.name} videos`, ...SITE_KEYWORDS],
        alternates: { canonical },
        openGraph: {
          type: 'website',
          url: canonical,
          siteName: SITE_NAME,
          title: `${title} | ${SITE_NAME}`,
          description,
        },
        twitter: {
          card: 'summary_large_image',
          title: `${title} | ${SITE_NAME}`,
          description,
        },
      };
    }
  }

  return {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    alternates: { canonical: buildCanonicalUrl('/') },
  };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const [videos, categories, educators, library] = await Promise.all([
    listVideos(),
    getCategories(),
    listEducators(),
    getUserLibrary(),
  ]);

  const activeCategorySlug = params.category || 'all';
  const activeCategory =
    activeCategorySlug !== 'all'
      ? categories.find(
          (c) => c.slug.toLowerCase() === activeCategorySlug.toLowerCase()
        )
      : undefined;

  const itemListJsonLd = JSON.stringify(
    buildItemListJsonLd({
      name: activeCategory
        ? `${activeCategory.name} — ${SITE_NAME}`
        : SITE_TITLE,
      description: activeCategory?.description || SITE_DESCRIPTION,
      path: activeCategory
        ? `/?category=${encodeURIComponent(activeCategory.slug)}`
        : '/',
      videos,
    })
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: itemListJsonLd }}
      />
      <HomeFeed
        initialVideos={videos}
        categories={categories}
        educators={educators}
        initialHistory={library.history}
        initialCategorySlug={activeCategorySlug}
        initialSearchQuery={params.q || ''}
      />
    </>
  );
}
