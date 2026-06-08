'use client';

import { useEffect } from 'react';
import { useNiazMapRef } from '@/components/map/mapbox/NiazMapContext';
import type { BusinessMapBbox } from '@/lib/business/map-pins-types';
import { applyIranNationalViewport } from '@/lib/map/iran/apply-national-viewport';
import { IRAN_VIEW_BOUNDS_LNG_LAT } from '@/lib/map/iran/viewport-geo';
import { resolveMapMinZoom } from '@/lib/map/mapbox/config';
import type { MapViewportScopeKind } from '@/lib/business/map-viewport-scope';

export function NiazMapViewportScope({
  viewportBounds,
  scopeKind,
  neighborhoodBounds = null,
}: {
  viewportBounds: BusinessMapBbox | null;
  scopeKind: MapViewportScopeKind;
  /** @deprecated Kept for call-site compatibility; framing uses viewportBounds only. */
  citySlugs?: string[];
  neighborhoodBounds?: BusinessMapBbox | null;
}) {
  const mapRef = useNiazMapRef();

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const apply = () => {
      const activeBounds = neighborhoodBounds ?? viewportBounds;

      if (!activeBounds || scopeKind === 'national') {
        applyIranNationalViewport(map);
        return;
      }

      const isNeighborhood = Boolean(neighborhoodBounds);

      // Frame city/province/neighborhood once; keep Iran pan limits and free zoom.
      map.setMaxBounds(IRAN_VIEW_BOUNDS_LNG_LAT);
      map.setMinZoom(resolveMapMinZoom());

      map.fitBounds(
        [
          [activeBounds.west, activeBounds.south],
          [activeBounds.east, activeBounds.north],
        ],
        {
          padding: isNeighborhood ? 32 : scopeKind === 'city' ? 48 : 40,
          maxZoom: isNeighborhood ? 14 : 11,
          duration: 0,
        }
      );
    };

    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);

    return () => {
      map.setMaxBounds(IRAN_VIEW_BOUNDS_LNG_LAT);
      map.setMinZoom(resolveMapMinZoom());
    };
  }, [mapRef, viewportBounds, neighborhoodBounds, scopeKind]);

  return null;
}
