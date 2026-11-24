import type { MetadataRoute } from 'next';
import { getCategories, listEducators, listVideos } from '@/lib/repository';
import { buildCanonicalUrl, getSiteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const [videos, categories, educators] = await Promise.all([
    listVideos(),
    getCategories(),
    listEducators(),
  ]);

  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: buildCanonicalUrl('/', siteUrl),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: buildCanonicalUrl('/educators', siteUrl),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  const categoryEntries: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: buildCanonicalUrl(`/?category=${encodeURIComponent(cat.slug)}`, siteUrl),
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.75,
  }));

  const videoEntries: MetadataRoute.Sitemap = videos.map((video) => ({
    url: buildCanonicalUrl(`/watch/${video.id}`, siteUrl),
    lastModified: new Date(video.createdAt),
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  const educatorEntries: MetadataRoute.Sitemap = educators.map((educator) => ({
    url: buildCanonicalUrl(`/creator/${educator.username}`, siteUrl),
    lastModified: new Date(educator.createdAt),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [
    ...staticEntries,
    ...categoryEntries,
    ...videoEntries,
    ...educatorEntries,
  ];
}
