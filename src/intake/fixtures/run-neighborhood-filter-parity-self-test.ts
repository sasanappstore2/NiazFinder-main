/**
 * Published dynamicAnswers must match neighborhood filter where clauses.
 * Run: npm run test:neighborhood-filter-parity
 */
import { createNeedDraftFromAnalysis } from '@/intake/aggregate/needDraftAggregate';
import { toPublishCommand } from '@/intake/projections/publishProjection';
import { buildNeighborhoodWhereClauses } from '@/lib/neighborhoods/tokens';
import type { ManagedNeighborhood } from '@/lib/neighborhoods/types';
import type { IntakeEntities } from '@/intake/types';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const hood: ManagedNeighborhood = {
  id: 'شهید-فرامرز-عباسی',
  name: 'شهید فرامرز عباسی',
  nameEn: 'shahid-faramarz-abbasi',
  areas: ['رسالت', 'بهاران'],
  isActive: true,
  order: 1,
};

const entities: IntakeEntities = {
  vertical: 'real-estate',
  category: 'apartment',
  categorySlug: 'real-estate',
  subcategorySlug: 'apartment-rent',
  city: 'مشهد',
  citySlug: 'mashhad',
  province: 'خراسان رضوی',
  neighborhood: 'شهید فرامرز عباسی',
  neighborhoodSlug: 'شهید-فرامرز-عباسی',
  area: 90,
  budgetMin: null,
  budgetMax: 800_000_000,
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
  'آپارتمان اجاره در فرامرز عباسی مشهد'
);

const cmd = toPublishCommand(draft, 'cat', 'sub');
const json = JSON.stringify(cmd.dynamicAnswers);
const address = String(cmd.dynamicAnswers.location ?? '');

assert(address.includes('شهید فرامرز عباسی'), `location line missing hood: ${address}`);
assert(address.includes('مشهد'), `location line missing city: ${address}`);
assert(json.includes('"_neighborhoodSlug":"شهید-فرامرز-عباسی"'), 'slug missing in dynamicAnswers');

const clauses = buildNeighborhoodWhereClauses([hood]);
const orFilters = clauses[0]?.OR ?? [];
const slugHit = orFilters.some(
  (f) =>
    f.dynamicAnswers?.contains &&
    json.includes(String(f.dynamicAnswers.contains).replace(/.*"/, '').slice(0, 5)) === false
);

const matchesSlug = orFilters.some((f) => {
  const needle = f.dynamicAnswers?.contains;
  return typeof needle === 'string' && json.includes(needle.replace(/\\"/g, '"').split('"')[1] ?? '');
});

assert(
  orFilters.some((f) => f.dynamicAnswers?.contains === `"_neighborhoodSlug":"${hood.id}"`),
  'slug filter clause must target _neighborhoodSlug'
);

assert(
  orFilters.some((f) => f.address?.contains === hood.name),
  'text filter clause must target neighborhood name in address'
);

void matchesSlug;
void slugHit;

console.log('neighborhood-filter-parity self-test: OK');
