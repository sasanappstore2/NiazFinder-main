'use client';

import { useEffect, useRef } from 'react';
import { useNiazMapRef } from '@/components/map/mapbox/NiazMapContext';

/** Update picked location only after the user pans the map (not on zoom). */
export function NiazMapIntakeCenterSync({
  onCenterChange,
  enabled = true,
}: {
  onCenterChange: (coords: { lat: number; lng: number }) => void;
  enabled?: boolean;
}) {
  const mapRef = useNiazMapRef();
  const onCenterChangeRef = useRef(onCenterChange);
  onCenterChangeRef.current = onCenterChange;

  useEffect(() => {
    if (!enabled || !mapRef?.current) return;
    const map = mapRef.current.getMap?.();
    if (!map) return;

    const sync = () => {
      const c = map.getCenter();
      onCenterChangeRef.current({ lat: c.lat, lng: c.lng });
    };

    map.on('dragend', sync);

    return () => {
      map.off('dragend', sync);
    };
  }, [enabled, mapRef]);

  return null;
}
