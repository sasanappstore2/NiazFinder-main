'use client';

import { Fragment, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, Home } from 'lucide-react';
import { routeBuilder } from '@/config/routes';
import { resolveSearchSegments } from '@/lib/search/resolve-segments';

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

/**
 * Build breadcrumbs for a `/s/{location}/{...segments}` URL.
 *
 * Examples:
 *   /s/iran             → خانه › جستجو
 *   /s/iran/real-estate → خانه › جستجو › املاک
 *   /s/mashhad          → خانه › جستجو › مشهد
 *   /s/mashhad/real-estate/buy-residential → خانه › جستجو › مشهد › املاک › فروش مسکونی
 */
function searchCrumbs(pathname: string, home: Crumb): Crumb[] {
  // Strip /s/ prefix and split
  const parts = pathname.replace(/^\/s\/?/, '').split('/').filter(Boolean);
  const [rawLocation, ...rawSegments] = parts;

  if (!rawLocation) {
    return [home, { label: 'جستجو', href: routeBuilder.search() }];
  }

  const ctx = resolveSearchSegments(rawLocation, rawSegments);
  const root: Crumb = { label: 'جستجو', href: routeBuilder.search() };

  if (ctx.kind === 'invalid-location') return [home, root];

  const locSlug = ctx.location.kind === 'country' ? 'iran' : ctx.location.city.slug;
  const locLabel = ctx.location.kind === 'country' ? 'سراسر ایران' : ctx.location.city.title;
  const locCrumb: Crumb = {
    label: locLabel,
    href: routeBuilder.search({ location: locSlug }),
  };

  if (ctx.kind === 'all') {
    return [home, root, locCrumb];
  }

  if (ctx.kind === 'category') {
    return [
      home,
      root,
      locCrumb,
      {
        label: ctx.category.title,
        href: routeBuilder.search({ location: locSlug, category: ctx.category.slug }),
      },
    ];
  }

  if (ctx.kind === 'parent-child') {
    return [
      home,
      root,
      locCrumb,
      {
        label: ctx.parent.title,
        href: routeBuilder.search({ location: locSlug, category: ctx.parent.slug }),
      },
      {
        label: ctx.category.title,
        href: routeBuilder.search({
          location: locSlug,
          parentCategory: ctx.parent.slug,
          category: ctx.category.slug,
        }),
      },
    ];
  }

  // invalid-segments → drop back to location root
  return [home, root, locCrumb];
}

function crumbsForPath(pathname: string): Crumb[] {
  const home: Crumb = { label: 'صفحه اصلی', href: routeBuilder.home() };

  if (pathname === '/') return [home];

  // Canonical search/browse path
  if (pathname === '/s' || pathname.startsWith('/s/')) {
    return searchCrumbs(pathname, home);
  }

  // Legacy /browse — should be redirected by the page handler, but if a
  // partially-cached page lingers, render a sane breadcrumb.
  if (pathname === '/browse' || pathname.startsWith('/browse/')) {
    return [home, { label: 'جستجو', href: routeBuilder.search() }];
  }

  if (pathname.startsWith('/v/')) {
    return [
      home,
      { label: 'جستجو', href: routeBuilder.search({ filters: { type: 'need' } }) },
      { label: 'جزئیات آگهی', href: pathname },
    ];
  }
  if (pathname.startsWith('/pro/')) {
    return [
      home,
      { label: 'جستجو', href: routeBuilder.search({ filters: { type: 'business' } }) },
      { label: 'پروفایل کسب‌وکار', href: pathname },
    ];
  }
  // Legacy /n/ and /b/ (redirect handlers; breadcrumb for cached pages)
  if (pathname.startsWith('/n/')) {
    return [
      home,
      { label: 'جستجو', href: routeBuilder.search({ filters: { type: 'need' } }) },
      { label: 'جزئیات نیاز', href: pathname },
    ];
  }
  if (pathname.startsWith('/b/')) {
    return [
      home,
      { label: 'جستجو', href: routeBuilder.search({ filters: { type: 'business' } }) },
      { label: 'پروفایل کسب‌وکار', href: pathname },
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

export function Breadcrumb() {
  const pathname = usePathname();
  const crumbs = useMemo(() => crumbsForPath(pathname), [pathname]);

  return (
    <BreadcrumbNav dir="rtl" itemScope itemType="https://schema.org/BreadcrumbList">
      <BreadcrumbList className="flex flex-wrap items-center gap-1.5 text-sm sm:gap-2">
        {/* Separator must be sibling BreadcrumbItem, not nested — both render <li>. */}
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
