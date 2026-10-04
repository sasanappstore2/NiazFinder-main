import type { EnrichedProperty, NormalizedProperty } from '../types/property';

export type DedupeSignal =
  | 'exact_hash'
  | 'url'
  | 'canonical_url'
  | 'external_id'
  | 'image_hash'
  | 'location'
  | 'address_similarity'
  | 'title'
  | 'title_similarity'
  | 'price'
  | 'price_similarity'
  | 'embedding'
  | 'embedding_similarity'
  | 'geo_proximity';

export type DedupeMatch = {
  propertyId: string;
  confidence: number;
  signals: DedupeSignal[];
};

export interface DedupeEngine {
  check(property: NormalizedProperty): Promise<DedupeMatch | null>;
  register(property: EnrichedProperty): Promise<void>;
}
