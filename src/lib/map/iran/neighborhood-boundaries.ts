import type { Feature, FeatureCollection, Polygon } from 'geojson';
import type { BusinessMapBbox } from '@/lib/business/map-pins-types';
import type { NeighborhoodGeoProperties } from '@/lib/neighborhoods/geo-types';
import { bboxFromPolygonFeature } from '@/lib/neighborhoods/geo-geometry';

export function buildNeighborhoodBoundariesFeatureCollection(opts: {
  features: Feature<Polygon, NeighborhoodGeoProperties>[];
  neighborhoodSlugs: string[];
}): FeatureCollection<Polygon, NeighborhoodGeoProperties & { selected: boolean }> {
  const selected = new Set(opts.neighborhoodSlugs.map((s) => s.toLowerCase()));

  const features = opts.features.map((f) => ({
    ...f,
    properties: {
      ...f.properties,
      selected: selected.has(f.properties.id.toLowerCase()),
    },
  }));

  return { type: 'FeatureCollection', features };
}

export function unionNeighborhoodBbox(
  features: Feature<Polygon, NeighborhoodGeoProperties>[]
): BusinessMapBbox | null {
  if (features.length === 0) return null;

  const boxes = features.map((f) => bboxFromPolygonFeature(f));
  return {
    south: Math.min(...boxes.map((b) => b.south)),
    north: Math.max(...boxes.map((b) => b.north)),
    west: Math.min(...boxes.map((b) => b.west)),
    east: Math.max(...boxes.map((b) => b.east)),
  };
}
