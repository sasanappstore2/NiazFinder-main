'use client';

import { useEffect } from 'react';
import { useNiazMapRef } from '@/components/map/mapbox/NiazMapContext';

/** Keeps MapLibre/Mapbox canvas aligned when split panels or mobile sheets resize. */
export function NiazMapResizeFix() {
  const mapRef = useNiazMapRef();

  useEffect(() => {
    let observer: ResizeObserver | undefined;
    let cancelled = false;

    const attach = () => {
      if (cancelled) return;
      const map = mapRef.current?.getMap();
      if (!map) {
        requestAnimationFrame(attach);
        return;
      }

      const resize = () => {
        try {
          map.resize();
        } catch {
          // Map may be tearing down.
        }
      };

      resize();
      observer = new ResizeObserver(() => resize());
      observer.observe(map.getContainer());
    };

    attach();

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [mapRef]);

  return null;
}
