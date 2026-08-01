import type { NeedDraft } from '@/contracts/need-intake';
import { draftToLegacyPayload } from '@/intake/legacy/draftToLegacyPayload';

export interface LegacyCanonicalDiff {
  field: string;
  legacy: unknown;
  canonical: unknown;
}

export interface LegacyCanonicalCompareResult {
  equal: boolean;
  diffs: LegacyCanonicalDiff[];
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return Object.keys(v as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = (v as Record<string, unknown>)[key];
          return acc;
        }, {});
    }
    return v;
  });
}

function pushIfDifferent(
  diffs: LegacyCanonicalDiff[],
  field: string,
  legacy: unknown,
  canonical: unknown
): void {
  if (stableStringify(legacy) !== stableStringify(canonical)) {
    diffs.push({ field, legacy, canonical });
  }
}

/**
 * Compare stored legacy fields on NeedDraft vs freshly derived legacy projection.
 * Useful during dual-write / migration validation.
 */
export function compareLegacyAndCanonical(draft: NeedDraft): LegacyCanonicalCompareResult {
  const derived = draftToLegacyPayload(draft);
  const diffs: LegacyCanonicalDiff[] = [];

  pushIfDifferent(diffs, 'parsedIntent.city', draft.parsedIntent?.city, derived.parsedIntent.city);
  pushIfDifferent(
    diffs,
    'parsedIntent.categorySlug',
    draft.parsedIntent?.categorySlug,
    derived.parsedIntent.categorySlug
  );
  pushIfDifferent(
    diffs,
    'parsedIntent.subcategorySlug',
    draft.parsedIntent?.subcategorySlug,
    derived.parsedIntent.subcategorySlug
  );
  pushIfDifferent(
    diffs,
    'parsedIntent.transactionType',
    draft.parsedIntent?.entities?.dealType,
    derived.parsedIntent.entities?.dealType
  );
  pushIfDifferent(diffs, 'answers.location', draft.answers?.location, derived.answers.location);
  pushIfDifferent(diffs, 'answers.dealType', draft.answers?.dealType, derived.answers.dealType);
  pushIfDifferent(diffs, 'answers.budget', draft.answers?.budget, derived.answers.budget);
  pushIfDifferent(diffs, 'answers.rooms', draft.answers?.rooms, derived.answers.rooms);
  pushIfDifferent(diffs, 'answers.areaMin', draft.answers?.areaMin, derived.answers.areaMin);

  return { equal: diffs.length === 0, diffs };
}
