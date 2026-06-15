import type { CatalogNeighborhood } from '@/lib/neighborhoods/catalog-types';
import { centroidFromBbox } from '@/lib/neighborhoods/geo-geometry';

export type CityGeoFromCatalog = {
  lat: number;
  lng: number;
  bounds: { south: number; north: number; west: number; east: number };
  pinBboxDelta: { lat: number; lng: number };
};

function neighborhoodCenter(n: CatalogNeighborhood): { lat: number; lng: number } | null {
  if (n.centroid) return n.centroid;
  if (n.bbox) return centroidFromBbox(n.bbox);
  return null;
}

/** Geographic center and extent from neighborhood catalog (OSM/Divar polygons). */
export function computeCityGeoFromCatalogNeighborhoods(
  neighborhoods: CatalogNeighborhood[]
): CityGeoFromCatalog | null {
  if (neighborhoods.length === 0) return null;

  let south = Infinity;
  let north = -Infinity;
  let west = Infinity;
  let east = -Infinity;
  let sumLat = 0;
  let sumLng = 0;
  let count = 0;

  for (const n of neighborhoods) {
    const center = neighborhoodCenter(n);
    if (center) {
      sumLat += center.lat;
      sumLng += center.lng;
      count += 1;
    }
    if (n.bbox) {
      south = Math.min(south, n.bbox.south);
      north = Math.max(north, n.bbox.north);
      west = Math.min(west, n.bbox.west);
      east = Math.max(east, n.bbox.east);
    } else if (center) {
      const pad = 0.005;
      south = Math.min(south, center.lat - pad);
      north = Math.max(north, center.lat + pad);
      west = Math.min(west, center.lng - pad);
      east = Math.max(east, center.lng + pad);
    }
  }

  if (count === 0 || !Number.isFinite(south)) return null;

  const lat = sumLat / count;
  const lng = sumLng / count;
  const pinBboxDelta = {
    lat: Math.max((north - south) / 2, 0.05),
    lng: Math.max((east - west) / 2, 0.05),
  };

  return {
    lat,
    lng,
    bounds: { south, north, west, east },
    pinBboxDelta,
  };
}
