'use client';

import { useEffect } from 'react';
import { NiazMapLayer, NiazMapSource } from '@/components/map/maplibre/map-source-layer';
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

    const pad = scopeKind === 'city' ? 0.05 : 0.03;
    const latPad = (activeBounds.north - activeBounds.south) * pad;
    const lngPad = (activeBounds.east - activeBounds.west) * pad;
    const maxBounds: [[number, number], [number, number]] = [
      [activeBounds.west - lngPad, activeBounds.south - latPad],
      [activeBounds.east + lngPad, activeBounds.north + latPad],
    ];

    const apply = () => {
      map.setMaxBounds(maxBounds);
      map.fitBounds(
        [
          [activeBounds.west, activeBounds.south],
          [activeBounds.east, activeBounds.north],
        ],
        {
          padding: neighborhoodBounds ? 40 : 24,
          maxZoom: neighborhoodBounds ? 15 : 14,
          duration: 0,
        }
      );
      const zoom = map.getZoom();
      const needsLabelZoom =
        scopeKind === 'city' || neighborhoodBounds != null;
      if (Number.isFinite(zoom) && needsLabelZoom) {
        const labelReadableZoom = 12;
        const minZoom = Math.max(labelReadableZoom, zoom - 1);
        map.setMinZoom(minZoom);
        if (zoom < labelReadableZoom) {
          map.setZoom(labelReadableZoom);
        }
      }
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

  if (!activeBounds) return null;

  const geojson = {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'Polygon' as const,
      coordinates: [
        [
          [activeBounds.west, activeBounds.south],
          [activeBounds.east, activeBounds.south],
          [activeBounds.east, activeBounds.north],
          [activeBounds.west, activeBounds.north],
          [activeBounds.west, activeBounds.south],
        ],
      ],
    },
  };

  return (
    <NiazMapSource id="city-scope" type="geojson" data={geojson}>
      <NiazMapLayer
        id="city-scope-fill"
        type="fill"
        paint={{ 'fill-color': '#059669', 'fill-opacity': 0.05 }}
      />
      <NiazMapLayer
        id="city-scope-line"
        type="line"
        paint={{
          'line-color': '#059669',
          'line-width': 2,
          'line-dasharray': [2, 1.5],
          'line-opacity': 0.5,
        }}
      />
    </NiazMapSource>
  );
}
