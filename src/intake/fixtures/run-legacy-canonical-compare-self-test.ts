import {
  createNeedDraftFromAnalysis,
  recomputeNeedDraft,
} from '@/intake/aggregate/needDraftAggregate';
import { compareLegacyAndCanonical } from '@/intake/legacy/compareLegacyAndCanonical';
import type { IntakeEntities } from '@/intake/types';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const entities: IntakeEntities = {
  vertical: 'real-estate',
  category: 'apartment',
  categorySlug: 'real-estate',
  subcategorySlug: 'apartment-rent',
  city: 'مشهد',
  citySlug: 'mashhad',
  province: 'خراسان رضوی',
  neighborhood: 'فرامرز عباسی',
  neighborhoodSlug: 'faramarz-abbasi',
  area: 120,
  budgetMin: null,
  budgetMax: 1_000_000_000,
  rooms: 2,
  transactionType: 'RENT',
};

const draft = createNeedDraftFromAnalysis(
  {
    entities,
    confidence: {},
    needType: 'apartment-rent-seeking',
    detectedVertical: 'real-estate',
    detectedCategory: 'apartment',
    missingFields: [],
    nextQuestion: null,
    recommendedQuestions: [],
    completionScore: 100,
    matchabilityScore: 90,
    completionState: 'READY_TO_PUBLISH',
    sections: [],
    normalizedText: '',
    latencyMs: 0,
  },
  'آپارتمان دو خواب اجاره در فرامرز عباسی مشهد'
);

const aligned = compareLegacyAndCanonical(draft);
assert(aligned.equal === true, `expected aligned draft, diffs=${JSON.stringify(aligned.diffs)}`);

const drifted = {
  ...draft,
  answers: { ...draft.answers, dealType: '' },
};
const drift = compareLegacyAndCanonical(drifted);
assert(drift.equal === false, 'expected drift detection');
assert(
  drift.diffs.some((d) => d.field === 'answers.dealType'),
  'expected answers.dealType diff'
);

const withAdvancedFilters = recomputeNeedDraft({
  ...draft,
  answers: {
    ...draft.answers,
    condition: 'new',
    storage: '128',
    ram: '16',
    amenities: ['parking', 'elevator'],
  },
});
assert(withAdvancedFilters.answers.condition === 'new', 'condition chip answer should persist recompute');
assert(withAdvancedFilters.answers.storage === '128', 'storage chip answer should persist recompute');
assert(withAdvancedFilters.answers.ram === '16', 'ram chip answer should persist recompute');
assert(
  Array.isArray(withAdvancedFilters.answers.amenities) &&
    withAdvancedFilters.answers.amenities.includes('parking'),
  'multi chip answers should persist recompute'
);

console.log('legacy-canonical compare self-test: 7/7 passed');
