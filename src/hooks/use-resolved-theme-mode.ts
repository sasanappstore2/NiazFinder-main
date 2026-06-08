'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import type { BusinessMapThemeMode } from '@/lib/business/map-tiles';

/** Resolved light/dark mode for map tiles and themed UI. */
export function useResolvedThemeMode(): BusinessMapThemeMode {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === 'dark' ? 'dark' : 'light';
}

/**
 * Same as {@link useResolvedThemeMode} but returns `null` until next-themes has
 * hydrated. Use for map tiles so we never paint light tiles and then swap to dark.
 */
export function useResolvedThemeModeWhenReady(): BusinessMapThemeMode | null {
  const { resolvedTheme } = useTheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready || !resolvedTheme) return null;
  return resolvedTheme === 'dark' ? 'dark' : 'light';
}
