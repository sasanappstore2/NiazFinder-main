'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { isBrowsePath, isBusinessProfilePath } from '@/lib/search/browse-path';
import { parseFilters, serializeFilters } from '@/lib/filters/parser';
import {
  buildUrlFromLocationScope,
  persistScopeToCookie,
  scopeFromCookie,
  scopeFromUrl,
  scopeIsActive,
} from '@/lib/search/location-scope';

/** Normalize browse URL for stable equality (param order / empty values). */
function canonicalBrowseUrl(pathname: string, searchParams: URLSearchParams): string {
  const qs = serializeFilters(parseFilters(searchParams)).toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/**
 * Keeps browse URL aligned with saved location scope (cookie) and vice versa.
 * Fixes multi-city selection staying on /s/iran without ?cities=.
 */
export function useEnforceLocationScope(pathCitySlug?: string) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (!isBrowsePath(pathname) || isBusinessProfilePath(pathname)) return;

    const urlScope = scopeFromUrl(pathname, searchParams);
    const cookieScope = scopeFromCookie();

    if (scopeIsActive(urlScope)) {
      persistScopeToCookie(urlScope);
      return;
    }

    if (!scopeIsActive(cookieScope)) return;

    if (pathCitySlug && cookieScope.mode === 'city' && cookieScope.citySlug === pathCitySlug) {
      return;
    }

    const target = buildUrlFromLocationScope(pathname, searchParams, cookieScope);
    const [targetPath, targetQuery = ''] = target.split('?');
    const targetCanonical = canonicalBrowseUrl(
      targetPath,
      new URLSearchParams(targetQuery)
    );
    const currentCanonical = canonicalBrowseUrl(pathname, searchParams);

    if (targetCanonical === currentCanonical) return;

    router.replace(target);
  }, [pathname, pathCitySlug, router, searchParams]);
}
