'use client';

import { useMemo } from 'react';
import { NiazMapAdminBoundaries } from '@/components/map/mapbox/NiazMapAdminBoundaries';
import { NiazMapPersianGulfLabel } from '@/components/map/mapbox/NiazMapPersianGulfLabel';
import { NiazMapViewportScope } from '@/components/map/mapbox/NiazMapViewportScope';
import { NiazMapLibreCore } from '@/components/map/maplibre/NiazMapLibreCore';
import { IranMapThemeProvider } from '@/components/map/iran/IranMapThemeContext';
import { useIranDivarMapTheme } from '@/components/map/iran/useIranDivarMapTheme';
import { resolveIranDivarBrowseConfig } from '@/lib/map/iran/divar-browse-config';
import { IRAN_DIVAR_ATTRIBUTION } from '@/lib/map/iran/divar-style';
import { resolveMapMaxZoom } from '@/lib/map/mapbox/config';
import { cn } from '@/lib/utils';
import '@/styles/business/business-map.css';
import '@/styles/map/iran-divar-map.css';
import type { NiazMapCoreProps } from '@/components/map/mapbox/NiazMapCore';

/** Self-hosted Iran Divar vector map via `/api/map/vector/iran`. */
export function NiazIranVectorMapCore({
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
  citySlugs = [],
  provinceSlugs = [],
}: NiazMapCoreProps & { citySlugs?: string[]; provinceSlugs?: string[] }) {
  const config = useMemo(
    () => resolveIranDivarBrowseConfig(citySlugs, provinceSlugs),
    [citySlugs, provinceSlugs]
  );
  const maxZoom = resolveMapMaxZoom(detail);
  const baseMapKey = mapKey ?? `iran-vector-${detail}`;
  const { theme, ready, mapStyle, mapKey: themedMapKey, loadingColor } =
    useIranDivarMapTheme(baseMapKey);

  if (!ready || !theme) {
    return (
      <div
        data-map-theme="light"
        className={cn(
          'iran-divar-map business-browse-map business-browse-map--iran-divar relative h-full w-full animate-pulse',
          className
        )}
        style={{ ...style, backgroundColor: loadingColor }}
      />
    );
  }

  return (
    <div
      data-map-theme={theme}
      className={cn(
        'iran-divar-map business-browse-map business-browse-map--iran-divar relative h-full w-full',
        className
      )}
      style={style}
    >
      <IranMapThemeProvider theme={theme}>
      <NiazMapLibreCore
        center={center}
        mapStyle={mapStyle}
        minZoom={config.minZoom}
        maxZoom={maxZoom}
        maxBounds={config.maxBounds}
        mapKey={themedMapKey}
        loadingBackground={loadingColor}
        interactive={interactive}
        attribution={IRAN_DIVAR_ATTRIBUTION}
        onMoveEnd={onMoveEnd}
        onMapClick={onMapClick}
        overlay={overlay}
      >
        <NiazMapAdminBoundaries
          provinceIds={config.provinceIds}
          citySlugs={config.citySlugs.length > 0 ? config.citySlugs : citySlugs}
          scopeKind={config.scopeKind}
        />
        <NiazMapViewportScope
          viewportBounds={config.viewportBounds}
          scopeKind={config.scopeKind}
          citySlugs={config.citySlugs}
        />
        <NiazMapPersianGulfLabel />
        {children}
      </NiazMapLibreCore>
      </IranMapThemeProvider>
    </div>
  );
}
