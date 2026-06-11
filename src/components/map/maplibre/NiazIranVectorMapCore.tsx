'use client';

import { useCallback, useMemo, useState } from 'react';
import { NiazIranRasterMapCore } from '@/components/map/maplibre/NiazIranRasterMapCore';
import { IranDivarMapOverlays } from '@/components/map/iran/IranDivarMapOverlays';
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
  const [useRasterFallback, setUseRasterFallback] = useState(false);
  const { theme, ready, mapStyle, mapKey: themedMapKey, loadingColor } =
    useIranDivarMapTheme(baseMapKey);

  const overlayProps = useMemo(
    () => ({
      provinceIds: config.provinceIds,
      citySlugs: config.citySlugs.length > 0 ? config.citySlugs : citySlugs,
      scopeKind: config.scopeKind,
      viewportBounds: config.viewportBounds,
      singleCitySlug: citySlugs.length === 1 ? citySlugs[0]! : null,
    }),
    [config, citySlugs]
  );

  const handleMapError = useCallback(
    (error: unknown) => {
      console.error('[map] vector failed, switching to raster', {
        error,
        mapKey: baseMapKey,
        citySlugs,
        provinceSlugs,
        detail,
      });
      setUseRasterFallback(true);
    },
    [baseMapKey, citySlugs, provinceSlugs, detail]
  );

  const mapChildren = (
    <>
      <IranDivarMapOverlays {...overlayProps} />
      {children}
    </>
  );

  if (!ready || !mapStyle) {
    return (
      <div
        data-map-theme={theme}
        className={cn(
          'iran-divar-map business-browse-map business-browse-map--iran-divar relative h-full w-full',
          className
        )}
        style={{ ...style, backgroundColor: loadingColor }}
      />
    );
  }

  if (useRasterFallback) {
    return (
      <NiazIranRasterMapCore
        center={center}
        detail={detail}
        interactive={interactive}
        mapKey={`${mapKey ?? baseMapKey}-raster-fallback`}
        className={className}
        style={style}
        onMoveEnd={onMoveEnd}
        onMapClick={onMapClick}
        overlay={overlay}
      >
        {mapChildren}
      </NiazIranRasterMapCore>
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
        onError={handleMapError}
        overlay={overlay}
      >
        {mapChildren}
      </NiazMapLibreCore>
      </IranMapThemeProvider>
    </div>
  );
}
