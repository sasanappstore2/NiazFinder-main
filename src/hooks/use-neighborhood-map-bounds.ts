'use client';

import { useEffect, useState } from 'react';
import type { BusinessMapBbox } from '@/lib/business/map-pins-types';
import { resolveNeighborhoodsMapBounds } from '@/lib/map/location-viewport-resolver';
import { unionNeighborhoodBbox } from '@/lib/map/iran/neighborhood-boundaries';
import type { NeighborhoodGeoProperties } from '@/lib/neighborhoods/geo-types';
import type { Feature, Polygon } from 'geojson';

export function useNeighborhoodMapBounds(
  citySlug: string | null,
  neighborhoodSlugs: string[]
): BusinessMapBbox | null {
  const [bounds, setBounds] = useState<BusinessMapBbox | null>(null);
  const idsKey = neighborhoodSlugs.join(',');

  useEffect(() => {
    if (!citySlug || neighborhoodSlugs.length === 0) {
      setBounds(null);
      return;
    }

    let cancelled = false;

    void resolveNeighborhoodsMapBounds(citySlug, neighborhoodSlugs).then((chunkBounds) => {
      if (cancelled) return;
      if (chunkBounds) {
        setBounds(chunkBounds);
        return;
      }

      const params = new URLSearchParams({
        cityId: citySlug,
        ids: neighborhoodSlugs.join(','),
      });

      void fetch(`/api/locations/neighborhoods/geo?${params}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (cancelled || !data?.features) return;
          const features = data.features as Feature<Polygon, NeighborhoodGeoProperties>[];
          setBounds(unionNeighborhoodBbox(features));
        })
        .catch(() => {
          if (!cancelled) setBounds(null);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [citySlug, idsKey, neighborhoodSlugs]);

  return bounds;
}
