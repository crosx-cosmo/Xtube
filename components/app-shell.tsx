'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowUp,
  ChevronRight,
  Clock,
  Compass,
  Crown,
  Flame,
  Heart,
  Home,
  LayoutGrid,
  Lock,
  Menu,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { Category } from '@/lib/types';
import { AdultCreatorGate } from '@/components/adult-creator-gate';
import { BrandLogo } from '@/components/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  ScrollImmersiveProvider,
  useImmersiveScroll,
} from '@/components/scroll-immersive-context';
import { TransitionLink } from '@/components/transition-link';
import { useViewTransition } from '@/components/view-transition-provider';
import { cn } from '@/lib/utils';

const PRIMARY_SIDEBAR_LINKS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/educators', label: 'Creators', icon: Users },
  { href: '/library', label: 'Favorites', icon: Heart },
  { href: '/library?tab=history', label: 'History', icon: Clock },
];

function TopSearchBar() {
  const { navigateWithTransition } = useViewTransition();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = React.useState(urlQuery);
  const [prevUrlQuery, setPrevUrlQuery] = React.useState(urlQuery);

  if (urlQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      navigateWithTransition(`/?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigateWithTransition('/');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className="flex flex-1 min-w-0 max-w-md lg:max-w-lg items-center"
    >
      <div className="relative flex flex-1 min-w-0 items-center">
        <label htmlFor="global-video-search" className="sr-only">
          Search videos, topics, or educators
        </label>
        <Search
          className="pointer-events-none absolute left-3.5 h-4 w-4 text-zinc-400 dark:text-zinc-500"
          aria-hidden="true"
        />
        <input
          id="global-video-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search videos..."
          className="h-10 w-full min-w-0 rounded-full border border-zinc-200/90 dark:border-zinc-800 bg-[#F4F5F8] dark:bg-[#181820] pl-9 sm:pl-10 pr-8 sm:pr-9 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:border-rose-500/70 focus:bg-white dark:focus:bg-[#121218] focus:ring-2 focus:ring-rose-500/15 focus:outline-none transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              navigateWithTransition('/');
            }}
            aria-label="Clear search query"
            className="absolute right-3 inline-flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </form>
  );
}

export function AppShell({
  categories,
  children,
}: {
  categories: Category[];
  children: React.ReactNode;
}) {
  return (
    <ScrollImmersiveProvider>
      <AppShellInner categories={categories}>{children}</AppShellInner>
    </ScrollImmersiveProvider>
  );
}

function AppShellInner({
  categories,
  children,
}: {
  categories: Category[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isWatchPage = pathname.startsWith('/watch/');
  const isAdminPage = pathname.startsWith('/admin');
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [ageGateOpen, setAgeGateOpen] = React.useState(false);
  const { isImmersiveScroll, restoreChrome, setChromeLocked } = useImmersiveScroll();

  const showExpandedSidebar = !isWatchPage && !isAdminPage && sidebarOpen;

  const handleOpenCreatorGate = React.useCallback(() => {
    setMobileMenuOpen(false);
    setAgeGateOpen(true);
  }, []);

  const handleConfirmAgeGate = React.useCallback(() => {
    setAgeGateOpen(false);
    router.push('/admin');
  }, [router]);

  const handleDeclineAgeGate = React.useCallback(() => {
    setAgeGateOpen(false);
  }, []);

  React.useEffect(() => {
    setChromeLocked(mobileMenuOpen || ageGateOpen);
  }, [mobileMenuOpen, ageGateOpen, setChromeLocked]);

  if (isAdminPage) {
    return (
      <div
        data-testid="admin-studio-shell"
        className="min-h-dvh bg-[#080707] text-zinc-100 antialiased selection:bg-orange-500/30 selection:text-orange-100"
      >
        {children}
      </div>
    );
  }

  return (
    <div
      data-testid="app-shell"
      data-scroll-immersive={isImmersiveScroll ? 'true' : 'false'}
      className="min-h-dvh flex flex-col bg-[#F4F5F8] dark:bg-[#0B0B0F] text-zinc-900 dark:text-zinc-100"
    >
      {/* Crisp Studio-White / Deep-Obsidian Streaming Top Bar */}
      <header
        data-testid="app-header"
        onFocusCapture={(e) => {
          const target = e.target;
          const isFormField =
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target instanceof HTMLSelectElement;
          if (isFormField) {
            restoreChrome();
            setChromeLocked(true);
          }
        }}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setChromeLocked(mobileMenuOpen);
          }
        }}
        className={cn(
          'sticky top-0 z-50 h-14 sm:h-16 bg-white/95 dark:bg-[#121218]/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 px-3 sm:px-5 flex items-center justify-between gap-2.5 sm:gap-5 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none will-change-transform',
          isImmersiveScroll
            ? '-translate-y-full opacity-0 pointer-events-none'
            : 'translate-y-0 opacity-100'
        )}
      >
        {/* Left: Sidebar Toggle + Brand Wordmark */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (window.innerWidth < 1024 || isWatchPage || isAdminPage) {
                setMobileMenuOpen((prev) => !prev);
              } else {
                setSidebarOpen((prev) => !prev);
              }
            }}
            aria-label="Toggle navigation sidebar"
            aria-expanded={showExpandedSidebar || mobileMenuOpen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>

          <TransitionLink
            href="/"
            aria-label="Hey Lady Home"
            className="flex items-center whitespace-nowrap shrink-0 group"
          >
            <BrandLogo variant="header" />
          </TransitionLink>
        </div>

        {/* Center: Pill Search Bar */}
        <React.Suspense
          fallback={
            <div className="flex-1 max-w-lg h-10 rounded-full bg-zinc-100 dark:bg-zinc-900" />
          }
        >
          <TopSearchBar />
        </React.Suspense>

        {/* Right: Animated Light/Dark Switch + Favorites */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ThemeToggle />

          <TransitionLink
            href="/library"
            aria-label="Saved videos"
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-full px-3 sm:px-3.5 text-sm font-medium transition-all whitespace-nowrap',
              pathname === '/library'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/25'
                : 'bg-[#F4F5F8] dark:bg-[#181820] text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-800 hover:border-rose-300 dark:hover:border-rose-500/40 hover:text-rose-600 dark:hover:text-rose-400'
            )}
          >
            <Heart
              className={cn(
                'h-4 w-4',
                pathname === '/library' ? 'fill-current text-white' : 'text-rose-600 dark:text-rose-500'
              )}
              aria-hidden="true"
            />
            <span className="hidden md:inline">Favorites</span>
          </TransitionLink>
        </div>
      </header>

      {/* Mobile / Watch-Page Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-xs cursor-default"
          />
          <aside className="relative z-10 w-[min(82vw,16.75rem)] max-w-[82vw] bg-white dark:bg-[#121218] border-r border-zinc-200 dark:border-zinc-800 h-full overflow-y-auto p-3.5 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-2 py-2 mb-3 border-b border-zinc-200/80 dark:border-zinc-800">
              <TransitionLink
                href="/"
                aria-label="Hey Lady Home"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center group"
              >
                <BrandLogo variant="drawer" showWordmarkOnMobile />
              </TransitionLink>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close sidebar"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarNavContent
              pathname={pathname}
              categories={categories}
              compact={false}
              onNavigate={() => setMobileMenuOpen(false)}
              onOpenCreatorGate={handleOpenCreatorGate}
            />
          </aside>
        </div>
      )}

      {/* Main Streaming Body: Elevated Left Navigation Rail + Cinema Content Canvas */}
      <div className="flex flex-1 min-w-0">
        {!isWatchPage && !isAdminPage && (
          <aside
            data-testid="desktop-sidebar"
            aria-label="Sidebar navigation"
            aria-hidden={isImmersiveScroll}
            className={cn(
              'hidden lg:flex flex-col shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto border-r border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#121218] transition-[width,transform,opacity,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
              isImmersiveScroll
                ? 'w-0 -translate-x-full opacity-0 border-r-0 p-0 pointer-events-none overflow-hidden'
                : showExpandedSidebar
                  ? 'w-[14.25rem] px-3.5 py-4 translate-x-0 opacity-100'
                  : 'w-[4.75rem] py-4 px-2 translate-x-0 opacity-100'
            )}
          >
            <SidebarNavContent
              pathname={pathname}
              categories={categories}
              compact={!showExpandedSidebar}
              onOpenCreatorGate={handleOpenCreatorGate}
            />
          </aside>
        )}

        <main className={cn('flex-1 min-w-0 flex flex-col', !isAdminPage && 'pb-24 lg:pb-6')}>
          <div className="flex-1">{children}</div>

          {!isAdminPage && (
            <footer
              data-testid="public-site-footer"
              className="mt-12 border-t border-zinc-200/80 dark:border-zinc-800/80 px-4 sm:px-6 lg:px-8 pt-6 pb-4"
            >
              <div className="mx-auto max-w-[100rem] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                  <TransitionLink
                    href="/"
                    aria-label="Hey Lady Home"
                    className="inline-flex items-center group w-fit"
                  >
                    <BrandLogo variant="footer" showWordmarkOnMobile />
                  </TransitionLink>

                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                      <Flame className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>18+ Adults Only</span>
                    </span>
                    <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">·</span>
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-hidden="true" />
                      <span>RTA Labeled</span>
                    </span>
                    <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Lock className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" aria-hidden="true" />
                      <span>Private Viewing</span>
                    </span>
                  </div>
                </div>

                <nav
                  aria-label="Footer navigation"
                  className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-zinc-600 dark:text-zinc-400"
                >
                  <TransitionLink
                    href="/"
                    className="hover:text-zinc-950 dark:hover:text-white transition-colors"
                  >
                    Home
                  </TransitionLink>
                  <TransitionLink
                    href="/educators"
                    className="hover:text-zinc-950 dark:hover:text-white transition-colors"
                  >
                    VIP Creators
                  </TransitionLink>
                  <TransitionLink
                    href="/library"
                    className="hover:text-zinc-950 dark:hover:text-white transition-colors"
                  >
                    Favorites
                  </TransitionLink>
                  <button
                    type="button"
                    onClick={handleOpenCreatorGate}
                    className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    <Crown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>Creator Studio</span>
                  </button>
                </nav>
              </div>
            </footer>
          )}
        </main>
      </div>

      {/* Floating Dark Capsule Navigation Dock for Mobile & Tablet (Inspired by Reference 2) */}
      {!isAdminPage && (
        <nav
          aria-label="Quick navigation dock"
          data-testid="mobile-floating-dock"
          className={cn(
            'lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 rounded-full bg-zinc-950/92 dark:bg-[#181822]/95 border border-white/12 px-2 py-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
            isImmersiveScroll
              ? 'translate-y-24 opacity-0 pointer-events-none'
              : 'translate-y-0 opacity-100'
          )}
        >
          <TransitionLink
            href="/"
            aria-label="Home"
            className={cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors',
              pathname === '/'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/40'
                : 'text-zinc-400 hover:bg-white/10 hover:text-white'
            )}
          >
            <Home className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
          </TransitionLink>

          <TransitionLink
            href="/educators"
            aria-label="Creators"
            className={cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors',
              pathname.startsWith('/educators')
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/40'
                : 'text-zinc-400 hover:bg-white/10 hover:text-white'
            )}
          >
            <Users className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
          </TransitionLink>

          <TransitionLink
            href="/library"
            aria-label="Favorites"
            className={cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors',
              pathname === '/library'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/40'
                : 'text-zinc-400 hover:bg-white/10 hover:text-white'
            )}
          >
            <Heart className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
          </TransitionLink>

          <TransitionLink
            href="/library?tab=history"
            aria-label="Watch History"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Clock className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
          </TransitionLink>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Browse topics and menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <LayoutGrid className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
          </button>
        </nav>
      )}

      {/* Discreet Floating Quick-Restore Pill while in Full-Screen Scroll Mode */}
      <AnimatePresence>
        {isImmersiveScroll && (
          <motion.button
            type="button"
            data-testid="immersive-restore-btn"
            aria-label="Scroll to top and show navigation bar"
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.92 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => {
              restoreChrome();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-1.5 rounded-full bg-zinc-900/90 dark:bg-zinc-100/95 text-white dark:text-zinc-950 border border-white/10 dark:border-zinc-300 px-3.5 py-2 text-xs font-semibold shadow-lg backdrop-blur-md hover:bg-rose-600 dark:hover:bg-rose-600 dark:hover:text-white hover:border-rose-500 transition-colors cursor-pointer"
          >
            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Top</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Full-Screen 18+ Verification Gate before Creator / Admin Login */}
      <AdultCreatorGate
        open={ageGateOpen}
        onConfirm={handleConfirmAgeGate}
        onDecline={handleDeclineAgeGate}
      />
    </div>
  );
}

function SidebarNavContent({
  pathname,
  categories,
  compact,
  onNavigate,
  onOpenCreatorGate,
}: {
  pathname: string;
  categories: Category[];
  compact: boolean;
  onNavigate?: () => void;
  onOpenCreatorGate: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col justify-between">
      <nav className="flex flex-col gap-1">
        {PRIMARY_SIDEBAR_LINKS.map((item) => {
          const Icon = item.icon;
          const baseHref = item.href.split('?')[0];
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : item.href === '/library'
              ? pathname === '/library'
              : pathname.startsWith(baseHref) && !item.href.includes('?');

          return (
            <TransitionLink
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center rounded-xl transition-colors whitespace-nowrap',
                compact
                  ? 'flex-col justify-center gap-1 py-2.5 px-1 text-[0.625rem]'
                  : 'gap-3 px-3.5 py-2.5 text-sm font-medium',
                isActive
                  ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-[#F4F5F8] dark:hover:bg-zinc-800/70 hover:text-zinc-950 dark:hover:text-white'
              )}
            >
              <Icon
                className={cn(
                  'shrink-0',
                  compact ? 'h-5 w-5' : 'h-[1.125rem] w-[1.125rem]',
                  isActive ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-400 dark:text-zinc-500'
                )}
                aria-hidden="true"
              />
              <span className={cn(compact && 'truncate max-w-full')}>{item.label}</span>
            </TransitionLink>
          );
        })}

        {!compact && (
          <>
            <div className="my-3.5 border-t border-zinc-200/80 dark:border-zinc-800/80" />
            <p className="px-3.5 pb-1.5 text-xs font-semibold text-zinc-400 dark:text-zinc-500">
              Categories
            </p>
            {categories.map((topic) => (
              <TransitionLink
                key={topic.id}
                href={`/?category=${topic.slug}`}
                onClick={onNavigate}
                className="flex items-center gap-3 rounded-xl px-3.5 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-[#F4F5F8] dark:hover:bg-zinc-800/70 hover:text-zinc-950 dark:hover:text-white transition-colors truncate"
              >
                <Compass
                  className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0"
                  aria-hidden="true"
                />
                <span className="truncate">{topic.name}</span>
              </TransitionLink>
            ))}
          </>
        )}
      </nav>

      {/* Discreet Premium Creator Banner (Opens Full-Screen 18+ Verification Gate) */}
      {compact ? (
        <div className="mt-6 pt-3 pb-4 border-t border-zinc-200/80 dark:border-zinc-800/70 flex justify-center">
          <button
            type="button"
            data-testid="become-adult-creator-banner-compact"
            onClick={onOpenCreatorGate}
            aria-label="Become an Adult Creator"
            title="Become an Adult Creator"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/30 bg-gradient-to-br from-rose-50 via-white to-amber-50 dark:from-rose-950/60 dark:via-[#18181D] dark:to-amber-950/40 text-amber-600 dark:text-amber-400 hover:border-rose-500/60 hover:scale-[1.03] transition-all cursor-pointer"
          >
            <Crown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="mt-6 pt-3 pb-4 border-t border-zinc-200/80 dark:border-zinc-800/70">
          <button
            type="button"
            data-testid="become-adult-creator-banner"
            onClick={onOpenCreatorGate}
            className="group w-full text-left rounded-2xl border border-amber-500/30 dark:border-amber-400/25 bg-gradient-to-br from-rose-50 via-white to-amber-50/80 dark:from-[#1A1318] dark:via-[#141218] dark:to-amber-950/30 p-3.5 shadow-xs hover:border-amber-500/60 dark:hover:border-amber-400/50 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between gap-1.5 text-[0.6875rem] font-semibold">
              <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                <Crown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>VIP Creator</span>
              </span>
              <span className="inline-flex items-center gap-0.5 font-mono text-[0.6875rem] font-bold text-rose-600 dark:text-rose-400">
                <Flame className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>18+</span>
              </span>
            </div>

            <p className="mt-2 font-display text-[0.8125rem] font-bold leading-snug text-zinc-950 dark:text-white group-hover:text-rose-600 dark:group-hover:text-amber-300 transition-colors">
              Become an Adult Creator
            </p>

            <div className="mt-1 flex items-center justify-between text-[0.6875rem] text-zinc-600 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
                <span>Hey Lady Studio</span>
              </span>
              <ChevronRight
                className="h-3.5 w-3.5 text-rose-600 dark:text-amber-400 transition-transform group-hover:translate-x-0.5 shrink-0"
                aria-hidden="true"
              />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
