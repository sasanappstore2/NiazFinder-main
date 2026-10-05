#!/usr/bin/env bun
/**
 * Read-only, privacy-preserving audit for candidate Si typed-decision corpora.
 * It reports aggregates only: never prints source text, labels, IDs, or manifest paths.
 *
 * Usage:
 *   bun scripts/datasets/audit-si-corpus.ts --input reports/file.jsonl [--manifest reports/file-manifest.json]
 */
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';
import {
  classifyCorpusTaskRow,
  manifestSourceUseEligible,
  manifestTargetsPostNeedIntent,
  rowSourceUseEvidence,
} from './si-corpus-eligibility';
import {
  containsSiCorpusPiiPattern,
  siAuditTargetFingerprint,
  normalizeSiCorpusText,
  readSiTypedPrediction,
  readSiCorpusAuditShape,
} from './si-corpus-audit-shape';

type JsonObject = Record<string, unknown>;

const args = process.argv.slice(2);
function argValue(name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

const inputArg = argValue('--input');
const manifestArg = argValue('--manifest');
if (!inputArg || args.includes('--help')) {
  console.log('Usage: bun scripts/datasets/audit-si-corpus.ts --input <file.jsonl> [--manifest <file.json>]');
  process.exit(inputArg ? 0 : 2);
}

const inputPath = resolve(inputArg);
const manifestPath = manifestArg ? resolve(manifestArg) : undefined;
if (!existsSync(inputPath)) throw new Error('Input file does not exist.');
if (manifestPath && !existsSync(manifestPath)) throw new Error('Manifest file does not exist.');

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asObject(value: unknown): JsonObject | undefined {
  return isObject(value) ? value : undefined;
}

function hasAnyLabel(label: JsonObject | undefined): boolean {
  return Boolean(label && Object.keys(label).length > 0);
}

const counts = {
  rows: 0,
  malformedJson: 0,
  missingText: 0,
  missingLabels: 0,
  piiPatternRows: 0,
  duplicateTextRows: 0,
  sameTargetDuplicateTextRows: 0,
  conflictingDuplicateTextRows: 0,
  withCategory: 0,
  withCity: 0,
  withNeighborhood: 0,
  withConsentMetadata: 0,
  withLicenseMetadata: 0,
  withRowProvenance: 0,
  withHumanLabelReview: 0,
  withTypedDecisions: 0,
  withTargetTaskType: 0,
  explicitlyNonSyntheticRows: 0,
  syntheticRows: 0,
  rowsMissingSyntheticStatus: 0,
  supplySideListingRows: 0,
};
const uniqueTexts = new Set<string>();
const firstTargetByText = new Map<string, string | undefined>();
const conflictingDuplicateTextGroups = new Set<string>();
const categoryValues = new Set<string>();
const cityValues = new Set<string>();
const neighborhoodValues = new Set<string>();
const proxyComparisons = new Map<string, {
  targetKnown: number;
  targetUnknown: number;
  nonChoiceTarget: number;
  falseProposalWhenTargetUnknown: number;
  predicted: number;
  predictionMissingOrUnknown: number;
  exactAgreement: number;
}>();
const labelKeyCounts = new Map<string, number>();
let otherLabelKeyOccurrences = 0;
const safeLabelKeys = new Set([
  'categorySlug', 'categorySlugs', 'category', 'categories', 'location', 'options', 'status',
  'city', 'citySlug', 'neighborhood', 'neighborhoodSlug', 'province', 'vertical', 'tone',
  'area', 'areaMin', 'areaMax', 'rooms', 'dealType', 'transactionType', 'propertyKind',
  'deedType', 'budgetMin', 'budgetMax', 'rahnAmount', 'monthlyRent', 'deposit', 'parking',
  'elevator', 'storage', 'usage', 'usageType', 'typedDecisions', 'siDecisions', 'entities',
  'unknown', 'mustClarify', 'must_clarify', 'expect', 'intent', 'property_type',
  'category_candidate', 'property_kind', 'transaction_type', 'deed_type', 'monthly_rent', 'budget',
  'source', 'humanReviewed',
]);
let fullyQualifiedRows = 0;

const stream = createInterface({ input: createReadStream(inputPath, { encoding: 'utf8' }), crlfDelay: Infinity });
for await (const line of stream) {
  if (!line.trim()) continue;
  let row: JsonObject;
  try {
    const parsed: unknown = JSON.parse(line);
    if (!isObject(parsed)) {
      counts.malformedJson += 1;
      continue;
    }
    row = parsed;
  } catch {
    counts.malformedJson += 1;
    continue;
  }

  counts.rows += 1;
  const shape = readSiCorpusAuditShape(row);
  const text = shape.text;
  let textDigest: string | undefined;
  if (!text) {
    counts.missingText += 1;
  } else {
    const normalized = normalizeSiCorpusText(text);
    textDigest = createHash('sha256').update(normalized).digest('hex');
    const targetFingerprint = siAuditTargetFingerprint(shape.label);
    if (uniqueTexts.has(textDigest)) {
      counts.duplicateTextRows += 1;
      const previousTarget = firstTargetByText.get(textDigest);
      if (previousTarget && targetFingerprint && previousTarget !== targetFingerprint) {
        counts.conflictingDuplicateTextRows += 1;
        conflictingDuplicateTextGroups.add(textDigest);
      } else if (previousTarget && targetFingerprint && previousTarget === targetFingerprint) {
        counts.sameTargetDuplicateTextRows += 1;
      } else if (!previousTarget && targetFingerprint) {
        firstTargetByText.set(textDigest, targetFingerprint);
      }
    } else {
      uniqueTexts.add(textDigest);
      firstTargetByText.set(textDigest, targetFingerprint);
    }
    if (containsSiCorpusPiiPattern(text)) counts.piiPatternRows += 1;
  }

  const label = shape.label;
  if (!hasAnyLabel(label)) counts.missingLabels += 1;
  const category = shape.category;
  const city = shape.city;
  const neighborhood = shape.neighborhood;
  if (category) {
    counts.withCategory += 1;
    categoryValues.add(category);
  }
  if (city) {
    counts.withCity += 1;
    cityValues.add(city);
  }
  if (neighborhood) {
    counts.withNeighborhood += 1;
    neighborhoodValues.add(neighborhood);
  }
  for (const key of Object.keys(label ?? {})) {
    if (!safeLabelKeys.has(key)) {
      otherLabelKeyOccurrences += 1;
      continue;
    }
    labelKeyCounts.set(key, (labelKeyCounts.get(key) ?? 0) + 1);
  }
  const labelProvenance = asObject(row.labelProvenance);
  const typedDecisions = shape.typedDecisions;
  const siAnswers = asObject(asObject(row.si)?.answers);
  for (const [field, wrappedTarget] of Object.entries(typedDecisions ?? {})) {
    const decision = asObject(wrappedTarget);
    const target = decision && Object.hasOwn(decision, 'value') ? decision.value : wrappedTarget;
    const comparison = proxyComparisons.get(field) ?? {
      targetKnown: 0,
      targetUnknown: 0,
      nonChoiceTarget: 0,
      falseProposalWhenTargetUnknown: 0,
      predicted: 0,
      predictionMissingOrUnknown: 0,
      exactAgreement: 0,
    };
    const answer = siAnswers?.[field];
    const prediction = readSiTypedPrediction(answer);
    if (target === null || target === undefined || target === 'unknown') {
      comparison.targetUnknown += 1;
      if (prediction && prediction !== 'unknown') comparison.falseProposalWhenTargetUnknown += 1;
      proxyComparisons.set(field, comparison);
      continue;
    }
    if (typeof target !== 'string') {
      comparison.nonChoiceTarget += 1;
      proxyComparisons.set(field, comparison);
      continue;
    }
    comparison.targetKnown += 1;
    if (!prediction || prediction === 'unknown') {
      comparison.predictionMissingOrUnknown += 1;
    } else {
      comparison.predicted += 1;
      if (prediction === target) comparison.exactAgreement += 1;
    }
    proxyComparisons.set(field, comparison);
  }
  const taskEligibility = classifyCorpusTaskRow(row);
  const sourceUseEvidence = rowSourceUseEvidence(row);
  if (taskEligibility.isTargetTask) counts.withTargetTaskType += 1;
  if (taskEligibility.explicitlyNonSynthetic) counts.explicitlyNonSyntheticRows += 1;
  else if (row.synthetic === true) counts.syntheticRows += 1;
  else counts.rowsMissingSyntheticStatus += 1;
  if (taskEligibility.isSupplyListing) counts.supplySideListingRows += 1;
  if (sourceUseEvidence === 'first-party-consented') counts.withConsentMetadata += 1;
  if (sourceUseEvidence === 'license-cleared') counts.withLicenseMetadata += 1;
  const hasProvenance = shape.hasSourceProvenance;
  const humanReviewed = labelProvenance?.reviewed === true &&
    ['human', 'user-confirmed'].includes(String(labelProvenance.method ?? '')) &&
    Boolean(getString(labelProvenance.reviewedAt));
  const hasTypedDecisions = Boolean(typedDecisions && Object.keys(typedDecisions).length > 0);
  if (hasProvenance) counts.withRowProvenance += 1;
  if (humanReviewed) counts.withHumanLabelReview += 1;
  if (hasTypedDecisions) counts.withTypedDecisions += 1;
  if (
    text && label && sourceUseEvidence && hasProvenance && humanReviewed && hasTypedDecisions &&
    taskEligibility.eligibleForPostNeedIntent && !containsSiCorpusPiiPattern(text)
  ) {
    fullyQualifiedRows += 1;
  }
}

let manifest: JsonObject | undefined;
if (manifestPath) {
  try {
    manifest = asObject(JSON.parse(readFileSync(manifestPath, 'utf8')));
  } catch {
    throw new Error('Manifest is not valid JSON.');
  }
}

const labels = asObject(manifest?.labeling);
const privacy = asObject(manifest?.privacy);
const targetModel = getString(manifest?.targetModel);
const targetTaskValid = manifest ? manifestTargetsPostNeedIntent(manifest) : false;
const manifestQualified = Boolean(manifest && manifestSourceUseEligible(manifest)) &&
  labels?.humanReviewed === true &&
  targetModel === 'convaiinnovations/si-multilingual' &&
  privacy?.piiAuditPassed === true && targetTaskValid;
const qualified = manifestQualified && fullyQualifiedRows === counts.rows &&
  counts.rows > 0 && counts.malformedJson === 0 && counts.missingText === 0 &&
  counts.missingLabels === 0 && counts.duplicateTextRows === 0 && counts.piiPatternRows === 0;

const blockers: string[] = [];
if (!manifest) blockers.push('No provenance/consent/labeling manifest supplied.');
if (!manifestQualified) blockers.push('Manifest lacks verified first-party training consent or complete license/attribution/share-alike/content-rights/downstream-use evidence, human review, PII audit, or zero-synthetic attestation.');
if (fullyQualifiedRows !== counts.rows) blockers.push('One or more rows lack per-row source provenance, explicit consent, human-confirmed labels, or clean text.');
if (counts.withTargetTaskType !== counts.rows || !targetTaskValid) blockers.push('Rows or manifest do not declare the exact versioned real-estate need-intent task.');
if (counts.explicitlyNonSyntheticRows !== counts.rows || counts.syntheticRows > 0) blockers.push('Every row must explicitly declare synthetic=false; synthetic or unknown-origin rows are ineligible.');
if (counts.supplySideListingRows > 0) blockers.push('Supply-side listing/ad rows cannot be labeled as genuine seeker needs.');
if (counts.withTypedDecisions !== counts.rows) blockers.push('Rows do not all contain explicit typed-decision targets compatible with Si.');
if (counts.duplicateTextRows) blockers.push('Duplicate normalized text exists.');
if (counts.piiPatternRows) blockers.push('PII-like phone/email patterns remain in source text.');
if (counts.missingLabels || counts.missingText || counts.malformedJson) blockers.push('Rows are structurally incomplete or malformed.');

console.log(JSON.stringify({
  inputProvided: true,
  manifestProvided: Boolean(manifestPath),
  counts: {
    ...counts,
    uniqueTexts: uniqueTexts.size,
    conflictingDuplicateTextGroups: conflictingDuplicateTextGroups.size,
    qualifiedRows: fullyQualifiedRows,
  },
  coverage: {
    distinctCategories: categoryValues.size,
    distinctCities: cityValues.size,
    distinctNeighborhoods: neighborhoodValues.size,
    knownLabelKeyOccurrences: Object.fromEntries([...labelKeyCounts.entries()].sort(([a], [b]) => a.localeCompare(b))),
    otherLabelKeyOccurrences,
  },
  proxyComparisons: {
    scope: 'unreviewed Si choices vs source-derived counterfactual targets; not accuracy',
    fields: Object.fromEntries([...proxyComparisons.entries()].sort(([a], [b]) => a.localeCompare(b)).map(
      ([field, comparison]) => [field, {
        ...comparison,
        agreementWhenAnswered: comparison.predicted
          ? Number((comparison.exactAgreement / comparison.predicted).toFixed(4))
          : null,
        knownTargetPredictionRate: comparison.targetKnown
          ? Number((comparison.predicted / comparison.targetKnown).toFixed(4))
          : null,
        falseProposalRateWhenTargetUnknown: comparison.targetUnknown
          ? Number((comparison.falseProposalWhenTargetUnknown / comparison.targetUnknown).toFixed(4))
          : null,
      }],
    )),
  },
  eligibleForTraining: qualified,
  meetsOneMillionQualifiedRows: qualified && counts.rows >= 1_000_000,
  blockers,
}, null, 2));

if (!qualified) process.exitCode = 1;
