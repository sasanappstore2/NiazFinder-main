import { normalizeCategoryPair, getCategoryPath } from '@/config/categories';
import { inferPropertyKindFromCategory } from '@/lib/need-intake/listing-copy-prompt';
import type { IntentSliceResult } from '@/intake/intelligence-engine/hybrid/intent-slice-schema';
import type { CategoryMatchResult } from '@/intake/rules/types';
import {
  createEmptyFieldBag,
  setField,
  type IntakeFieldBag,
  type IntakeIntelligenceInput,
} from '@/intake/intelligence-engine/types';

export function scopedMatchToFieldBag(
  match: CategoryMatchResult,
  input: IntakeIntelligenceInput,
  intentSlice: IntentSliceResult | null
): Partial<IntakeFieldBag> {
  const bag = createEmptyFieldBag();
  const leaf = match.subcategorySlug ?? match.categorySlug;
  const locked = input.formHints?.categoryLockedByUser ?? false;
  const pathRoot = getCategoryPath(leaf)[0]?.slug;
  const verticalFromPath =
    pathRoot === 'real-estate'
      ? 'real-estate'
      : pathRoot === 'vehicles'
        ? 'vehicles'
        : pathRoot === 'services'
          ? 'services'
          : pathRoot === 'jobs'
            ? 'jobs'
            : pathRoot === 'social'
              ? 'social'
              : 'products';

  // Prefer registry path when leaf is locked; intent vertical only as fallback.
  const verticalValue = verticalFromPath || intentSlice?.vertical || 'products';

  setField(bag, 'vertical', {
    value: verticalValue,
    confidence: intentSlice?.confidence ?? match.confidence,
    source: intentSlice ? 'ai' : 'rule',
    evidence: `hybrid:${match.matchedRules.slice(0, 2).join(',')}`,
  });

  setField(bag, 'categorySlug', {
    value: match.categorySlug,
    confidence: match.confidence,
    source: 'rule',
    lockedByUser: locked,
    evidence: match.matchedRules.slice(0, 3).join(','),
  });

  const pair = normalizeCategoryPair(match.categorySlug, match.subcategorySlug);
  setField(bag, 'subcategorySlug', {
    value: pair.subcategorySlug ?? leaf,
    confidence: match.confidence,
    source: locked ? 'form' : 'rule',
    lockedByUser: locked,
  });

  if (match.brand || match.model || match.condition) {
    const meta = [match.brand, match.model, match.condition].filter(Boolean).join(' ');
    if (meta) {
      setField(bag, 'dealType', {
        value: bag.dealType?.value ?? 'buy',
        confidence: 0.7,
        source: 'rule',
        evidence: `product:${meta}`,
      });
    }
  }

  const kind = inferPropertyKindFromCategory(leaf);
  if (kind) {
    setField(bag, 'propertyKind', {
      value: kind,
      confidence: 0.8,
      source: 'dictionary',
      evidence: leaf,
    });
  }

  return bag;
}
