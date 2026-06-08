export type NeedMapPin = {
  id: string;
  slug: string;
  title: string;
  lat: number;
  lng: number;
  city?: string;
  province?: string;
  /** True when pin is placed approximately in the selected neighborhood (no map pin set). */
  approximate?: boolean;
  neighborhoodLabel?: string;
  priority: string;
  budgetMin: number | null;
  budgetMax: number | null;
  categorySlug: string;
  categoryTitle?: string;
  pinColor: string;
  proposalCount: number;
  createdAt: string;
};

export type NeedMapPinsResult = {
  pins: NeedMapPin[];
  total: number;
};
