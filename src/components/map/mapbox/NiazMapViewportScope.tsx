'use client';

import { useEffect } from 'react';
import { useNiazMapRef } from '@/components/map/mapbox/NiazMapContext';
import type { BusinessMapBbox } from '@/lib/business/map-pins-types';
import type { MapViewportScopeKind } from '@/lib/business/map-viewport-scope';
import {
  IRAN_MAX_BOUNDS_LNG_LAT,
  resolveMapMinZoom,
} from '@/lib/map/mapbox/config';

export type NiazMapViewportScopeProps = {
  /** @deprecated Prefer viewportBounds — kept for Mashhad picker maps. */
  cityBounds?: BusinessMapBbox | null;
  viewportBounds?: BusinessMapBbox | null;
  neighborhoodBounds?: BusinessMapBbox | null;
  scopeKind?: MapViewportScopeKind;
  citySlugs?: string[];
};

function resolveActiveBounds(props: NiazMapViewportScopeProps): BusinessMapBbox | null {
  return props.neighborhoodBounds ?? props.viewportBounds ?? props.cityBounds ?? null;
}

export function NiazMapViewportScope({
  cityBounds = null,
  viewportBounds = null,
  neighborhoodBounds = null,
  scopeKind = 'national',
}: NiazMapViewportScopeProps) {
  const mapRef = useNiazMapRef();
  const activeBounds = resolveActiveBounds({ cityBounds, viewportBounds, neighborhoodBounds });

  useEffect(() => {
    if (!mapRef?.current) return;
    const map = mapRef.current.getMap?.();
    if (!map) return;

    if (!activeBounds) {
      map.setMaxBounds(IRAN_MAX_BOUNDS_LNG_LAT);
      map.setMinZoom(resolveMapMinZoom());
      return () => {
        map.setMaxBounds(IRAN_MAX_BOUNDS_LNG_LAT);
        map.setMinZoom(resolveMapMinZoom());
      };
    }

    const apply = () => {
      map.setMaxBounds(IRAN_MAX_BOUNDS_LNG_LAT);
      map.setMinZoom(resolveMapMinZoom());
      map.fitBounds(
        [
          [activeBounds.west, activeBounds.south],
          [activeBounds.east, activeBounds.north],
        ],
        {
          padding: neighborhoodBounds ? 40 : scopeKind === 'city' ? 48 : 32,
          maxZoom: neighborhoodBounds ? 15 : scopeKind === 'city' ? 12 : 14,
          duration: 0,
        }
      );
    };

    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);

    return () => {
      map.setMaxBounds(IRAN_MAX_BOUNDS_LNG_LAT);
      map.setMinZoom(resolveMapMinZoom());
    };
  }, [
    mapRef,
    activeBounds?.south,
    activeBounds?.north,
    activeBounds?.west,
    activeBounds?.east,
    neighborhoodBounds,
    scopeKind,
  ]);

  return null;
}
