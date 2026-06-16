import type { NeedDraft } from '@/contracts/need-intake';
import type { PublishCommand } from '@/intake/projections/publishProjection';
import { toPublishCommand } from '@/intake/projections/publishProjection';
import { toPublishCommandFromStoredLegacy } from '@/intake/projections/publishProjectionLegacy';
import { recordToEntities } from '@/intake/entities/entityRecord';

export interface PublishShadowFieldDiff {
  field: string;
  legacy: unknown;
  canonical: unknown;
}

export interface PublishShadowComparison {
  equal: boolean;
  diffs: PublishShadowFieldDiff[];
  canonical: PublishComparableSnapshot;
  legacy: PublishComparableSnapshot;
}

export interface PublishComparableSnapshot {
  title: string;
  description: string;
  city?: string;
  province?: string;
  budgetMin?: number;
  budgetMax?: number;
  intentType: string;
  categorySlug?: string;
  subcategorySlug?: string;
  transactionType?: string | null;
  dealType?: string | null;
  location?: string;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value ?? null);
}

/** Normalize legacy deal chips and canonical transaction enums for shadow diff. */
function normalizeDealAlias(value: unknown): string | null {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  const upper = s.toUpperCase();
  const map: Record<string, string> = {
    BUY: 'buy',
    buy: 'buy',
    SELL: 'sell',
    sell: 'sell',
    RENT: 'rent',
    rent: 'rent',
    rent_monthly: 'rent',
    rent_short_term: 'rent_short',
    rent_rahn_full: 'rent_rahn',
    rent_rahn_ejare: 'rent_rahn',
    FULL_DEPOSIT: 'rent_rahn',
    DEPOSIT_AND_RENT: 'rent_rahn',
    DAILY_RENT: 'rent_short',
    HOURLY_RENT: 'rent_short',
  };
  return map[s] ?? map[upper] ?? s.toLowerCase();
}

function resolveTransactionType(
  entities: Record<string, unknown>,
  answers: Record<string, unknown>
): string | null {
  if (typeof entities.transactionType === 'string') return entities.transactionType;
  if (typeof entities.dealType === 'string') return entities.dealType;
  if (typeof answers.dealType === 'string') return answers.dealType;
  return null;
}

function resolveDealType(
  entities: Record<string, unknown>,
  answers: Record<string, unknown>
): string | null {
  if (typeof answers.dealType === 'string') return answers.dealType;
  if (typeof entities.dealType === 'string') return entities.dealType;
  if (typeof entities.transactionType === 'string') return entities.transactionType;
  return null;
}

function resolveComparableEntities(cmd: PublishCommand): Record<string, unknown> {
  const fromAi =
    cmd.aiExtractedData?.entities && typeof cmd.aiExtractedData.entities === 'object'
      ? (cmd.aiExtractedData.entities as Record<string, unknown>)
      : {};
  const fromDynamic =
    cmd.dynamicAnswers?.entities && typeof cmd.dynamicAnswers.entities === 'object'
      ? (cmd.dynamicAnswers.entities as Record<string, unknown>)
      : {};
  return { ...fromAi, ...fromDynamic };
}

export function publishCommandToComparable(cmd: PublishCommand): PublishComparableSnapshot {
  const entities = resolveComparableEntities(cmd);
  const ai = cmd.aiExtractedData ?? {};
  const answers = cmd.dynamicAnswers ?? {};

  return {
    title: cmd.title,
    description: cmd.description,
    city: cmd.city,
    province: cmd.province,
    budgetMin: cmd.budgetMin,
    budgetMax: cmd.budgetMax,
    intentType: cmd.intentType,
    categorySlug: typeof ai.categorySlug === 'string' ? ai.categorySlug : undefined,
    subcategorySlug: typeof ai.subcategorySlug === 'string' ? ai.subcategorySlug : undefined,
    transactionType: resolveTransactionType(entities, answers),
    dealType: resolveDealType(entities, answers),
    location: typeof answers.location === 'string' ? answers.location : undefined,
  };
}

function pushDiff(
  diffs: PublishShadowFieldDiff[],
  field: string,
  legacy: unknown,
  canonical: unknown
): void {
  if (stableStringify(legacy) !== stableStringify(canonical)) {
    diffs.push({ field, legacy, canonical });
  }
}

export function comparePublishShadow(
  canonical: PublishComparableSnapshot,
  legacy: PublishComparableSnapshot
): PublishShadowComparison {
  const diffs: PublishShadowFieldDiff[] = [];

  pushDiff(diffs, 'title', legacy.title, canonical.title);
  pushDiff(diffs, 'description', legacy.description, canonical.description);
  pushDiff(diffs, 'city', legacy.city, canonical.city);
  pushDiff(diffs, 'province', legacy.province, canonical.province);
  pushDiff(diffs, 'budgetMin', legacy.budgetMin, canonical.budgetMin);
  pushDiff(diffs, 'budgetMax', legacy.budgetMax, canonical.budgetMax);
  pushDiff(diffs, 'intentType', legacy.intentType, canonical.intentType);
  pushDiff(diffs, 'categorySlug', legacy.categorySlug, canonical.categorySlug);
  pushDiff(diffs, 'subcategorySlug', legacy.subcategorySlug, canonical.subcategorySlug);
  pushDiff(
    diffs,
    'transactionType',
    normalizeDealAlias(legacy.transactionType),
    normalizeDealAlias(canonical.transactionType)
  );
  pushDiff(diffs, 'dealType', normalizeDealAlias(legacy.dealType), normalizeDealAlias(canonical.dealType));
  pushDiff(diffs, 'location', legacy.location, canonical.location);

  return {
    equal: diffs.length === 0,
    diffs,
    canonical,
    legacy,
  };
}

/**
 * Shadow mode: canonical publish projection vs legacy stored snapshot path.
 * Does not mutate or switch production writes.
 */
export function runPublishShadowMode(
  draft: NeedDraft,
  categoryId: string,
  subcategoryId?: string | null
): PublishShadowComparison {
  const canonicalCmd = toPublishCommand(draft, categoryId, subcategoryId);
  const legacyCmd = toPublishCommandFromStoredLegacy(draft, categoryId, subcategoryId);
  return comparePublishShadow(
    publishCommandToComparable(canonicalCmd),
    publishCommandToComparable(legacyCmd)
  );
}

/** Flat diff rows for event log / analytics. */
export function flattenShadowDiffs(
  requestId: string,
  templateId: string,
  comparison: PublishShadowComparison
): Array<{
  requestId: string;
  templateId: string;
  equal: boolean;
  field?: string;
  legacy?: unknown;
  canonical?: unknown;
}> {
  if (comparison.equal) {
    return [{ requestId, templateId, equal: true }];
  }
  return comparison.diffs.map((d) => ({
    requestId,
    templateId,
    equal: false,
    field: d.field,
    legacy: d.legacy,
    canonical: d.canonical,
  }));
}

export function entitiesTransactionType(draft: NeedDraft): string | null {
  const entities = recordToEntities(draft.entities);
  return entities.transactionType;
}
