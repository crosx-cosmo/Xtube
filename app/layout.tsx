import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/app-shell';
import { ThemeProvider } from '@/components/theme-provider';
import { ViewTransitionProvider } from '@/components/view-transition-provider';
import { getCategories } from '@/lib/repository';
import {
  buildAbsoluteAssetUrl,
  buildCanonicalUrl,
  buildWebsiteJsonLd,
  DEFAULT_OG_IMAGE,
  getSiteUrl,
  serializeJsonLd,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TITLE,
} from '@/lib/seo';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

const siteUrl = getSiteUrl();
const ogImageUrl = buildAbsoluteAssetUrl(DEFAULT_OG_IMAGE, siteUrl);

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F4F5F8' },
    { media: '(prefers-color-scheme: dark)', color: '#0B0B0F' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: SITE_NAME,
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_NAME, url: siteUrl }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'Adult Entertainment & 18+ Video Streaming',
  other: {
    rating: 'adult',
    'RATING': 'RTA-5042-1996-1400-1577-RTA',
    'content-rating': '18+',
  },
  alternates: {
    canonical: buildCanonicalUrl('/', siteUrl),
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: buildCanonicalUrl('/', siteUrl),
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: ogImageUrl,
        width: 1280,
        height: 720,
        alt: SITE_TITLE,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [ogImageUrl],
  },
};

const THEME_INIT_SCRIPT = `
(function() {
  try {
    var stored = window.localStorage.getItem('kinship-theme');
    var theme = (stored === 'light' || stored === 'dark') ? stored : 'light';
    var root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  } catch (e) {
    document.documentElement.classList.remove('dark');
  }
})();
`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = await getCategories();
  const websiteJsonLd = serializeJsonLd(buildWebsiteJsonLd(siteUrl));

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: websiteJsonLd }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-dvh bg-[#F4F5F8] dark:bg-[#0B0B0F] text-zinc-900 dark:text-zinc-100 font-sans antialiased selection:bg-rose-600/20 dark:selection:bg-rose-600/30 selection:text-rose-900 dark:selection:text-white"
      >
        <ThemeProvider>
          <ViewTransitionProvider>
            <AppShell categories={categories}>{children}</AppShell>
          </ViewTransitionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

