'use client';

import { useEffect, useRef } from 'react';
import { useNiazMapRef } from '@/components/map/mapbox/NiazMapContext';
import { intakeZoomForRadiusM } from '@/lib/map/intake-area-circle';
import { IRAN_MAX_BOUNDS_LNG_LAT, resolveMapMinZoom } from '@/lib/map/mapbox/config';

/** Frame catalog neighborhood: centroid + zoom so the on-screen circle matches bbox radius. */
export function NiazMapIntakeAreaFrame({
  center,
  radiusM,
  frameKey,
  onFramed,
}: {
  center: { lat: number; lng: number };
  radiusM: number;
  frameKey: string;
  onFramed: (coords: { lat: number; lng: number }) => void;
}) {
  const mapRef = useNiazMapRef();
  const onFramedRef = useRef(onFramed);
  useEffect(() => {
    onFramedRef.current = onFramed;
  }, [onFramed]);

  useEffect(() => {
    if (!mapRef?.current || radiusM <= 0) return;
    const map = mapRef.current.getMap?.();
    if (!map) return;

    const apply = () => {
      const container = map.getContainer();
      const zoom = intakeZoomForRadiusM(center.lat, radiusM, {
        width: container.clientWidth,
        height: container.clientHeight,
      });
      map.setMaxBounds(IRAN_MAX_BOUNDS_LNG_LAT);
      map.setMinZoom(resolveMapMinZoom());
      map.jumpTo({ center: [center.lng, center.lat], zoom });
      onFramedRef.current({ lat: center.lat, lng: center.lng });
    };

    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [center.lat, center.lng, frameKey, mapRef, radiusM]);

  return null;
}
