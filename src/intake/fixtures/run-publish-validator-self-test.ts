import type { NeedDraft } from '@/contracts/need-intake';
import { validateNeedDraftForPublish } from '@/intake/validation/publishValidator';
import { createNeedDraftFromAnalysis, recordToEntities } from '@/intake/aggregate/needDraftAggregate';
import type { IntakeEntities } from '@/intake/types';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const apartmentRentEntities: IntakeEntities = {
  vertical: 'real-estate',
  category: 'apartment',
  categorySlug: 'real-estate',
  subcategorySlug: 'apartment-rent',
  city: 'مشهد',
  citySlug: 'mashhad',
  province: 'خراسان رضوی',
  neighborhood: null,
  neighborhoodSlug: null,
  area: null,
  budgetMin: null,
  budgetMax: null,
  rooms: null,
  transactionType: null,
};

const incompleteDraft: NeedDraft = createNeedDraftFromAnalysis(
  {
    entities: apartmentRentEntities,
    confidence: {},
    needType: 'apartment-rent-seeking',
    detectedVertical: 'real-estate',
    detectedCategory: 'apartment',
    missingFields: [{ field: 'transactionType', priority: 100, required: true }],
    nextQuestion: null,
    recommendedQuestions: ['transactionType'],
    completionScore: 40,
    matchabilityScore: 55,
    completionState: 'NEEDS_INFO',
    sections: [],
    normalizedText: '',
    latencyMs: 0,
  },
  'آپارتمان در مشهد میخوام'
);

const missingTransaction = validateNeedDraftForPublish(incompleteDraft);
assert(missingTransaction.success === false, 'expected validation failure');
assert(
  missingTransaction.errors.some((e) => e.field === 'transactionType'),
  'expected transactionType error'
);

const completeEntities: IntakeEntities = {
  ...apartmentRentEntities,
  neighborhood: 'فرامرز عباسی',
  neighborhoodSlug: 'faramarz-abbasi',
  transactionType: 'RENT',
};

const completeDraft: NeedDraft = createNeedDraftFromAnalysis(
  {
    entities: completeEntities,
    confidence: {},
    needType: 'apartment-rent-seeking',
    detectedVertical: 'real-estate',
    detectedCategory: 'apartment',
    missingFields: [],
    nextQuestion: null,
    recommendedQuestions: [],
    completionScore: 100,
    matchabilityScore: 100,
    completionState: 'READY_TO_PUBLISH',
    sections: [],
    normalizedText: '',
    latencyMs: 0,
  },
  'آپارتمان اجاره در فرامرز عباسی مشهد'
);

const completeResult = validateNeedDraftForPublish(completeDraft);
assert(completeResult.success === true, 'expected validation success');
assert(completeResult.errors.length === 0, 'expected no errors');

assert(
  recordToEntities(completeDraft.entities).transactionType === 'RENT',
  'entity round-trip failed'
);

console.log('publish-validator self-test: 4/4 passed');
