import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getVideoDetail } from '@/lib/repository';
import {
  buildAbsoluteAssetUrl,
  buildBreadcrumbJsonLd,
  buildCanonicalUrl,
  buildVideoObjectJsonLd,
  SITE_KEYWORDS,
  SITE_NAME,
} from '@/lib/seo';
import { WatchView } from '@/components/watch-view';

export const dynamic = 'force-dynamic';

interface WatchPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: WatchPageProps): Promise<Metadata> {
  const { id } = await params;
  const video = await getVideoDetail(id, false);
  if (!video) {
    return {
      title: 'Video Not Found',
      robots: { index: false, follow: false },
    };
  }

  const canonical = buildCanonicalUrl(`/watch/${video.id}`);
  const imageUrl = buildAbsoluteAssetUrl(video.thumbnailUrl);
  const summary =
    video.description.length > 160
      ? `${video.description.slice(0, 157).trimEnd()}...`
      : video.description;

  return {
    title: video.title,
    description: summary,
    keywords: [video.category.name, video.creator.name, ...SITE_KEYWORDS],
    alternates: { canonical },
    openGraph: {
      type: 'video.other',
      url: canonical,
      siteName: SITE_NAME,
      title: video.title,
      description: summary,
      images: [{ url: imageUrl, width: 1280, height: 720, alt: video.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: video.title,
      description: summary,
      images: [imageUrl],
    },
  };
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { id } = await params;
  const video = await getVideoDetail(id, true);

  if (!video) {
    notFound();
  }

  const videoJsonLd = JSON.stringify(buildVideoObjectJsonLd(video));
  const breadcrumbJsonLd = JSON.stringify(
    buildBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      {
        name: video.category.name,
        path: `/?category=${encodeURIComponent(video.category.slug)}`,
      },
      { name: video.title, path: `/watch/${video.id}` },
    ])
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: videoJsonLd }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <WatchView video={video} />
    </>
  );
}
