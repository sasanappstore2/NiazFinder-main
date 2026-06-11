'use client';

import { useMemo } from 'react';
import { NiazMapLibreCore } from '@/components/map/maplibre/NiazMapLibreCore';
import { NiazMapControls } from '@/components/map/mapbox/NiazMapControls';
import { NiazMapViewportScope } from '@/components/map/mapbox/NiazMapViewportScope';
import { NiazMapFlyToPin } from '@/components/map/mapbox/NiazMapFlyToPin';
import { NiazMapClusterLayerMaplibre } from '@/components/map/maplibre/NiazMapClusterLayerMaplibre';
import { useMapBboxReporter } from '@/components/map/mapbox/use-map-bbox-reporter';
import { useNiazMapRef } from '@/components/map/mapbox/NiazMapContext';
import {
  MASHHAD_DIVAR_CLUSTER_MAX_ZOOM,
  MASHHAD_DIVAR_MAX_ZOOM,
  MASHHAD_DIVAR_MIN_ZOOM,
  MASHHAD_MAP_CENTER,
  MASHHAD_MAX_BOUNDS,
} from '@/lib/map/mashhad/bounds';
import { buildMashhadDivarStyle, MASHHAD_DIVAR_ATTRIBUTION } from '@/lib/map/mashhad/divar-style';
import { resolveBusinessMapCityBounds } from '@/lib/business/map-city-bounds';
import { isValidLatLng } from '@/lib/business/map-coords';
import type { MapPoint } from '@/components/map/mapbox/use-map-clusters';
import { cn } from '@/lib/utils';
import '@/styles/map/mashhad-divar-map.css';

function MapControlsOverlay({ mobileMode }: { mobileMode?: boolean }) {
  const mapRef = useNiazMapRef();
  return <NiazMapControls mapRef={mapRef} mobileMode={mobileMode} />;
}

export function MashhadDivarBrowseMap<T extends MapPoint>({
  pins,
  selectedPinId,
  selectedPin,
  onSelectPin,
  onBboxChange,
  showPopups = true,
  mobileMode,
  mapKey = 'mashhad-divar',
  className,
  getPinProps,
  renderPopup,
}: {
  pins: T[];
  selectedPinId?: string | null;
  selectedPin?: T | null;
  onSelectPin: (pin: T | null) => void;
  onBboxChange: (bbox: { west: number; south: number; east: number; north: number }) => void;
  showPopups?: boolean;
  mobileMode?: boolean;
  mapKey?: string;
  className?: string;
  getPinProps: (pin: T) => { selected: boolean; verified?: boolean; color?: string };
  renderPopup: (pin: T) => React.ReactNode;
}) {
  const cityBounds = useMemo(() => resolveBusinessMapCityBounds(['mashhad']), []);
  const safeSelectedPin =
    selectedPin && isValidLatLng(selectedPin.lat, selectedPin.lng) ? selectedPin : null;
  const reportBbox = useMapBboxReporter(onBboxChange);

  return (
    <NiazMapLibreCore
      center={MASHHAD_MAP_CENTER}
      mapStyle={buildMashhadDivarStyle}
      minZoom={MASHHAD_DIVAR_MIN_ZOOM}
      maxZoom={MASHHAD_DIVAR_MAX_ZOOM}
      maxBounds={MASHHAD_MAX_BOUNDS}
      mapKey={mapKey}
      wrapperClassName="mashhad-divar-map"
      className={cn('z-0 min-h-[320px]', className)}
      style={{ minHeight: mobileMode ? 280 : 320 }}
      attribution={MASHHAD_DIVAR_ATTRIBUTION}
      onMoveEnd={reportBbox}
      overlay={<MapControlsOverlay mobileMode={mobileMode} />}
    >
      <NiazMapViewportScope cityBounds={cityBounds} />
      <NiazMapFlyToPin pin={safeSelectedPin} />
      <NiazMapClusterLayerMaplibre
        points={pins}
        selectedPinId={selectedPinId ?? null}
        onSelectPin={onSelectPin}
        showPopups={showPopups}
        maxZoom={MASHHAD_DIVAR_CLUSTER_MAX_ZOOM}
        getPinProps={getPinProps}
        renderPopup={renderPopup}
      />
    </NiazMapLibreCore>
  );
}
