/** Shared location types (no Node/fs — safe for client bundles). */

export interface ManagedNeighborhood {
  id: string;
  name: string;
  nameEn?: string;
  /** Streets / sub-areas shown under the neighborhood (Divar-style). */
  areas?: string[];
  centroid?: { lat: number; lng: number };
  bbox?: { south: number; north: number; west: number; east: number };
  geoSource?: 'osm' | 'divar' | 'synthetic' | 'manual';
  isActive: boolean;
  order: number;
}

export interface ManagedCity {
  id: string;
  name: string;
  nameEn: string;
  /** Hub city id for map viewport / metro grouping (شهر مبدا). */
  originCityId?: string;
  isIsland?: boolean;
  isPopular?: boolean;
  isActive: boolean;
  order: number;
  neighborhoods: ManagedNeighborhood[];
  /** Set on public API when catalog has neighborhoods (neighborhoods array omitted). */
  hasNeighborhoods?: boolean;
  neighborhoodCount?: number;
}

export interface ManagedProvince {
  id: string;
  name: string;
  nameEn: string;
  isActive: boolean;
  order: number;
  cities: ManagedCity[];
}

export interface ManagedCountry {
  id: string;
  name: string;
  nameEn: string;
  isActive: boolean;
  provinces: ManagedProvince[];
}

export interface ManagedLocationData {
  countries: ManagedCountry[];
  updatedAt: string;
}
