/** Internal normalized property schema — provider-agnostic. */

export type PropertyDealType =
  | 'sell'
  | 'rent_rahn_ejare'
  | 'rent_rahn_full'
  | 'rent_short_term'
  | 'unknown';

export type PropertyKind =
  | 'apartment'
  | 'villa'
  | 'land'
  | 'office'
  | 'shop'
  | 'commercial'
  | 'unknown';

export type PropertyAmenities = {
  parking?: boolean;
  storage?: boolean;
  elevator?: boolean;
  securityDoor?: boolean;
  exchangeable?: boolean;
};

/** Raw page artifact — never overwritten after first write. */
export type RawPageRecord = {
  id: string;
  jobId: string;
  url: string;
  canonicalUrl?: string;
  fetchedAt: string;
  provider: string;
  statusCode?: number;
  html?: string;
  markdown?: string;
  metadata?: Record<string, unknown>;
  contentHash: string;
};

/** Structured extraction before normalization. */
export type ExtractedListing = {
  sourceUrl: string;
  externalId?: string;
  raw: Record<string, unknown>;
  extractedAt: string;
  extractor: string;
};

export type NormalizedProperty = {
  id: string;
  jobId: string;
  externalId: string;
  sourceUrl: string;
  sourceSite?: string;
  fileCode?: string;
  title: string;
  description?: string;
  dealType: PropertyDealType;
  propertyKind: PropertyKind;
  categorySlug?: string;
  city?: string;
  neighborhood?: string;
  location?: string;
  price?: string;
  deposit?: string;
  monthlyRent?: string;
  area?: string;
  rooms?: number;
  floor?: number;
  pricePerMeter?: string;
  buildingAge?: number;
  documentType?: string;
  amenities: PropertyAmenities;
  postedAt?: string;
  detailUrl?: string;
  images: string[];
  contentHash: string;
  normalizedAt: string;
};

export type EnrichedProperty = NormalizedProperty & {
  embedding?: number[];
  keywords?: string[];
  geo?: { lat?: number; lng?: number; confidence?: number };
  aiMeta?: Record<string, unknown>;
  enrichedAt?: string;
};

export type StoredProperty = EnrichedProperty & {
  dedupeKey: string;
  duplicateOf?: string;
  duplicateConfidence?: number;
  storedAt: string;
};
