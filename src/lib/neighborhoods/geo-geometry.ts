import type { Feature, Polygon } from 'geojson';
import type { NeighborhoodBbox } from '@/lib/neighborhoods/catalog-types';

/** Client-safe polygon bbox helpers (no Node/fs). */

export function bboxFromPolygonFeature(feature: Feature<Polygon>): NeighborhoodBbox {
  const coords = feature.geometry.coordinates[0] ?? [];
  let south = Infinity;
  let north = -Infinity;
  let west = Infinity;
  let east = -Infinity;
  for (const [lng, lat] of coords) {
    south = Math.min(south, lat);
    north = Math.max(north, lat);
    west = Math.min(west, lng);
    east = Math.max(east, lng);
  }
  return { south, north, west, east };
}

export function centroidFromBbox(bbox: NeighborhoodBbox): { lat: number; lng: number } {
  return {
    lat: (bbox.south + bbox.north) / 2,
    lng: (bbox.west + bbox.east) / 2,
  };
}
