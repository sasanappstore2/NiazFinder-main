'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { buildUrl, ROUTE_MAP, type RouteKey } from '@/lib/routing';

/**
 * Enhanced router hook that provides typed navigation.
 * Use this instead of raw useRouter() for type-safe navigation.
 */
export function useAppRouter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const navigate = useCallback(
    (route: RouteKey | string, params?: Record<string, string>) => {
      if (route in ROUTE_MAP) {
        const url = buildUrl(route as RouteKey, params);
        router.push(url);
      } else {
        router.push(route);
      }
    },
    [router]
  );

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  return {
    push: navigate,
    back: goBack,
    replace: router.replace,
    refresh: router.refresh,
    pathname,
    searchParams,
    query: Object.fromEntries(searchParams.entries()),
  };
}
