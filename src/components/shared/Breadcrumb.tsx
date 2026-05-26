'use client';

import { Fragment, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, Home } from 'lucide-react';
import { routeBuilder } from '@/config/routes';
import type { BrowseMarket } from '@/config/market-routes';
import { resolveSearchSegments } from '@/lib/search/resolve-segments';
import { isBusinessProfilePath } from '@/lib/search/browse-path';
import { browseTrailFromSearchParams } from '@/lib/browse-trail';
import {
  buildUrlFromLocationScope,
  resolveLocationScope,
  scopeIsActive,
  scopeLabel,
  scopeToBrowseFilters,
  type LocationScope,
} from '@/lib/search/location-scope';

import {
  Breadcrumb as BreadcrumbNav,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface Crumb {
  label: string;
  href: string;
}

function marketplacePrefix(pathname: string): RegExp | null {
  if (pathname === '/n' || pathname.startsWith('/n/')) return /^\/n\/?/;
  if (pathname === '/b' || pathname.startsWith('/b/')) return /^\/b\/?/;
  if (pathname === '/s' || pathname.startsWith('/s/')) return /^\/s\/?/;
  return null;
}

function marketFromPathname(pathname: string): BrowseMarket {
  if (pathname.startsWith('/b/')) return 'business';
  return 'need';
}

/**
 * Breadcrumbs for `/n/`, `/b/`, or legacy `/s/` marketplace URLs.
 */
function marketplaceCrumbs(
  pathname: string,
  home: Crumb,
  searchParams: URLSearchParams
): Crumb[] {
  const prefix = marketplacePrefix(pathname);
  if (!prefix) return [home];

  const market = marketFromPathname(pathname);
  const parts = pathname.replace(prefix, '').split('/').filter(Boolean);
  const [rawLocation, ...rawSegments] = parts;
  const scope = resolveLocationScope(pathname, searchParams);
  const scoped = scopeIsActive(scope);

  const marketRootLabel = market === 'business' ? 'بازار کسب‌وکارها' : 'بازار نیازها';
  const marketRootHref = routeBuilder.search({ market });

  if (!rawLocation) {
    if (scoped) {
      return [
        home,
        {
          label: scopeLabel(scope),
          href: buildUrlFromLocationScope(pathname, searchParams, scope),
        },
      ];
    }
    return [home, { label: marketRootLabel, href: marketRootHref }];
  }

  const ctx = resolveSearchSegments(rawLocation, rawSegments);

  if (ctx.kind === 'invalid-location') {
    return scoped
      ? [home, { label: scopeLabel(scope), href: buildUrlFromLocationScope(pathname, searchParams, scope) }]
      : [home, { label: marketRootLabel, href: marketRootHref }];
  }

  const locSlug = ctx.location.kind === 'country' ? 'iran' : ctx.location.city.slug;
  const pathLocLabel =
    ctx.location.kind === 'country' ? 'سراسر ایران' : ctx.location.city.title;

  const crumbs: Crumb[] = [home];

  if (!scoped) {
    crumbs.push({ label: marketRootLabel, href: marketRootHref });
  }

  crumbs.push({
    label: scoped ? scopeLabel(scope) : pathLocLabel,
    href: scoped
      ? buildUrlFromLocationScope(pathname, searchParams, scope)
      : routeBuilder.search({ market, location: locSlug }),
  });

  if (ctx.kind === 'category') {
    crumbs.push({
      label: ctx.category.title,
      href: scopedSearchHref(scope, market, locSlug, { category: ctx.category.slug }),
    });
    return crumbs;
  }

  if (ctx.kind === 'parent-child') {
    crumbs.push({
      label: ctx.parent.title,
      href: scopedSearchHref(scope, market, locSlug, { category: ctx.parent.slug }),
    });
    crumbs.push({
      label: ctx.category.title,
      href: scopedSearchHref(scope, market, locSlug, {
        parentCategory: ctx.parent.slug,
        category: ctx.category.slug,
      }),
    });
    return crumbs;
  }

  return crumbs;
}

function scopedSearchHref(
  scope: LocationScope,
  market: BrowseMarket,
  pathLocSlug: string,
  opts: { category?: string; parentCategory?: string }
): string {
  if (!scopeIsActive(scope)) {
    return routeBuilder.search({ market, location: pathLocSlug, ...opts });
  }
  const location = scope.mode === 'city' ? scope.citySlug : 'iran';
  return routeBuilder.search({
    market,
    location,
    ...opts,
    filters: scopeToBrowseFilters(scope),
  });
}

function crumbsForPath(pathname: string, searchParams: URLSearchParams): Crumb[] {
  const home: Crumb = { label: 'صفحه اصلی', href: routeBuilder.home() };

  if (pathname === '/') return [home];

  if (
    pathname === '/n' ||
    pathname.startsWith('/n/') ||
    pathname === '/b' ||
    (pathname.startsWith('/b/') && !isBusinessProfilePath(pathname)) ||
    pathname === '/s' ||
    pathname.startsWith('/s/')
  ) {
    return marketplaceCrumbs(pathname, home, searchParams);
  }

  if (pathname === '/browse' || pathname.startsWith('/browse/')) {
    return [home, { label: 'بازار نیازها', href: routeBuilder.search({ market: 'need' }) }];
  }

  if (pathname.startsWith('/v/')) {
    const from = browseTrailFromSearchParams(searchParams);
    if (from) {
      return [
        ...marketplaceCrumbs(from, home, new URLSearchParams()),
        { label: 'جزئیات آگهی', href: pathname },
      ];
    }
    return [
      home,
      { label: 'بازار نیازها', href: routeBuilder.search({ market: 'need' }) },
      { label: 'جزئیات آگهی', href: pathname },
    ];
  }

  if (pathname.startsWith('/pro/')) {
    return [
      home,
      { label: 'بازار کسب‌وکارها', href: routeBuilder.search({ market: 'business' }) },
      { label: 'پروفایل کسب‌وکار', href: pathname },
    ];
  }

  if (isBusinessProfilePath(pathname)) {
    const from = browseTrailFromSearchParams(searchParams);
    const slug = pathname.split('/').filter(Boolean)[1] ?? '';
    const terminal: Crumb = { label: slug, href: pathname };
    if (from) {
      return [...marketplaceCrumbs(from, home, new URLSearchParams()), terminal];
    }
    return [
      home,
      { label: 'بازار کسب‌وکارها', href: routeBuilder.search({ market: 'business' }) },
      terminal,
    ];
  }

  if (pathname === '/post')          return [home, { label: 'ثبت نیاز', href: routeBuilder.needNew() }];
  if (pathname === '/dashboard')     return [home, { label: 'داشبورد', href: routeBuilder.dashboard() }];
  if (pathname === '/chat' || pathname.startsWith('/chat/'))
                                     return [home, { label: 'پیام‌ها', href: routeBuilder.chat() }];
  if (pathname === '/notifications') return [home, { label: 'اعلان‌ها', href: routeBuilder.notifications() }];
  if (pathname === '/help')          return [home, { label: 'پشتیبانی', href: routeBuilder.help() }];
  if (pathname === '/pricing')       return [home, { label: 'تعرفه‌ها', href: routeBuilder.pricing() }];
  if (pathname === '/login')         return [home, { label: 'ورود', href: routeBuilder.login() }];
  if (pathname === '/register')      return [home, { label: 'ثبت‌نام', href: routeBuilder.register() }];
  if (pathname === '/compare')       return [home, { label: 'مقایسه', href: routeBuilder.compare() }];

  return [home, { label: 'صفحه', href: pathname }];
}

function BreadcrumbInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const crumbs = useMemo(
    () => crumbsForPath(pathname, searchParams),
    [pathname, searchParams]
  );

  return (
    <BreadcrumbNav dir="rtl" itemScope itemType="https://schema.org/BreadcrumbList">
      <BreadcrumbList className="flex flex-wrap items-center gap-1.5 text-sm sm:gap-2">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          const showSeparator = index < crumbs.length - 1;

          return (
            <Fragment key={`${crumb.href}-${index}`}>
              <BreadcrumbItem
                className="inline-flex items-center gap-1.5"
                itemProp="itemListElement"
                itemScope
                itemType="https://schema.org/ListItem"
              >
                {isLast ? (
                  <BreadcrumbPage className="text-primary font-medium">
                    <span itemProp="name">{crumb.label}</span>
                    <meta itemProp="position" content={String(index + 1)} />
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    asChild
                    className="text-muted-foreground hover:text-primary transition-colors duration-150"
                    itemProp="item"
                  >
                    <Link href={crumb.href}>
                      <span itemProp="name">
                        {index === 0 ? (
                          <span className="flex items-center gap-1.5">
                            <Home className="size-4" />
                            {crumb.label}
                          </span>
                        ) : (
                          crumb.label
                        )}
                      </span>
                      <meta itemProp="position" content={String(index + 1)} />
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {showSeparator && (
                <BreadcrumbSeparator>
                  <ChevronLeft className="size-3.5 text-muted-foreground/60" />
                </BreadcrumbSeparator>
              )}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </BreadcrumbNav>
  );
}

export function Breadcrumb() {
  return (
    <Suspense fallback={null}>
      <BreadcrumbInner />
    </Suspense>
  );
}
