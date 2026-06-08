'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ensureMapLibreRtlPlugin } from '@/lib/map/maplibre/ensure-rtl-plugin';
import { NiazMapResizeFix } from '@/components/map/mapbox/NiazMapResizeFix';
import Map, { AttributionControl, type MapRef } from 'react-map-gl/maplibre';
import type { StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapEngineContext } from '@/components/map/MapEngineContext';
import { NiazMapRefContext } from '@/components/map/mapbox/NiazMapContext';
import type { MapRef as MapboxMapRef } from 'react-map-gl/mapbox';
import { cn } from '@/lib/utils';

export type NiazMapLibreCoreProps = {
  center: { lat: number; lng: number; zoom: number };
  mapStyle: StyleSpecification | (() => StyleSpecification);
  minZoom: number;
  maxZoom: number;
  maxBounds: [[number, number], [number, number]];
  mapKey?: string;
  interactive?: boolean;
  className?: string;
  wrapperClassName?: string;
  style?: React.CSSProperties;
  attribution?: string;
  loadingBackground?: string;
  onMoveEnd?: (map: MapboxMapRef) => void;
  onMapClick?: (lat: number, lng: number) => void;
  children?: React.ReactNode;
  overlay?: React.ReactNode;
};

export function NiazMapLibreCore({
  center,
  mapStyle,
  minZoom,
  maxZoom,
  maxBounds,
  mapKey,
  interactive = true,
  className,
  wrapperClassName,
  style,
  attribution,
  loadingBackground = '#181b22',
  onMoveEnd,
  onMapClick,
  children,
  overlay,
}: NiazMapLibreCoreProps) {
  const mapRef = useRef<MapRef>(null);
  const [rtlReady, setRtlReady] = useState(false);
  const resolvedStyle = useMemo(
    () => (typeof mapStyle === 'function' ? mapStyle() : mapStyle),
    [mapStyle]
  );

  useEffect(() => {
    let cancelled = false;
    ensureMapLibreRtlPlugin()
      .then(() => {
        if (!cancelled) setRtlReady(true);
      })
      .catch(() => {
        if (!cancelled) setRtlReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!rtlReady) {
    return (
      <div
        className={cn('relative h-full w-full animate-pulse', wrapperClassName, className)}
        style={{ ...style, backgroundColor: loadingBackground }}
      />
    );
  }

  return (
    <div className={cn('relative h-full w-full', wrapperClassName, className)} style={style}>
      <MapEngineContext.Provider value="maplibre">
      <NiazMapRefContext.Provider value={mapRef as React.RefObject<MapboxMapRef | null>}>
        <Map
          key={mapKey ?? 'maplibre'}
          ref={mapRef}
          mapStyle={resolvedStyle}
          initialViewState={{
            longitude: center.lng,
            latitude: center.lat,
            zoom: center.zoom,
          }}
          style={{ width: '100%', height: '100%' }}
          minZoom={minZoom}
          maxZoom={maxZoom}
          maxBounds={maxBounds}
          scrollZoom={interactive}
          dragPan={interactive}
          dragRotate={false}
          pitchWithRotate={false}
          touchPitch={false}
          attributionControl={false}
          reuseMaps
          onMoveEnd={() => {
            if (mapRef.current && onMoveEnd) {
              onMoveEnd(mapRef.current as unknown as MapboxMapRef);
            }
          }}
          onLoad={() => {
            mapRef.current?.getMap()?.resize();
            if (mapRef.current && onMoveEnd) {
              onMoveEnd(mapRef.current as unknown as MapboxMapRef);
            }
          }}
          onClick={
            onMapClick
              ? (e) => {
                  onMapClick(e.lngLat.lat, e.lngLat.lng);
                }
              : undefined
          }
        >
          <NiazMapResizeFix />
          {children}
          {attribution ? (
            <AttributionControl compact customAttribution={attribution} position="bottom-left" />
          ) : null}
        </Map>
        {overlay}
      </NiazMapRefContext.Provider>
      </MapEngineContext.Provider>
    </div>
  );
}
