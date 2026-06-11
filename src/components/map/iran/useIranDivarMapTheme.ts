'use client';

import { useMemo } from 'react';
import { useResolvedThemeMode } from '@/hooks/use-resolved-theme-mode';
import { buildIranDivarStyle } from '@/lib/map/iran/divar-style';
import { resolveIranDivarLoadingColor } from '@/lib/map/iran/divar-style-palette';

export function useIranDivarMapTheme(baseMapKey: string) {
  const theme = useResolvedThemeMode();

  const mapStyle = useMemo(() => () => buildIranDivarStyle(theme), [theme]);

  return {
    theme,
    ready: true,
    mapStyle,
    mapKey: `${baseMapKey}-${theme}`,
    loadingColor: resolveIranDivarLoadingColor(theme),
  };
}
