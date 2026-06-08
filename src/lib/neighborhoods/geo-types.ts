import type { Feature, FeatureCollection, Polygon } from 'geojson';
import type { NeighborhoodGeoSource } from '@/lib/neighborhoods/catalog-types';

export type NeighborhoodGeoProperties = {
  id: string;
  name: string;
  geoSource: NeighborhoodGeoSource;
  selected?: boolean;
};

export type CityNeighborhoodGeoCollection = FeatureCollection<
  Polygon,
  NeighborhoodGeoProperties
>;

export interface NeighborhoodGeoManifestEntry {
  cityId: string;
  featureCount: number;
  osm: number;
  divar: number;
  synthetic: number;
  manual: number;
}

export interface NeighborhoodGeoManifest {
  version: number;
  updatedAt: string;
  cities: Record<string, NeighborhoodGeoManifestEntry>;
  totalFeatures: number;
}
