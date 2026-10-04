'use client';

import { useEffect } from 'react';
import { useNiazMapRef } from '@/components/map/mapbox/NiazMapContext';
import { intakeZoomForRadiusM } from '@/lib/map/intake-area-circle';
import { IRAN_MAX_BOUNDS_LNG_LAT, resolveMapMinZoom } from '@/lib/map/mapbox/config';

/** Frame catalog neighborhood: centroid + zoom so the on-screen circle matches bbox radius. */
export function NiazMapIntakeAreaFrame({
  center,
  radiusM,
  frameKey,
}: {
  center: { lat: number; lng: number };
  radiusM: number;
  frameKey: string;
}) {
  const mapRef = useNiazMapRef();

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
    };

    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [center.lat, center.lng, frameKey, mapRef, radiusM]);

  return null;
}
