/**
 * Intake merge policy — single authority for combining smart-extract proposals
 * with intelligence-engine drafts.
 *
 * Priority (highest → lowest):
 *   1. User locks (category / city / neighborhood / dealType / field keys)
 *   2. Intelligence-engine NeedDraft (authoritative for draft entities)
 *   3. Smart-extract proposals (UI-only until user confirms)
 *
 * Both payloads must carry `sourceSig` (from `buildSourceSig` / intake text signature).
 * Stale payloads (sig mismatch) are discarded entirely.
 */

import type { NeedDraft } from '@/contracts/need-intake';
import type { SmartExtractionResult } from '@/intake/smart-extractor/types';

export type IntakeMergeSource = 'user' | 'intelligence' | 'smart' | 'none';

export interface IntakeUserLocks {
  categoryLockedByUser?: boolean;
  cityLockedByUser?: boolean;
  neighborhoodLockedByUser?: boolean;
  dealLockedByUser?: boolean;
  /** Explicit field keys the user edited — never overwrite. */
  lockedFieldKeys?: readonly string[];
}

export interface IntelligenceMergePayload {
  draft: NeedDraft;
  /** Signature of the text that produced this draft. */
  sourceSig: string;
  receivedAtMs: number;
}

export interface SmartMergePayload {
  result: SmartExtractionResult;
  sourceSig: string;
  receivedAtMs: number;
  requestId?: number;
}

export interface IntakeMergeInput {
  /** Current compose text signature — stale payloads are dropped. */
  currentSourceSig: string;
  locks?: IntakeUserLocks;
  intelligence?: IntelligenceMergePayload | null;
  smart?: SmartMergePayload | null;
}

/** Field-level proposal for UI (never auto-written into NeedDraft). */
export interface SmartFieldProposal {
  fieldKey: string;
  value: unknown;
  confidence: number;
  source: 'smart';
  label?: string;
}

export interface IntakeMergeResult {
  /** Authoritative draft — intelligence only (or null if stale/missing). */
  draft: NeedDraft | null;
  draftSource: IntakeMergeSource;
  /** Smart proposals eligible for UI chips / ambiguity prompts. */
  proposals: SmartFieldProposal[];
  /** Why intelligence or smart was dropped. */
  discarded: Array<{ source: 'intelligence' | 'smart'; reason: string }>;
  /** True when smart payload matches current text and is fresher than intel for UI hints. */
  smartIsFresh: boolean;
  intelligenceIsFresh: boolean;
}

const DEAL_FIELD_KEYS = new Set(['dealType', 'transactionType', 'transaction.type']);

function isLocked(locks: IntakeUserLocks | undefined, fieldKey: string): boolean {
  if (!locks) return false;
  if (locks.lockedFieldKeys?.includes(fieldKey)) return true;
  if (DEAL_FIELD_KEYS.has(fieldKey) && locks.dealLockedByUser) return true;
  if (
    (fieldKey === 'categorySlug' ||
      fieldKey === 'subcategorySlug' ||
      fieldKey === 'category' ||
      fieldKey === 'category.value' ||
      fieldKey === 'category.subcategory') &&
    locks.categoryLockedByUser
  ) {
    return true;
  }
  if (
    (fieldKey === 'city' || fieldKey === 'citySlug' || fieldKey === 'location.city') &&
    locks.cityLockedByUser
  ) {
    return true;
  }
  if (
    (fieldKey === 'neighborhood' ||
      fieldKey === 'neighborhoodSlug' ||
      fieldKey === 'location.neighborhood') &&
    locks.neighborhoodLockedByUser
  ) {
    return true;
  }
  return false;
}

function pushProposal(
  proposals: SmartFieldProposal[],
  locks: IntakeUserLocks | undefined,
  fieldKey: string,
  value: unknown,
  confidence: number,
  label?: string
): void {
  if (value === null || value === undefined || value === '') return;
  if (confidence < 0.5) return;
  if (isLocked(locks, fieldKey)) return;
  proposals.push({
    fieldKey,
    value,
    confidence,
    source: 'smart',
    ...(label ? { label } : {}),
  });
}

