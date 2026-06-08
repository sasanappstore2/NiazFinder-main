'use client';

import { useMemo } from 'react';
import { useResolvedThemeModeWhenReady } from '@/hooks/use-resolved-theme-mode';
import { buildIranDivarStyle } from '@/lib/map/iran/divar-style';
import { resolveIranDivarLoadingColor } from '@/lib/map/iran/divar-style-palette';

export function useIranDivarMapTheme(baseMapKey: string) {
  const theme = useResolvedThemeModeWhenReady();

  const mapStyle = useMemo(
    () => () => buildIranDivarStyle(theme ?? 'light'),
    [theme]
  );

  const mapKey = theme ? `${baseMapKey}-${theme}` : baseMapKey;
  const loadingColor = resolveIranDivarLoadingColor(theme ?? 'light');

  return {
    theme,
    ready: theme !== null,
    mapStyle,
    mapKey,
    loadingColor,
  };
}
