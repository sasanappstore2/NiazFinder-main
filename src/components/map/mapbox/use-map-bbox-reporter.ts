'use client';

import { useCallback, useRef } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { normalizeMapBbox } from '@/lib/business/map-bbox';

export function useMapBboxReporter(
  onBboxChange: (bbox: { west: number; south: number; east: number; north: number }) => void
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (mapRef: MapRef) => {
      const map = mapRef.getMap();
      const canvas = map.getCanvas();
      if (canvas.clientWidth <= 0 || canvas.clientHeight <= 0) return;

      const report = () => {
        const b = map.getBounds();
        if (!b) return;
        const bbox = normalizeMapBbox({
          west: b.getWest(),
          south: b.getSouth(),
          east: b.getEast(),
          north: b.getNorth(),
        });
        if (bbox) onBboxChange(bbox);
      };

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(report, 280);
    },
    [onBboxChange]
  );
}
