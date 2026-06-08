'use client';

import { useMemo, useRef } from 'react';
import Map, { type MapRef } from 'react-map-gl/mapbox';
import { MapEngineContext } from '@/components/map/MapEngineContext';
import { NiazMapRefContext } from '@/components/map/mapbox/NiazMapContext';
import type { StyleSpecification as MapboxStyleSpecification } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  getMapboxAccessToken,
  IRAN_MAX_BOUNDS_LNG_LAT,
  resolveMapEngine,
  resolveMapMaxZoom,
  resolveMapMinZoom,
  resolveMapStyle,
} from '@/lib/map/mapbox/config';
import { NiazIranVectorMapCore } from '@/components/map/maplibre/NiazIranVectorMapCore';
import { useResolvedThemeMode } from '@/hooks/use-resolved-theme-mode';
import { cn } from '@/lib/utils';
import '@/styles/business/business-map.css';

export type NiazMapCoreProps = {
  center: { lat: number; lng: number; zoom: number };
  detail?: 'browse' | 'picker';
  interactive?: boolean;
  mapKey?: string;
  className?: string;
  style?: React.CSSProperties;
  onMoveEnd?: (map: MapRef) => void;
  onMapClick?: (lat: number, lng: number) => void;
  children?: React.ReactNode;
  overlay?: React.ReactNode;
};

export function NiazMapCore({
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
  const mapRef = useRef<MapRef>(null);
  const theme = useResolvedThemeMode() ?? 'light';
  const accessToken = getMapboxAccessToken();
  const mapStyle = useMemo(() => resolveMapStyle(theme), [theme]);

  if (resolveMapEngine() === 'maplibre') {
    return (
      <NiazIranVectorMapCore
        center={center}
        detail={detail}
        interactive={interactive}
        mapKey={mapKey}
        className={className}
        style={style}
        onMoveEnd={onMoveEnd}
        onMapClick={onMapClick}
        overlay={overlay}
      >
        {children}
      </NiazIranVectorMapCore>
    );
  }

  return (
    <div data-map-theme={theme} className={cn('relative h-full w-full', className)} style={style}>
      <MapEngineContext.Provider value="mapbox">
      <NiazMapRefContext.Provider value={mapRef}>
        <Map
          key={mapKey ?? `${theme}-${detail}`}
          ref={mapRef}
          mapboxAccessToken={accessToken}
          mapStyle={mapStyle as string | MapboxStyleSpecification}
          initialViewState={{
            longitude: center.lng,
            latitude: center.lat,
            zoom: center.zoom,
          }}
          style={{ width: '100%', height: '100%' }}
          minZoom={resolveMapMinZoom()}
          maxZoom={resolveMapMaxZoom(detail)}
          maxBounds={IRAN_MAX_BOUNDS_LNG_LAT}
          scrollZoom={interactive}
          dragPan={interactive}
          dragRotate={false}
          pitchWithRotate={false}
          touchPitch={false}
          attributionControl={false}
          reuseMaps
          onMoveEnd={() => {
            if (mapRef.current && onMoveEnd) onMoveEnd(mapRef.current);
          }}
          onLoad={() => {
            if (mapRef.current && onMoveEnd) onMoveEnd(mapRef.current);
          }}
          onClick={
            onMapClick
              ? (e) => {
                  onMapClick(e.lngLat.lat, e.lngLat.lng);
                }
              : undefined
          }
        >
          {children}
        </Map>
        {overlay}
      </NiazMapRefContext.Provider>
      </MapEngineContext.Provider>
    </div>
  );
}
