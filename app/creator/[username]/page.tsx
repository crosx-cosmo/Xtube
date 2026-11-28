import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCreatorProfile } from '@/lib/repository';
import {
  buildAbsoluteAssetUrl,
  buildBreadcrumbJsonLd,
  buildCanonicalUrl,
  buildCreatorJsonLd,
  serializeJsonLd,
  SITE_KEYWORDS,
  SITE_NAME,
} from '@/lib/seo';
import { CreatorProfileView } from '@/components/creator-profile-view';

export const dynamic = 'force-dynamic';

interface CreatorPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: CreatorPageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getCreatorProfile(username);
  if (!profile) {
    return {
      title: 'Creator Not Found',
      robots: { index: false, follow: false },
    };
  }

  const canonical = buildCanonicalUrl(`/creator/${profile.creator.username}`);
  const avatarImage = buildAbsoluteAssetUrl(profile.creator.avatarUrl);
  const description =
    profile.creator.bio ||
    `Watch ${profile.videos.length} exclusive 18+ releases by ${profile.creator.name} on ${SITE_NAME}.`;

  return {
    title: `${profile.creator.name} — VIP Creator Channel`,
    description,
    keywords: [profile.creator.name, profile.creator.credentials, ...SITE_KEYWORDS].filter(
      Boolean
    ),
    alternates: { canonical },
    openGraph: {
      type: 'profile',
      url: canonical,
      siteName: SITE_NAME,
      title: `${profile.creator.name} | ${SITE_NAME}`,
      description,
      images: [{ url: avatarImage, alt: profile.creator.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${profile.creator.name} | ${SITE_NAME}`,
      description,
      images: [avatarImage],
    },
  };
}

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { username } = await params;
  const profile = await getCreatorProfile(username);

  if (!profile) {
    notFound();
  }

  const creatorJsonLd = serializeJsonLd(
    buildCreatorJsonLd(profile.creator, profile.videos)
  );
  const breadcrumbJsonLd = serializeJsonLd(
    buildBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'VIP Creators', path: '/educators' },
      {
        name: profile.creator.name,
        path: `/creator/${profile.creator.username}`,
      },
    ])
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: creatorJsonLd }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <CreatorProfileView
        creator={profile.creator}
        videos={profile.videos}
        totalViews={profile.totalViews}
        initialIsFollowing={profile.isFollowing}
      />
    </>
  );
}
