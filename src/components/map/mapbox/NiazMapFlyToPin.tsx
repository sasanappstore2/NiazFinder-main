'use client';

import { useEffect } from 'react';
import { useNiazMapRef } from '@/components/map/mapbox/NiazMapContext';
import { isValidLatLng } from '@/lib/business/map-coords';

export function NiazMapFlyToPin({
  pin,
}: {
  pin: { id: string; lat: number; lng: number } | null;
}) {
  const mapRef = useNiazMapRef();

  useEffect(() => {
    if (!pin || !isValidLatLng(pin.lat, pin.lng)) return;

    const fly = () => {
      const map = mapRef.current?.getMap();
      if (!map) return;
      const canvas = map.getCanvas();
      if (canvas.clientWidth <= 0 || canvas.clientHeight <= 0) return;
      try {
        map.flyTo({
          center: [pin.lng, pin.lat],
          zoom: Math.max(map.getZoom(), 14),
          duration: 600,
        });
      } catch {
        // Map may not be fully laid out yet (e.g. resizable split panel).
      }
    };

    const map = mapRef.current?.getMap();
    if (!map) return;

    if (map.isStyleLoaded()) fly();
    else map.once('load', fly);

    map.on('resize', fly);
    return () => {
      map.off('resize', fly);
    };
  }, [mapRef, pin?.id, pin?.lat, pin?.lng]);

  return null;
}
