import type { Metadata } from 'next';
import { listEducators } from '@/lib/repository';
import {
  buildBreadcrumbJsonLd,
  buildCanonicalUrl,
  serializeJsonLd,
  SITE_KEYWORDS,
  SITE_NAME,
} from '@/lib/seo';
import { EducatorsDirectory } from '@/components/educators-directory';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'VIP Creators & Featured Talent',
  description:
    'Discover verified 18+ adult creators and exclusive curated video channels streaming on Hey Lady.',
  keywords: ['verified 18+ creators', 'VIP adult channels', ...SITE_KEYWORDS],
  alternates: {
    canonical: buildCanonicalUrl('/educators'),
  },
  openGraph: {
    type: 'website',
    url: buildCanonicalUrl('/educators'),
    siteName: SITE_NAME,
    title: `VIP Creators & Featured Talent | ${SITE_NAME}`,
    description:
      'Discover verified 18+ adult creators and exclusive curated video channels streaming on Hey Lady.',
  },
  twitter: {
    card: 'summary_large_image',
    title: `VIP Creators & Featured Talent | ${SITE_NAME}`,
    description:
      'Discover verified 18+ adult creators and exclusive curated video channels streaming on Hey Lady.',
  },
};

export default async function EducatorsPage() {
  const educators = await listEducators();
  const breadcrumbJsonLd = serializeJsonLd(
    buildBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'VIP Creators & Featured Talent', path: '/educators' },
    ])
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <EducatorsDirectory initialEducators={educators} />
    </>
  );
}
