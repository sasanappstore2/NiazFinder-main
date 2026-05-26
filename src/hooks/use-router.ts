'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { routeBuilder, legacyViewToPath } from '@/config/routes';
import { resolveLegacyBrowsePath } from '@/lib/search/browse-entry-url';
import { ROUTE_MAP, type LegacyRouteKey } from '@/lib/routing';

/**
 * Typed navigation hook — uses canonical routeBuilder.
 */
export function useAppRouter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const push = useCallback(
    (route: LegacyRouteKey | string, params?: Record<string, string>) => {
      if (route in ROUTE_MAP) {
        const url =
          route === 'browse-requests' || route === 'browse-specialists'
            ? resolveLegacyBrowsePath(route, params)
            : legacyViewToPath(route, params) || buildLegacyUrl(route as LegacyRouteKey, params);
        router.push(url);
      } else if (route.startsWith('/')) {
        router.push(route);
      } else {
        router.push(route);
      }
    },
    [router]
  );

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router]
  );

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  return {
    push,
    navigate,
    back: goBack,
    replace: router.replace,
    refresh: router.refresh,
    pathname,
    searchParams,
    query: Object.fromEntries(searchParams.entries()),
    routeBuilder,
  };
}

function buildLegacyUrl(route: LegacyRouteKey, params?: Record<string, string>): string {
  if (route === 'request-detail' && params?.id) return routeBuilder.need(params.id);
  if (route === 'specialist-profile' && params?.id) return routeBuilder.business(params.id);
  let url = ROUTE_MAP[route];
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`[${key}]`, encodeURIComponent(value));
    }
  }
  return url;
}
