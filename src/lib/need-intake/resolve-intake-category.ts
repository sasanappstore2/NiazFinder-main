import { normalizeCategoryPair } from '@/config/categories';
import { REGISTRY_CATEGORY_OVERRIDE_THRESHOLD } from '@/intake/rules/config';
import { matchCategoryFromLegacyRules } from '@/intake/rules/registry-legacy';
import { isCategoryVerticalCoherent } from '@/lib/need-intake/parse-coherence';
import { parseIntentFromText, suggestNeedCategoriesFromText } from '@/lib/need-intake/intent-parser';
import {
  classifyVertical,
  isVerticalConfident,
} from '@/lib/need-intake/vertical-classifier';
import { getBusinessCommercialPropertyCandidates } from '@/lib/need-intake/business-commercial-property-intent';

export type ResolvedIntakeCategorySource = 'text' | 'form' | 'fallback';

export interface ResolveIntakeCategoryInput {
  sourceText: string;
  formCategorySlug?: string | null;
  formSubcategorySlug?: string | null;
  categoryLockedByUser?: boolean;
}

export interface ResolvedIntakeCategory {
  categorySlug: string;
  subcategorySlug: string | undefined;
  source: ResolvedIntakeCategorySource;
}

function textCategoryFromParse(sourceText: string): ReturnType<typeof normalizeCategoryPair> {
  const registry = matchCategoryFromLegacyRules(sourceText);
  if (registry && registry.confidence >= REGISTRY_CATEGORY_OVERRIDE_THRESHOLD) {
    return normalizeCategoryPair(registry.categorySlug, registry.subcategorySlug);
  }

  const parsed = parseIntentFromText(sourceText);
  const suggestions = suggestNeedCategoriesFromText(sourceText, 1);
  if (suggestions[0]?.slug) {
    return normalizeCategoryPair(suggestions[0].slug);
  }
  if (registry) {
    return normalizeCategoryPair(registry.categorySlug, registry.subcategorySlug);
  }
  return normalizeCategoryPair(parsed.categorySlug, parsed.subcategorySlug);
}

/** Text-first category when form choice conflicts with confident vertical classification. */
export function resolveIntakeCategory(input: ResolveIntakeCategoryInput): ResolvedIntakeCategory {
  const { sourceText, categoryLockedByUser } = input;
  const formSub = input.formSubcategorySlug?.trim() ?? '';
  const formCat = input.formCategorySlug?.trim() ?? '';
  const formLeaf = formSub || formCat;

  const textPair = textCategoryFromParse(sourceText);
  const classification = classifyVertical(sourceText);
  const textConfident = isVerticalConfident(classification);

  if (categoryLockedByUser && formLeaf) {
    const pair = normalizeCategoryPair(formCat || formLeaf, formSub || undefined);
    return {
      categorySlug: pair.categorySlug,
      subcategorySlug: pair.subcategorySlug,
      source: 'form',
    };
  }

  const commercialCandidates = getBusinessCommercialPropertyCandidates(sourceText);
  if (commercialCandidates.length > 1) {
    const parents = [...new Set(
      commercialCandidates.map((slug) => normalizeCategoryPair(slug).categorySlug)
    )];
    // The text establishes a commercial property request, but not a unique
    // leaf (or perhaps not even a deal type). Keep the deepest common scope;
    // never let a broad URL hint or the first ranked child decide for the user.
    return {
      categorySlug: parents.length === 1 ? parents[0]! : 'real-estate',
      subcategorySlug: undefined,
      source: 'text',
    };
  }

  if (formLeaf) {
    const formPair = normalizeCategoryPair(formCat || formLeaf, formSub || undefined);
    const formCoherent = isCategoryVerticalCoherent(formPair.categorySlug, classification.vertical);
    const textCoherent = isCategoryVerticalCoherent(textPair.categorySlug, classification.vertical);

    if (!formCoherent && textConfident && textCoherent) {
      return {
        categorySlug: textPair.categorySlug,
        subcategorySlug: textPair.subcategorySlug,
        source: 'text',
      };
    }

    return {
      categorySlug: formPair.categorySlug,
      subcategorySlug: formPair.subcategorySlug,
      source: 'form',
    };
  }

  if (textPair.categorySlug && textPair.categorySlug !== 'general' && textPair.categorySlug !== 'services') {
    return {
      categorySlug: textPair.categorySlug,
      subcategorySlug: textPair.subcategorySlug,
      source: 'text',
    };
  }

  if (textPair.categorySlug) {
    return {
      categorySlug: textPair.categorySlug,
      subcategorySlug: textPair.subcategorySlug,
      source: textPair.categorySlug === 'general' || textPair.categorySlug === 'services' ? 'fallback' : 'text',
    };
  }

  return { categorySlug: 'general', subcategorySlug: undefined, source: 'fallback' };
}
