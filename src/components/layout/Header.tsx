'use client';

import { useNavigate } from '@/hooks/navigation/use-navigate';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useEffect, useRef, Suspense, useSyncExternalStore } from 'react';
import { LocationSelector } from '@/components/shared/LocationSelector';
import { cn } from '@/lib/utils';
import { SITE_NAME } from '@/lib/constants';
import { usePathname } from 'next/navigation';
import { shouldShowBrowseHeaderChrome } from '@/lib/search/browse-path';

const BrowseFilterBar = dynamic(
  () => import('@/components/browse/BrowseFilterBar').then((m) => m.BrowseFilterBar),
  { ssr: false }
);

const HeaderSearchBar = dynamic(
  () => import('@/components/shared/HeaderSearchBar').then((m) => m.HeaderSearchBar),
  {
    loading: () => (
      <div
        className="h-10 min-w-0 flex-1 max-w-md animate-pulse rounded-lg border bg-muted/40"
        aria-hidden
      />
    ),
  }
);

const ArkUserMenu = dynamic(
  () => import('@/components/ui/ark-user-menu').then((m) => m.ArkUserMenu),
  {
    ssr: false,
    loading: () => (
      <div className="size-9 shrink-0 rounded-full bg-muted/50 animate-pulse" aria-hidden />
    ),
  }
);

const HeaderBrowseCategoryMenus = dynamic(
  () =>
    import('@/components/layout/HeaderBrowseCategoryMenus').then(
      (m) => m.HeaderBrowseCategoryMenus
    ),
  { ssr: false }
);

function AuthSection() {
  return (
    <div className="flex items-center gap-1.5">
      <LocationSelector />
      <ArkUserMenu />
    </div>
  );
}

function HeaderFilterRow() {
  const pathname = usePathname();
  if (!shouldShowBrowseHeaderChrome(pathname)) return null;
  return (
    <div className="min-w-0 flex-1">
      <Suspense fallback={null}>
        <BrowseFilterBar />
      </Suspense>
    </div>
  );
}

function subscribeScroll(onStoreChange: () => void) {
  window.addEventListener('scroll', onStoreChange, { passive: true });
  return () => window.removeEventListener('scroll', onStoreChange);
}

function getScrollSnapshot() {
  return window.scrollY > 10;
}

export function Header({ compact = false }: { compact?: boolean }) {
  const isScrolled = useSyncExternalStore(
    subscribeScroll,
    getScrollSnapshot,
    () => false
  );
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const { navigateTo } = useNavigate();
  const isHome = pathname === '/';
  const useSolidHeader = !isHome || isScrolled;
  const showBrowseChrome = shouldShowBrowseHeaderChrome(pathname);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const syncHeaderOffset = () => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty(
        '--site-header-offset',
        `${height + 2}px`
      );
    };

    syncHeaderOffset();
    const observer = new ResizeObserver(syncHeaderOffset);
    observer.observe(el);
    window.addEventListener('scroll', syncHeaderOffset, { passive: true });
    window.addEventListener('resize', syncHeaderOffset);

    const t1 = window.setTimeout(syncHeaderOffset, 100);
    const t2 = window.setTimeout(syncHeaderOffset, 500);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', syncHeaderOffset);
      window.removeEventListener('resize', syncHeaderOffset);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [compact, pathname, isScrolled, useSolidHeader, showBrowseChrome]);

  return (
    <header
      ref={headerRef}
      className={cn(
        'sticky top-0 isolate z-(--z-header) w-full transition-all duration-300 ease-out',
        useSolidHeader
          ? cn(
              'header-glass header-solid',
              isScrolled &&
                'header-scrolled shadow-md shadow-black/4 dark:shadow-black/15 -translate-y-px'
            )
          : 'header-transparent'
      )}
      role="banner"
    >
      <div className="header-emerald-bottom-line absolute inset-x-0 bottom-0" />
      <div
        className={cn(
          'page-container border-b transition-colors duration-300',
          isScrolled ? 'border-border/30' : 'border-border/20'
        )}
      >
        <div className="flex h-[52px] min-w-0 items-center gap-2 sm:gap-4">
          <button
            type="button"
            data-href="/"
            title="صفحه اصلی"
            onClick={() => navigateTo('home')}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg transition-opacity duration-150 hover:opacity-80 active:scale-95"
            aria-label={`${SITE_NAME} — صفحه اصلی`}
          >
            <Image
              src="/logo.svg"
              alt=""
              width={28}
              height={28}
              className="size-7"
              priority={isHome}
            />
          </button>

          <div className="flex min-w-0 flex-1 max-w-[600px] items-center">
            <div className="search-glow-focus w-full min-w-0 flex-1 rounded-xl">
              <HeaderSearchBar compact />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <AuthSection />
          </div>
        </div>

        {!compact && showBrowseChrome && (
          <div className="flex min-w-0 flex-wrap items-center gap-2 py-2 md:flex-nowrap">
            <HeaderBrowseCategoryMenus />
            <div className="min-w-0 w-full flex-1 basis-full overflow-x-auto md:basis-auto md:overflow-visible">
              <HeaderFilterRow />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
