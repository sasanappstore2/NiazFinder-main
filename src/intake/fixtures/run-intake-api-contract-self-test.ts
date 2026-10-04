import { intakeAnalyzeResponseSchema } from '@/intake/api/intake.dto';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const response = {
  schemaVersion: 2,
  requestId: 'req-contract-test',
  revision: 4,
  draftPatch: { entities: { area: 180, budgetMin: 55_000_000_000 } },
  provisionalCategory: {
    slug: 'shop-sale',
    confidence: 0.88,
    reason: 'commercial, sale',
  },
  fields: [
    {
      key: 'area',
      value: 180,
      confidence: 0.99,
      source: 'rules',
      requiresConfirmation: false,
    },
    {
      key: 'deedType',
      value: 'commercial',
      confidence: 0.61,
      source: 'llm',
      requiresConfirmation: true,
    },
  ],
  entities: {
    vertical: 'real-estate',
    category: 'shop',
    categorySlug: 'commercial-sale',
    subcategorySlug: 'shop-sale',
    city: 'تهران',
    citySlug: 'tehran',
    province: 'تهران',
    neighborhood: 'ونک',
    neighborhoodSlug: null,
    area: 180,
    budgetMin: 55_000_000_000,
    budgetMax: null,
    rooms: null,
    transactionType: 'SELL',
    deedType: 'commercial',
  },
  confidence: { area: 0.99, budgetMin: 0.96 },
  templateId: 'commercial-sale',
  templateVersion: 1,
  rootSlug: 'real-estate',
  categoryPath: ['commercial-sale', 'shop-sale'],
  detectedVertical: 'real-estate',
  detectedCategory: 'shop',
  missingFields: [],
  recommendedQuestions: [],
  completionScore: 82,
  matchabilityScore: 79,
  completionState: 'ALMOST_READY',
  sections: [],
  nextQuestion: null,
  normalizedText: '...',
  latencyMs: 12,
  fieldMeta: {},
  parseGaps: [],
  warnings: [],
  suggestedFilters: [],
  missingFieldKeys: [],
  categoryCandidates: [],
  cityCandidates: [],
  draft: {},
  agent: {},
  meta: {
    engine: 'intake-rules',
    indexStats: { categories: 1, cities: 1, neighborhoods: 1 },
  },
};

const parsed = intakeAnalyzeResponseSchema.safeParse(response);
assert(parsed.success, 'v2 analyze response must satisfy the shared contract');
assert(parsed.data.fields.length === 2, 'field projections must survive contract parsing');
assert(parsed.data.provisionalCategory?.slug === 'shop-sale', 'category proposal missing');
assert(parsed.data.draftPatch?.entities != null, 'draft patch missing');

console.log('intake analyze API contract: OK');
