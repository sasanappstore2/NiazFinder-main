'use client';

import { NiazMapAdminBoundaries } from '@/components/map/mapbox/NiazMapAdminBoundaries';
import { NiazMapNeighborhoodBoundaries } from '@/components/map/mapbox/NiazMapNeighborhoodBoundaries';
import { NiazMapPersianGulfLabel } from '@/components/map/mapbox/NiazMapPersianGulfLabel';
import { NiazMapViewportScope } from '@/components/map/mapbox/NiazMapViewportScope';
import type { BusinessMapBbox } from '@/lib/business/map-pins-types';
import type { MapViewportScopeKind } from '@/lib/business/map-viewport-scope';

export type IranDivarMapOverlaysProps = {
  provinceIds: string[];
  citySlugs: string[];
  scopeKind: MapViewportScopeKind;
  viewportBounds: BusinessMapBbox | null;
  singleCitySlug?: string | null;
  neighborhoodSlugs?: string[];
  neighborhoodBounds?: BusinessMapBbox | null;
};

/** Shared admin / scope / label layers for vector and raster Iran Divar maps. */
export function IranDivarMapOverlays({
  provinceIds,
  citySlugs,
  scopeKind,
  viewportBounds,
  singleCitySlug = null,
  neighborhoodSlugs = [],
  neighborhoodBounds = null,
}: IranDivarMapOverlaysProps) {
  return (
    <>
      <NiazMapAdminBoundaries
        provinceIds={provinceIds}
        citySlugs={citySlugs}
        scopeKind={scopeKind}
      />
      <NiazMapNeighborhoodBoundaries
        citySlug={singleCitySlug}
        neighborhoodSlugs={neighborhoodSlugs}
      />
      <NiazMapViewportScope
        viewportBounds={viewportBounds}
        scopeKind={scopeKind}
        citySlugs={citySlugs}
        neighborhoodBounds={neighborhoodBounds}
      />
      <NiazMapPersianGulfLabel />
    </>
  );
}
