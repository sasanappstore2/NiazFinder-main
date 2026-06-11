'use client';

import { useMemo, useRef } from 'react';
import Map, { AttributionControl, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  MASHHAD_DIVAR_MAX_ZOOM,
  MASHHAD_DIVAR_MIN_ZOOM,
  MASHHAD_MAP_CENTER,
  MASHHAD_MAX_BOUNDS,
} from '@/lib/map/mashhad/bounds';
import { buildMashhadDivarStyle, MASHHAD_DIVAR_ATTRIBUTION } from '@/lib/map/mashhad/divar-style';
import { NiazMapControls } from '@/components/map/mapbox/NiazMapControls';
import { cn } from '@/lib/utils';
import '@/styles/map/mashhad-divar-map.css';

export function MashhadDivarTestMap({ className }: { className?: string }) {
  const mapRef = useRef<MapRef>(null);
  const mapStyle = useMemo(() => buildMashhadDivarStyle(), []);

  return (
    <div className={cn('mashhad-divar-map relative h-full w-full', className)}>
      <Map
        ref={mapRef}
        mapStyle={mapStyle}
        initialViewState={{
          longitude: MASHHAD_MAP_CENTER.lng,
          latitude: MASHHAD_MAP_CENTER.lat,
          zoom: 13.2,
        }}
        style={{ width: '100%', height: '100%' }}
        minZoom={MASHHAD_DIVAR_MIN_ZOOM}
        maxZoom={MASHHAD_DIVAR_MAX_ZOOM}
        maxBounds={MASHHAD_MAX_BOUNDS}
        scrollZoom
        dragPan
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
        attributionControl={false}
        reuseMaps
      >
        <AttributionControl
          compact
          customAttribution={MASHHAD_DIVAR_ATTRIBUTION}
          position="bottom-left"
        />
      </Map>
      <NiazMapControls mapRef={mapRef} />
      <div className="mashhad-divar-map__badge pointer-events-none absolute top-3 right-3 z-[400] rounded-full px-3 py-1.5 text-[12px] font-medium">
        تست مشهد — استایل دیوار
      </div>
    </div>
  );
}
