'use client';

import { useMemo } from 'react';
import { useResolvedThemeModeWhenReady } from '@/hooks/use-resolved-theme-mode';
import { buildIranDivarStyle } from '@/lib/map/iran/divar-style';
import { resolveIranDivarLoadingColor } from '@/lib/map/iran/divar-style-palette';

export function useIranDivarMapTheme(baseMapKey: string) {
  const theme = useResolvedThemeModeWhenReady();

  const mapStyle = useMemo(
    () => (theme != null ? () => buildIranDivarStyle(theme) : null),
    [theme]
  );

  return {
    theme: theme ?? 'dark',
    ready: theme != null,
    mapStyle,
    /** Stable key — theme swaps via mapStyle, not remount (avoids mixed tile canvases). */
    mapKey: baseMapKey,
    loadingColor: resolveIranDivarLoadingColor(theme ?? 'dark'),
  };
}
