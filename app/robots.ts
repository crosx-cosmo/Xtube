import type { MetadataRoute } from 'next';
import { buildCanonicalUrl, getSiteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/watch/', '/creator/', '/educators'],
        disallow: ['/admin', '/api/', '/library'],
      },
    ],
    sitemap: buildCanonicalUrl('/sitemap.xml', siteUrl),
    host: siteUrl,
  };
}
