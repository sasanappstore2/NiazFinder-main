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
 * Returns `null` until next-themes has hydrated **and** `resolvedTheme` is known.
 * Avoids painting light Divar tiles before dark mode is resolved.
 */
export function useResolvedThemeModeWhenReady(): BusinessMapThemeMode | null {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || resolvedTheme == null) return null;
  return resolvedTheme === 'dark' ? 'dark' : 'light';
}
