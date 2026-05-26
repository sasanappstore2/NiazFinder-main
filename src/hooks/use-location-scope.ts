'use client';

import { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  resolveLocationScope,
  scopeFromUrl,
  type LocationScope,
} from '@/lib/search/location-scope';

export function useLocationScope(): LocationScope {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useMemo(
    () => resolveLocationScope(pathname, searchParams),
    [pathname, searchParams]
  );
}

export function useLocationScopeFromUrl(): LocationScope {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useMemo(() => scopeFromUrl(pathname, searchParams), [pathname, searchParams]);
}
