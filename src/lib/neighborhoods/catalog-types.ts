/** Catalog file shape (no Node/fs — safe to import types on client). */

export type NeighborhoodGeoSource = 'osm' | 'divar' | 'synthetic' | 'manual';

export interface NeighborhoodCentroid {
  lat: number;
  lng: number;
}

export interface NeighborhoodBbox {
  south: number;
  north: number;
  west: number;
  east: number;
}

export interface CatalogNeighborhood {
  id: string;
  name: string;
  nameEn?: string;
  areas?: string[];
  centroid?: NeighborhoodCentroid;
  bbox?: NeighborhoodBbox;
  geoSource?: NeighborhoodGeoSource;
}

export interface CityNeighborhoodCatalog {
  cityId: string;
  cityName?: string;
  source: 'divar' | 'manual' | 'osm';
  importedAt: string;
  emptyOnDivar?: boolean;
  neighborhoods: CatalogNeighborhood[];
}

export interface NeighborhoodManifest {
  version: number;
  updatedAt: string;
  citiesWithNeighborhoods: number;
  totalNeighborhoods: number;
  /** cityId → neighborhood count (for hasNeighborhoods without reading full catalog). */
  counts: Record<string, number>;
  /** Cities mapped but Divar returned zero districts. */
  emptyOnDivar?: string[];
  /** Admin cities with no Divar mapping. */
  unmapped?: string[];
}
