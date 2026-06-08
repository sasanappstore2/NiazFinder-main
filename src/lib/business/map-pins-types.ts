export type BusinessMapPin = {
  id: string;
  profileId: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  city?: string;
  province?: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  logo?: string;
  locationId?: string;
  locationLabel?: string;
};

export type BusinessMapBbox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type BusinessMapPinsResult = {
  pins: BusinessMapPin[];
  total: number;
};
