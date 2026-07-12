import { createNeedDraftFromAnalysis } from '@/intake/aggregate/needDraftAggregate';
import { runPublishShadowMode } from '@/intake/migration/shadow-publish';
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
    templateId: 'residential-rent',
    templateVersion: 1,
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

const aligned = runPublishShadowMode(draft, 'preview-cat', 'preview-sub');
assert(aligned.equal === true, `expected shadow equal, diffs=${JSON.stringify(aligned.diffs)}`);

const drifted: typeof draft = {
  ...draft,
  answers: { ...draft.answers, dealType: '' },
};
const drift = runPublishShadowMode(drifted, 'preview-cat', 'preview-sub');
assert(drift.equal === false, 'expected shadow drift when legacy answers diverge');
assert(
  drift.diffs.some((d) => d.field === 'transactionType' || d.field === 'dealType'),
  `expected transaction/deal diff, got ${JSON.stringify(drift.diffs)}`
);

console.log('shadow-publish self-test: 3/3 passed');
