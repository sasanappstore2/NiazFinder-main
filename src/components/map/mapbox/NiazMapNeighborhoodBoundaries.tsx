'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FeatureCollection, Polygon } from 'geojson';
import type { FilterSpecification } from 'maplibre-gl';
import { useIranMapTheme } from '@/components/map/iran/IranMapThemeContext';
import { NiazMapLayer, NiazMapSource } from '@/components/map/maplibre/map-source-layer';
import type { NeighborhoodGeoProperties } from '@/lib/neighborhoods/geo-types';
import { IRAN_MAP_ZOOM } from '@/lib/map/iran/zoom-tiers';

type NeighborhoodGeoCollection = FeatureCollection<
  Polygon,
  NeighborhoodGeoProperties & { selected: boolean }
>;

export function NiazMapNeighborhoodBoundaries({
  citySlug,
  neighborhoodSlugs,
}: {
  citySlug: string | null;
  neighborhoodSlugs: string[];
}) {
  const theme = useIranMapTheme();
  const selectedLineColor = theme === 'light' ? '#10b981' : '#39ff14';
  const [geo, setGeo] = useState<NeighborhoodGeoCollection | null>(null);

  const idsKey = neighborhoodSlugs.join(',');

  useEffect(() => {
    if (!citySlug || neighborhoodSlugs.length === 0) {
      setGeo(null);
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams({
      cityId: citySlug,
      ids: neighborhoodSlugs.join(','),
    });

    void fetch(`/api/locations/neighborhoods/geo?${params}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setGeo(data as NeighborhoodGeoCollection);
      })
      .catch(() => {
        if (!cancelled) setGeo(null);
      });

    return () => {
      cancelled = true;
    };
  }, [citySlug, idsKey, neighborhoodSlugs]);

  const selectedFilter = useMemo((): FilterSpecification => {
    return ['==', ['get', 'selected'], true];
  }, []);

  if (!geo?.features?.length) return null;

  return (
    <NiazMapSource id="neighborhood-boundaries" type="geojson" data={geo}>
      <NiazMapLayer
        id="neighborhood-line-selected"
        type="line"
        minzoom={IRAN_MAP_ZOOM.LOCAL}
        filter={selectedFilter}
        paint={{
          'line-color': selectedLineColor,
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1.2, 14, 2.2, 16, 2.8],
          'line-opacity': 0.85,
        }}
      />
    </NiazMapSource>
  );
}
