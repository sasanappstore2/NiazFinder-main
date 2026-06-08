'use client';

import { useEffect } from 'react';
import { useNiazMapRef } from '@/components/map/mapbox/NiazMapContext';

export function NiazMapRecenter({
  center,
  zoom,
}: {
  center: { lat: number; lng: number };
  zoom: number;
}) {
  const mapRef = useNiazMapRef();

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.flyTo({ center: [center.lng, center.lat], zoom, duration: 500 });
  }, [mapRef, center.lat, center.lng, zoom]);

  return null;
}
