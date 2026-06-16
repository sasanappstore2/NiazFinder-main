export type {
  IntakeAnalysisResult,
  IntakeEntities,
  IntakeConfidence,
  IntakeIndexes,
  CompletionState,
  TransactionType,
  WizardQuestion,
  MatchHit,
  DictionaryMatcher,
} from '@/intake/types';

export { normalizePersian, normalizeLookupKey } from '@/intake/normalizer/normalizePersian';
export { STOP_WORDS, isStopWord } from '@/intake/normalizer/stopWords';
export { tokenize } from '@/intake/tokenizer/tokenize';
export { generateNgrams } from '@/intake/ngrams/generateNgrams';
export {
  getIntakeIndexes,
  loadIntakeIndexes,
  buildIntakeIndexesSync,
  resetIntakeIndexesCache,
} from '@/intake/dictionaries/loader';
export { analyzeNeedText, analyzeNeedTextAsync } from '@/intake/engine/intakeEngine';
export {
  intakeAnalyzeRequestSchema,
  intakeAnalyzeResponseSchema,
} from '@/intake/api/intake.dto';
export { resolveTemplate, resolveTemplateFromDraftEntities } from '@/intake/template';
export { getAnalyticsSegment } from '@/intake/template/analyticsSegment';
export type { PostIntakeEvent } from '@/intake/telemetry/postIntakeEvents';
export {
  trackEvent,
  trackFieldChange,
  trackStepChange,
  trackValidationError,
  trackPublishAttempt,
  trackDropoff,
  isPostIntakeTelemetryEnabled,
} from '@/intake/telemetry/postIntakeTelemetry';
export type { IntakeTemplate, ResolveTemplateInput } from '@/intake/template';
export { ENTITY_FIELD_REGISTRY, hasEntityValue } from '@/intake/entities/entityRegistry';
export { computeMatchabilityScore } from '@/intake/scoring/matchabilityEngine';
export {
  createNeedDraftFromAnalysis,
  patchNeedDraftEntities,
  recomputeNeedDraft,
  legacyNeedDraftFromParsed,
  syncNeedDraftFromForm,
} from '@/intake/aggregate/needDraftAggregate';
export { draftToLegacyPayload } from '@/intake/legacy/draftToLegacyPayload';
export { compareLegacyAndCanonical } from '@/intake/legacy/compareLegacyAndCanonical';
export { LEGACY_CONSUMER_MATRIX, listUnmigratedConsumers } from '@/intake/legacy/consumer-audit';
export {
  warnLegacyWriteDetected,
  getLegacyWriteCount,
  getLegacyWriteLog,
  resetLegacyWriteLog,
} from '@/intake/legacy/legacy-guards';
export { computeCanonicalHash } from '@/intake/legacy/canonical-hash';
export { validateNeedDraftForPublish } from '@/intake/validation/publishValidator';
export { toPublishCommand } from '@/intake/projections/publishProjection';
export { toListingPreview } from '@/intake/projections/listingProjection';
export { toMatchProjection } from '@/intake/projections/matchProjection';
export { toChatProjection } from '@/intake/projections/chatProjection';
export { toAnalyticsProjection } from '@/intake/projections/analyticsProjection';
export { toServiceRequestV2 } from '@/intake/projections/serviceRequestV2';
export { buildProjectionMetadata } from '@/intake/projections/metadata';
export type { ProjectionMetadata } from '@/intake/projections/metadata';
export { getIntakeMigrationFeatureFlags, INTAKE_MIGRATION_FEATURE_FLAGS } from '@/intake/migration/feature-flags';
export {
  runPublishShadowMode,
  comparePublishShadow,
  flattenShadowDiffs,
} from '@/intake/migration/shadow-publish';
export type { PublishShadowComparison, PublishShadowFieldDiff } from '@/intake/migration/shadow-publish';
export { buildIntakeMigrationDashboard } from '@/intake/migration/dashboard-data';
export type { IntakeMigrationDashboardData } from '@/intake/migration/dashboard-data';
