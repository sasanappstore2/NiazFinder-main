import { normalizeCategoryPair } from '@/config/categories';
import { getCategoryPath } from '@/config/categories';
import { classifyVertical } from '@/lib/need-intake/vertical-classifier';
import { resolveIntakeCategory } from '@/lib/need-intake/resolve-intake-category';
import { inferPropertyKindFromCategory } from '@/lib/need-intake/listing-copy-prompt';
import { REGISTRY_CATEGORY_OVERRIDE_THRESHOLD } from '@/intake/rules/config';
import { matchCategoryFromRules } from '@/intake/rules/registry.server';
import { detectRepairServiceCategory } from '@/lib/need-intake/service-repair-intent';
import {
  isAmbiguousCommercialSubtype,
} from '@/lib/need-intake/business-commercial-property-intent';
import {
  createEmptyFieldBag,
  setField,
  type IntakeFieldBag,
  type IntakeIntelligenceInput,
} from '@/intake/intelligence-engine/types';

export interface RulesCategoryResolution {
  categorySlug: string;
  subcategorySlug?: string;
  source: 'registry' | 'legacy' | 'form';
  confidence: number;
  matchedRules: string[];
  brand?: string;
  model?: string;
  condition?: string;
  titleSubject?: string;
}

export function resolveRulesCategory(
  sourceText: string,
  input: IntakeIntelligenceInput
): RulesCategoryResolution {
  const hints = input.formHints;
  const locked = hints?.categoryLockedByUser ?? false;

  if (locked && (hints?.categorySlug || hints?.subcategorySlug)) {
    const pair = normalizeCategoryPair(
      hints?.categorySlug ?? hints?.subcategorySlug ?? '',
      hints?.subcategorySlug ?? undefined
    );
    return {
      categorySlug: pair.categorySlug,
      subcategorySlug: pair.subcategorySlug,
      source: 'form',
      confidence: 0.95,
      matchedRules: [],
    };
  }

  const repairCategory = detectRepairServiceCategory(sourceText);
  if (repairCategory) {
    const pair = normalizeCategoryPair(repairCategory);
    return {
      categorySlug: pair.categorySlug,
      subcategorySlug: pair.subcategorySlug,
      source: 'legacy',
      confidence: 0.94,
      matchedRules: ['repair-service-intent'],
    };
  }

  if (isAmbiguousCommercialSubtype(sourceText) && !locked) {
    return {
      categorySlug: '',
      subcategorySlug: undefined,
      source: 'legacy',
      confidence: 0.55,
      matchedRules: ['business-commercial-ambiguous'],
    };
  }

  const registry = matchCategoryFromRules(sourceText);
  if (registry && registry.confidence >= REGISTRY_CATEGORY_OVERRIDE_THRESHOLD) {
    return {
      categorySlug: registry.categorySlug,
      subcategorySlug: registry.subcategorySlug,
      source: 'registry',
      confidence: registry.confidence,
      matchedRules: registry.matchedRules,
      brand: registry.brand,
      model: registry.model,
      condition: registry.condition,
      titleSubject: registry.titleSubject,
    };
  }

  const legacy = resolveIntakeCategory({
    sourceText,
    formCategorySlug: hints?.categorySlug ?? '',
    formSubcategorySlug: hints?.subcategorySlug ?? '',
    categoryLockedByUser: false,
  });
  const pair = normalizeCategoryPair(legacy.categorySlug, legacy.subcategorySlug);
  const conf = registry
    ? Math.max(registry.confidence, legacy.source === 'text' ? 0.82 : 0.7)
    : legacy.source === 'text'
      ? 0.82
      : 0.7;

  if (registry && registry.confidence > conf) {
    return {
      categorySlug: registry.categorySlug,
      subcategorySlug: registry.subcategorySlug,
      source: 'registry',
      confidence: registry.confidence,
      matchedRules: registry.matchedRules,
      brand: registry.brand,
      model: registry.model,
      condition: registry.condition,
      titleSubject: registry.titleSubject,
    };
  }

  return {
    categorySlug: pair.categorySlug,
    subcategorySlug: pair.subcategorySlug,
    source: 'legacy',
    confidence: conf,
    matchedRules: registry?.matchedRules ?? [],
    brand: registry?.brand,
    model: registry?.model,
    condition: registry?.condition,
    titleSubject: registry?.titleSubject,
  };
}

export function rulesCategoryToFieldBag(
  sourceText: string,
  input: IntakeIntelligenceInput
): Partial<IntakeFieldBag> {
  const bag = createEmptyFieldBag();
  const locked = input.formHints?.categoryLockedByUser ?? false;
  const commercialAmbiguous = isAmbiguousCommercialSubtype(sourceText) && !locked;

  if (commercialAmbiguous) {
    setField(bag, 'vertical', {
      value: 'real-estate',
      confidence: 0.82,
      source: 'rule',
      evidence: 'business-commercial-ambiguous',
    });
    const t = sourceText;
    const deal =
      t.includes('رهن') && t.includes('اجاره')
        ? 'rent_rahn_ejare'
        : t.includes('رهن') || t.includes('ودیعه')
          ? 'rent_rahn_full'
          : t.includes('اجاره')
            ? 'rent_monthly'
            : undefined;
    if (deal) {
      setField(bag, 'dealType', {
        value: deal,
        confidence: 0.8,
        source: 'rule',
        evidence: 'business-commercial-rent',
      });
    }
    return bag;
  }

  const resolved = resolveRulesCategory(sourceText, input);
  const vertical = classifyVertical(sourceText);
  const leaf = resolved.subcategorySlug ?? resolved.categorySlug;

  const root = getCategoryPath(leaf)[0]?.slug;
  const verticalValue =
    root === 'real-estate'
      ? 'real-estate'
      : root === 'vehicles'
        ? 'vehicles'
        : root === 'services'
          ? 'services'
          : root === 'jobs'
            ? 'jobs'
            : root === 'social'
              ? 'social'
              : vertical.vertical;

  setField(bag, 'vertical', {
    value: verticalValue,
    confidence: resolved.source === 'registry' ? 0.88 : 0.75,
    source: resolved.source === 'form' ? 'form' : 'rule',
    evidence: `rules:${resolved.source}`,
  });

  setField(bag, 'categorySlug', {
    value: resolved.categorySlug,
    confidence: resolved.confidence,
    source: resolved.source === 'form' ? 'form' : 'rule',
    lockedByUser: locked,
    evidence: resolved.matchedRules.slice(0, 3).join(','),
  });

  setField(bag, 'subcategorySlug', {
    value: resolved.subcategorySlug ?? leaf,
    confidence: resolved.confidence,
    source: locked ? 'form' : 'rule',
    lockedByUser: locked,
  });

  if (resolved.brand || resolved.model || resolved.condition) {
    const meta = [resolved.brand, resolved.model, resolved.condition].filter(Boolean).join(' ');
    if (meta) {
      setField(bag, 'dealType', {
        value: bag.dealType?.value ?? 'buy',
        confidence: bag.dealType?.confidence ?? 0.7,
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
