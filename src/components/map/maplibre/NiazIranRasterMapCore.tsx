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
import { useResolvedThemeModeWhenReady } from '@/hooks/use-resolved-theme-mode';
import { resolveIranDivarLoadingColor } from '@/lib/map/iran/divar-style-palette';
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
  const theme = useResolvedThemeModeWhenReady();
  const mapStyle = useMemo(
    () => (theme != null ? buildIranRasterMapStyle(theme) : null),
    [theme]
  );
  const loadingColor = resolveIranDivarLoadingColor(theme ?? 'dark');

  if (!theme || !mapStyle) {
    return (
      <div
        data-map-theme={theme ?? 'dark'}
        className={cn('business-browse-map relative h-full w-full', className)}
        style={{ ...style, backgroundColor: loadingColor }}
      />
    );
  }

  return (
    <div
      data-map-theme={theme}
      className={cn('business-browse-map relative h-full w-full', className)}
      style={style}
    >
      <NiazMapLibreCore
        center={center}
        mapStyle={mapStyle}
        minZoom={resolveMapMinZoom()}
        maxZoom={resolveMapMaxZoom(detail)}
        maxBounds={IRAN_MAX_BOUNDS_LNG_LAT}
        mapKey={mapKey ?? `iran-raster-${detail}`}
        requireRtl={false}
        interactive={interactive}
        loadingBackground={loadingColor}
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
