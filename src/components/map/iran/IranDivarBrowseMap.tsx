'use client';

import { useCallback, useMemo, useState } from 'react';
import { NiazIranRasterMapCore } from '@/components/map/maplibre/NiazIranRasterMapCore';
import { NiazMapLibreCore } from '@/components/map/maplibre/NiazMapLibreCore';
import { NiazMapControls } from '@/components/map/mapbox/NiazMapControls';
import { IranDivarMapOverlays } from '@/components/map/iran/IranDivarMapOverlays';
import { useNeighborhoodMapBounds } from '@/hooks/use-neighborhood-map-bounds';
import { NiazMapFlyToPin } from '@/components/map/mapbox/NiazMapFlyToPin';
import { NiazMapClusterLayerMaplibre } from '@/components/map/maplibre/NiazMapClusterLayerMaplibre';
import { useMapBboxReporter } from '@/components/map/mapbox/use-map-bbox-reporter';
import { useNiazMapRef } from '@/components/map/mapbox/NiazMapContext';
import { IranMapThemeProvider } from '@/components/map/iran/IranMapThemeContext';
import { useIranDivarMapTheme } from '@/components/map/iran/useIranDivarMapTheme';
import { resolveIranDivarBrowseConfig } from '@/lib/map/iran/divar-browse-config';
import { IRAN_DIVAR_ATTRIBUTION } from '@/lib/map/iran/divar-style';
import { isValidLatLng } from '@/lib/business/map-coords';
import type { MapPoint } from '@/components/map/mapbox/use-map-clusters';
import { cn } from '@/lib/utils';
import '@/styles/map/iran-divar-map.css';

function MapControlsOverlay({ mobileMode }: { mobileMode?: boolean }) {
  const mapRef = useNiazMapRef();
  return <NiazMapControls mapRef={mapRef} mobileMode={mobileMode} />;
}

export function IranDivarBrowseMap<T extends MapPoint>({
  citySlugs,
  provinceSlugs = [],
  neighborhoodSlugs = [],
  pins,
  selectedPinId,
  selectedPin,
  onSelectPin,
  onBboxChange,
  showPopups = true,
  mobileMode,
  mapKey,
  className,
  getPinProps,
  renderPopup,
}: {
  citySlugs: string[];
  provinceSlugs?: string[];
  neighborhoodSlugs?: string[];
  pins: T[];
  selectedPinId?: string | null;
  selectedPin?: T | null;
  onSelectPin: (pin: T | null) => void;
  onBboxChange: (bbox: { west: number; south: number; east: number; north: number }) => void;
  showPopups?: boolean;
  mobileMode?: boolean;
  mapKey?: string;
  className?: string;
  getPinProps: (pin: T) => {
    selected: boolean;
    verified?: boolean;
    approximate?: boolean;
    color?: string;
  };
  renderPopup: (pin: T) => React.ReactNode;
}) {
  const config = useMemo(
    () => resolveIranDivarBrowseConfig(citySlugs, provinceSlugs),
    [citySlugs, provinceSlugs]
  );
  const singleCitySlug = citySlugs.length === 1 ? citySlugs[0]! : null;
  const neighborhoodBounds = useNeighborhoodMapBounds(singleCitySlug, neighborhoodSlugs);
  const safeSelectedPin =
    selectedPin && isValidLatLng(selectedPin.lat, selectedPin.lng) ? selectedPin : null;
  const reportBbox = useMapBboxReporter(onBboxChange);
  const baseMapKey =
    mapKey ??
    (citySlugs.length > 0
      ? citySlugs.join(',')
      : provinceSlugs.length > 0
        ? `p:${provinceSlugs.join(',')}`
        : 'iran-divar');
  const [useRasterFallback, setUseRasterFallback] = useState(false);
  const { theme, ready, mapStyle, mapKey: themedMapKey, loadingColor } =
    useIranDivarMapTheme(baseMapKey);

  const overlayProps = useMemo(
    () => ({
      provinceIds: config.provinceIds,
      citySlugs: config.citySlugs.length > 0 ? config.citySlugs : citySlugs,
      scopeKind: config.scopeKind,
      viewportBounds: config.viewportBounds,
      singleCitySlug,
      neighborhoodSlugs,
      neighborhoodBounds,
    }),
    [config, citySlugs, singleCitySlug, neighborhoodSlugs, neighborhoodBounds]
  );

  const handleMapError = useCallback(
    (error: unknown) => {
      console.error('[map] vector failed, switching to raster', {
        error,
        mapKey: baseMapKey,
        citySlugs,
        provinceSlugs,
      });
      setUseRasterFallback(true);
    },
    [baseMapKey, citySlugs, provinceSlugs]
  );

  const mapChildren = (
    <>
      <IranDivarMapOverlays {...overlayProps} />
      <NiazMapFlyToPin pin={safeSelectedPin} />
      <NiazMapClusterLayerMaplibre
        points={pins}
        selectedPinId={selectedPinId ?? null}
        onSelectPin={onSelectPin}
        showPopups={showPopups}
        maxZoom={config.clusterMaxZoom}
        getPinProps={getPinProps}
        renderPopup={renderPopup}
      />
    </>
  );

  if (!ready || !mapStyle) {
    return (
      <div
        data-map-theme={theme}
        className={cn('iran-divar-map relative h-full w-full', className)}
        style={{ minHeight: mobileMode ? 280 : 320, backgroundColor: loadingColor }}
      />
    );
  }

  if (useRasterFallback) {
    return (
      <NiazIranRasterMapCore
        center={config.center}
        detail="browse"
        mapKey={`${baseMapKey}-raster-fallback`}
        className={cn('iran-divar-map relative h-full w-full', className)}
        style={{ minHeight: mobileMode ? 280 : 320 }}
        onMoveEnd={reportBbox}
        overlay={<MapControlsOverlay mobileMode={mobileMode} />}
      >
        {mapChildren}
      </NiazIranRasterMapCore>
    );
  }

  return (
    <div data-map-theme={theme} className={cn('iran-divar-map relative h-full w-full', className)}>
      <IranMapThemeProvider theme={theme}>
      <NiazMapLibreCore
        center={config.center}
        mapStyle={mapStyle}
        minZoom={config.minZoom}
        maxZoom={config.maxZoom}
        maxBounds={config.maxBounds}
        mapKey={themedMapKey}
        loadingBackground={loadingColor}
        className={cn('z-0 min-h-[320px] h-full')}
        style={{ minHeight: mobileMode ? 280 : 320 }}
        attribution={IRAN_DIVAR_ATTRIBUTION}
        onMoveEnd={reportBbox}
        onError={handleMapError}
        overlay={<MapControlsOverlay mobileMode={mobileMode} />}
      >
        {mapChildren}
      </NiazMapLibreCore>
      </IranMapThemeProvider>
    </div>
  );
}
