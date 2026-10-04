export const POST_REAL_ESTATE_NEED_TASK = 'post-real-estate-need-intent/v1';

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as UnknownRecord
    : undefined;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

const SUPPLY_SIDE_SOURCE_TYPES = new Set([
  'seller_or_agent_property_offer',
  'property_listing',
  'classified_property_ad',
]);

export interface CorpusTaskEligibility {
  isTargetTask: boolean;
  explicitlyNonSynthetic: boolean;
  isSupplyListing: boolean;
  eligibleForPostNeedIntent: boolean;
}

export type RowSourceUseEvidence = 'first-party-consented' | 'license-cleared' | null;

export function rowSourceUseEvidence(row: UnknownRecord): RowSourceUseEvidence {
  const consent = record(row.consent);
  if (
    consent?.modelTraining === true &&
    consent.scope === 'model-training' &&
    Boolean(nonEmptyString(consent.policyVersion)) &&
    Boolean(nonEmptyString(consent.consentRecordHash))
  ) {
    return 'first-party-consented';
  }

  const provenance = record(row.provenance) ?? record(row.sourceProvenance);
  if (
    provenance?.kind === 'license-cleared' &&
    Boolean(nonEmptyString(provenance.licenseId)) &&
    Boolean(nonEmptyString(provenance.licenseEvidenceRef))
  ) {
    return 'license-cleared';
  }
  return null;
}

export function manifestSourceUseEligible(manifest: UnknownRecord): boolean {
  const provenance = record(manifest.dataProvenance);
  if (
    provenance?.verified !== true ||
    !nonEmptyString(provenance.evidenceRef)
  ) return false;

  if (provenance.kind === 'first-party-consented') {
    const consent = record(manifest.consent);
    return consent?.explicitModelTraining === true &&
      consent.scope === 'model-training' &&
      Boolean(nonEmptyString(consent.policyVersion));
  }

  if (provenance.kind === 'license-cleared') {
    return Boolean(
      nonEmptyString(provenance.licenseId) &&
      nonEmptyString(provenance.licenseEvidenceRef) &&
      nonEmptyString(provenance.attribution) &&
      nonEmptyString(provenance.shareAlikePlan) &&
      nonEmptyString(provenance.contentRightsReviewEvidenceRef) &&
      nonEmptyString(provenance.downstreamUseReviewEvidenceRef),
    );
  }
  return false;
}

/**
 * Keep real-estate need-intent examples separate from derived property offers.
 * Absence of an explicit false synthetic flag is intentionally ineligible.
 */
export function classifyCorpusTaskRow(row: UnknownRecord): CorpusTaskEligibility {
  const source = record(row.source);
  const provenance = record(row.provenance) ?? record(row.sourceProvenance);
  const sourceType = nonEmptyString(source?.sourceType) ?? nonEmptyString(provenance?.sourceType) ??
    nonEmptyString(row.sourceType);
  const isSupplyListing = SUPPLY_SIDE_SOURCE_TYPES.has(sourceType ?? '');
  const isTargetTask = row.taskType === POST_REAL_ESTATE_NEED_TASK;
  const explicitlyNonSynthetic = row.synthetic === false;

  return {
    isTargetTask,
    explicitlyNonSynthetic,
    isSupplyListing,
    eligibleForPostNeedIntent: isTargetTask && explicitlyNonSynthetic && !isSupplyListing,
  };
}

export function manifestTargetsPostNeedIntent(manifest: UnknownRecord): boolean {
  return manifest.targetTask === POST_REAL_ESTATE_NEED_TASK && manifest.containsSyntheticData === false;
}
