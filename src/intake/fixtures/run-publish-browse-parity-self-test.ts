/**
 * Publish projection → dynamicAnswers must satisfy browse attribute matchers.
 * Run: npm run test:publish-browse-parity
 */
import { createNeedDraftFromAnalysis } from '@/intake/aggregate/needDraftAggregate';
import { toPublishCommand } from '@/intake/projections/publishProjection';
import { matchesDynamicAnswers } from '@/lib/filters/dynamic-answers-filter';
import type { IntakeEntities } from '@/intake/types';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const estateEntities: IntakeEntities = {
  vertical: 'real-estate',
  category: 'apartment',
  categorySlug: 'real-estate',
  subcategorySlug: 'apartment-rent',
  city: 'مشهد',
  citySlug: 'mashhad',
  province: 'خراسان رضوی',
  neighborhood: 'شهید فرامرز عباسی',
  neighborhoodSlug: 'شهید-فرامرز-عباسی',
  lat: 36.2972,
  lng: 59.6067,
  area: 120,
  budgetMin: null,
  budgetMax: 1_000_000_000,
  rooms: 2,
  transactionType: 'RENT',
};

const draft = createNeedDraftFromAnalysis(
  {
    entities: estateEntities,
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

const cmd = toPublishCommand(draft, 'preview-cat', 'preview-sub');
const json = JSON.stringify(cmd.dynamicAnswers);

assert(
  typeof cmd.dynamicAnswers.dealType === 'string' && cmd.dynamicAnswers.dealType.length > 0,
  `dealType missing in dynamicAnswers: ${json.slice(0, 200)}`
);
assert(cmd.dynamicAnswers.rooms === 2, `rooms missing: ${String(cmd.dynamicAnswers.rooms)}`);
assert(
  matchesDynamicAnswers(json, { dealType: String(cmd.dynamicAnswers.dealType) }),
  'browse dealType filter must match published dynamicAnswers'
);
assert(
  matchesDynamicAnswers(json, { rooms: '2' }),
  'browse rooms filter must match published dynamicAnswers'
);
assert(cmd.lat === 36.2972 && cmd.lng === 59.6067, 'publish command must include map coordinates');
assert(
  cmd.dynamicAnswers._mapLat === 36.2972 && cmd.dynamicAnswers._mapLng === 59.6067,
  'dynamicAnswers must mirror map coordinates for parity'
);

console.log('publish-browse-parity self-test: OK');
