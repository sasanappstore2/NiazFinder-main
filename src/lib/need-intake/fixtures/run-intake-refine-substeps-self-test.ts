/**
 * Refine sub-step skip logic when city/neighborhood inferred from need text.
 * Run: npx tsx src/lib/need-intake/fixtures/run-intake-refine-substeps-self-test.ts
 */
import type { NeedDraft } from '@/contracts/need-intake';
import { NEED_DRAFT_SCHEMA_VERSION } from '@/contracts/need-intake';
import type { IntakeStepLocationProps } from '@/lib/need-intake/intake-step-location-props';
import {
  refineHasSelectedCity,
  refineNeedsCity,
  resolveRefineSubStep,
  resolveRefineSubStepAfterAdvance,
} from '@/lib/need-intake/intake-refine-substeps';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const baseDraft = {
  schemaVersion: NEED_DRAFT_SCHEMA_VERSION,
  templateId: 'services',
  templateVersion: 1,
  vertical: 'services',
  sourceText: 'ویولون نو در طالقانی تهران',
  entities: {
    categorySlug: 'musical-instruments',
    city: 'تهران',
    neighborhood: 'طالقانی',
  },
  parsedIntent: {
    rawText: 'ویولون نو در طالقانی تهران',
    intentType: 'product_search',
    categorySlug: 'musical-instruments',
    city: 'tehran',
    confidence: 0.9,
    entities: { area: 'طالقانی' },
  },
  answers: {},
  completionScore: 50,
  completionState: 'NEEDS_INFO',
} as unknown as NeedDraft;

function minimalProps(
  overrides: Partial<IntakeStepLocationProps> = {}
): IntakeStepLocationProps {
  return {
    needDraft: baseDraft,
    detailsText: '',
    selectedCategory: 'products',
    selectedSubcategory: 'musical-instruments',
    selectedCity: '',
    selectedNeighborhood: '',
    selectedLeafCategorySlug: 'musical-instruments',
    enabledSections: new Set(['category', 'location']),
    onEnabledSectionsChange: () => undefined,
    intakeDisplaySections: [],
    categorySuggestions: [],
    neighborhoodDisambiguationChips: [],
    locationSuggestionChips: [],
    neighborhoodOptions: [],
    neighborhoodsLoading: false,
    promptNeighborhoodPick: false,
    onPromptNeighborhoodPickHandled: () => undefined,
    myLocationLoading: false,
    aiShardStatus: {},
    aiEnriching: false,
    showField: (field) => ['category', 'city', 'neighborhood'].includes(field),
    isSectionFilled: () => false,
    onBack: () => undefined,
    onContinue: () => undefined,
    onApplyMyLocation: () => undefined,
    onApplyCategorySlug: () => undefined,
    onApplyCategoryFromMegaMenu: () => undefined,
    onApplyCityRecord: () => undefined,
    onApplyCity: () => undefined,
    onApplyNeighborhood: () => undefined,
    onPatchNeedDraftEntities: () => undefined,
    onPatchIntakeAnswer: () => undefined,
    ...overrides,
  };
}

const props = minimalProps();
assert(refineHasSelectedCity(props), 'city inferred from draft');
assert(!refineNeedsCity(props), 'skip city step when draft has city');
assert(resolveRefineSubStep(props) === 'extras', 'skip to extras when city and neighborhood inferred');

const afterCategory = resolveRefineSubStepAfterAdvance(props, 'category');
assert(afterCategory === 'extras', 'advance from category skips city and neighborhood');

const withFormCity = minimalProps({ selectedCity: '\u062A\u0647\u0631\u0627\u0646' });
assert(resolveRefineSubStep(withFormCity) === 'extras', 'form city with inferred neighborhood goes to extras');

console.log('intake-refine-substeps OK');
