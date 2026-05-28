/**
 * Migration feature flags — all default OFF.
 * Toggle via env without DB rollback.
 */
export const INTAKE_MIGRATION_FEATURE_FLAGS = {
  /** Read paths prefer NeedDraft.entities over stored legacy fields. */
  canonicalReadEnabled: process.env.INTAKE_CANONICAL_READ_ENABLED === 'true',
  /** Listing preview/composer uses canonical projection. */
  listingUseCanonical: process.env.LISTING_USE_CANONICAL === 'true',
  /** Match engine reads ServiceRequestV2 snapshot (future). */
  matchEngineUseV2: process.env.MATCH_ENGINE_USE_V2 === 'true',
  /** Shadow mode always on for publish (observability only). */
  shadowPublishEnabled: process.env.INTAKE_SHADOW_PUBLISH !== 'false',
} as const;

export function getIntakeMigrationFeatureFlags() {
  return { ...INTAKE_MIGRATION_FEATURE_FLAGS };
}
