import {
  postNaturalAnalyzeRequestSchema,
  postNaturalAnalyzeResponseSchema,
} from '@/lib/need-intake/laya/post-natural-contract';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const request = postNaturalAnalyzeRequestSchema.safeParse({
  sourceText: 'آپارتمان ۱۳۵ متری در فردوسی مشهد برای اجاره می‌خواهم.',
  draftRevision: 7,
  cityName: 'مشهد',
  citySlug: 'mashhad',
  categorySlug: 'real-estate',
  categoryLockedByUser: false,
  cityLockedByUser: true,
  lockedFieldKeys: ['city'],
  existingFields: { entities: { area: 135 }, answers: {} },
});
assert(request.success, 'request schema must accept the current client payload');

const response = postNaturalAnalyzeResponseSchema.safeParse({
  schemaVersion: 2,
  requestId: 'post-natural-contract-test',
  revision: 7,
  normalizedText: 'آپارتمان 135 متری در فردوسی مشهد برای اجاره می خواهم.',
  draftPatch: {
    entities: { area: 135, monthlyRent: 50_000_000 },
    answers: { dealType: 'RENT' },
  },
  fields: [
    {
      key: 'area',
      value: 135,
      confidence: 1,
      source: 'deterministic-parser',
      requiresConfirmation: false,
      evidence: '۱۳۵ متر',
    },
    {
      key: 'dealType',
      value: 'RENT',
      confidence: 0.91,
      source: 'laya',
      requiresConfirmation: false,
    },
  ],
  provisionalCategory: {
    slug: 'apartment-rent',
    confidence: 0.84,
    requiresConfirmation: true,
  },
  categoryCandidates: [{ slug: 'apartment-rent', label: 'اجاره آپارتمان' }],
  locationCandidates: [],
  gaps: [],
  warnings: [],
  missingFieldKeys: [],
  laya: {
    status: 'ready',
    model: 'convaiinnovations/laya-multilingual',
    latencyMs: 123,
    usage: { input_tokens: 40 },
  },
  latencyMs: 140,
});
assert(response.success, 'response schema must accept a complete analyzer response');
assert(response.data.fields.length === 2, 'field provenance must survive response parsing');
assert(response.data.laya.model === 'convaiinnovations/laya-multilingual', 'model identity is fixed');

const invalidResponse = postNaturalAnalyzeResponseSchema.safeParse({
  schemaVersion: 2,
  requestId: 'invalid',
  revision: 0,
  normalizedText: 'متن',
  fields: [],
  categoryCandidates: [],
  locationCandidates: [],
  gaps: [],
  warnings: [],
  missingFieldKeys: [],
  laya: { status: 'ready', model: 'another-model', latencyMs: 0 },
  latencyMs: 0,
});
assert(!invalidResponse.success, 'another model must fail the shared contract');

console.log('post natural API contract: ok');
