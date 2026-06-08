'use client';

import { useMemo } from 'react';
import { NiazMapLibreCore } from '@/components/map/maplibre/NiazMapLibreCore';
import {
  buildIranRasterMapStyle,
  IRAN_MAX_BOUNDS_LNG_LAT,
  resolveMapMaxZoom,
  resolveMapMinZoom,
} from '@/lib/map/mapbox/config';
import { resolveBusinessMapTileAttribution } from '@/lib/business/map-tiles';
import { useResolvedThemeMode } from '@/hooks/use-resolved-theme-mode';
import { cn } from '@/lib/utils';
import '@/styles/business/business-map.css';
import type { NiazMapCoreProps } from '@/components/map/mapbox/NiazMapCore';

/** Free default: Iran raster tiles via `/api/map/tiles` — no Mapbox token. */
export function NiazIranRasterMapCore({
  center,
  detail = 'browse',
  interactive = true,
  mapKey,
  className,
  style,
  onMoveEnd,
  onMapClick,
  children,
  overlay,
}: NiazMapCoreProps) {
  const theme = useResolvedThemeMode() ?? 'light';
  const mapStyle = useMemo(() => buildIranRasterMapStyle(theme), [theme]);

  return (
    <div data-map-theme={theme} className={cn('relative h-full w-full', className)} style={style}>
      <NiazMapLibreCore
        center={center}
        mapStyle={mapStyle}
        minZoom={resolveMapMinZoom()}
        maxZoom={resolveMapMaxZoom(detail)}
        maxBounds={IRAN_MAX_BOUNDS_LNG_LAT}
        mapKey={mapKey ?? `${theme}-${detail}`}
        interactive={interactive}
        attribution={resolveBusinessMapTileAttribution()}
        onMoveEnd={onMoveEnd}
        onMapClick={onMapClick}
        overlay={overlay}
      >
        {children}
      </NiazMapLibreCore>
    </div>
  );
}
