/**
 * Canonical Property entity — single internal schema for all providers.
 * Providers MUST normalize into this shape before leaving the adapter boundary.
 */
export type {
  PropertyDealType,
  PropertyKind,
  PropertyAmenities,
  RawPageRecord,
  ExtractedListing,
  NormalizedProperty,
  EnrichedProperty,
  StoredProperty,
} from '../../types/property';

/** Alias for downstream clarity. */
export type Property = import('../../types/property').StoredProperty;

export type PropertyDraft = import('../../types/property').NormalizedProperty;