/** Extract UI proposals from a fresh smart result (never mutates draft). */
export function smartResultToProposals(
  result: SmartExtractionResult,
  locks?: IntakeUserLocks
): SmartFieldProposal[] {
  const proposals: SmartFieldProposal[] = [];
  pushProposal(
    proposals,
    locks,
    'categorySlug',
    result.category.subcategory ?? result.category.value,
    result.category.confidence
  );
  pushProposal(
    proposals,
    locks,
    'city',
    result.location.city,
    result.location.confidence
  );
  pushProposal(
    proposals,
    locks,
    'citySlug',
    result.location.citySlug,
    result.location.confidence
  );
  pushProposal(
    proposals,
    locks,
    'neighborhood',
    result.location.neighborhood,
    result.location.confidence
  );
  pushProposal(
    proposals,
    locks,
    'neighborhoodSlug',
    result.location.neighborhoodSlug,
    result.location.confidence
  );
  pushProposal(
    proposals,
    locks,
    'dealType',
    result.transaction.dealType ?? result.transaction.type,
    result.transaction.confidence
  );
  pushProposal(proposals, locks, 'budgetMin', result.budget.min, result.budget.confidence);
  pushProposal(proposals, locks, 'budgetMax', result.budget.max, result.budget.confidence);
  pushProposal(
    proposals,
    locks,
    'deposit',
    result.budget.depositAmount,
    result.budget.confidence
  );
  pushProposal(
    proposals,
    locks,
    'monthlyRent',
    result.budget.rentAmount,
    result.budget.confidence
  );
  pushProposal(proposals, locks, 'areaMin', result.property.area, result.property.confidence);
  pushProposal(proposals, locks, 'rooms', result.property.rooms, result.property.confidence);
  return proposals;
}

/**
 * Merge intelligence draft (authoritative) with smart proposals (UI-only).
 * Never applies smart values into the draft — that was the dual-pipeline race.
 */
export function mergeIntakeSources(input: IntakeMergeInput): IntakeMergeResult {
  const discarded: IntakeMergeResult['discarded'] = [];
  let draft: NeedDraft | null = null;
  let draftSource: IntakeMergeSource = 'none';
  let intelligenceIsFresh = false;
  let smartIsFresh = false;
  let proposals: SmartFieldProposal[] = [];

  if (input.intelligence) {
    if (input.intelligence.sourceSig !== input.currentSourceSig) {
      discarded.push({ source: 'intelligence', reason: 'stale_source_sig' });
    } else {
      draft = input.intelligence.draft;
      draftSource = 'intelligence';
      intelligenceIsFresh = true;
    }
  }

  if (input.smart) {
    if (input.smart.sourceSig !== input.currentSourceSig) {
      discarded.push({ source: 'smart', reason: 'stale_source_sig' });
    } else {
      smartIsFresh = true;
      proposals = smartResultToProposals(input.smart.result, input.locks);
    }
  }

  return {
    draft,
    draftSource,
    proposals,
    discarded,
    smartIsFresh,
    intelligenceIsFresh,
  };
}

/**
 * Decide whether an incoming smart response should replace the current
 * displayed smart result (monotonic request id + source sig).
 */
export function shouldAcceptSmartResponse(opts: {
  incomingRequestId: number;
  currentRequestId: number;
  incomingSourceSig: string;
  currentSourceSig: string;
  isComposeStep: boolean;
}): boolean {
  if (!opts.isComposeStep) return false;
  if (opts.incomingRequestId !== opts.currentRequestId) return false;
  if (opts.incomingSourceSig !== opts.currentSourceSig) return false;
  return true;
}

/** Helper for callers that only have need/details text. */
export function buildSourceSig(needText: string, detailsText = ''): string {
  const zw = /[\u200B\u200C\u200D\uFEFF]/g;
  const need = needText.replace(zw, '').slice(0, 5000);
  const details = detailsText.replace(zw, '').slice(0, 5000);
  return `${need}\n${details}`;
}

/**
 * High-confidence neighborhood soft-fill candidate from smart result.
 * Returns null when locked, ambiguous, low confidence, or missing.
 */
export function pickNeighborhoodSoftFill(
  result: SmartExtractionResult | null | undefined,
  locks?: IntakeUserLocks,
  minConfidence = 0.85
): { neighborhood: string; neighborhoodSlug: string | null; confidence: number } | null {
  if (!result) return null;
  if (isLocked(locks, 'neighborhood') || isLocked(locks, 'neighborhoodSlug')) return null;
  if (result.location.disambiguationNeeded) return null;
  if (!result.location.neighborhood) return null;
  if (result.location.confidence < minConfidence) return null;
  if ((result.location.alternatives?.length ?? 0) > 1) return null;
  return {
    neighborhood: result.location.neighborhood,
    neighborhoodSlug: result.location.neighborhoodSlug,
    confidence: result.location.confidence,
  };
}
