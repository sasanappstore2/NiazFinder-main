import { buildIntakeIndexesSync } from '@/intake/dictionaries/loader';
import { analyzeNeedText } from '@/intake/engine/intakeEngine';
import { normalizePersian } from '@/intake/normalizer/normalizePersian';
import { tokenize } from '@/intake/tokenizer/tokenize';
import { generateNgrams } from '@/intake/ngrams/generateNgrams';
import { resetAiMetricsForTests } from '@/ai/observability/metrics';
import { resetAiProviderForTests } from '@/ai/router/aiRouter';
import { MockAiProvider } from '@/ai/providers/mockProvider';
import { mergeRuleAndAiEntities } from '@/ai/services/mergeEntities';
import { runSemanticResolver, validateRawAiJson } from '@/ai/services/semanticResolver';
import { buildIntakeCandidates } from '@/ai/services/candidateBuilder';
import { safeParseConstrainedSelection } from '@/ai/schema/extractionSchema';
import type { IntakeEntities } from '@/intake/types';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const TEST_NEIGHBORHOOD_ROWS = [
  {
    cityId: 'mashhad',
    cityName: 'مشهد',
    id: 'faramarz-abbasi',
    name: 'شهید فرامرز عباسی',
    areas: ['فرامرز عباسی', 'فرامرز'],
  },
];

const indexes = buildIntakeIndexesSync(TEST_NEIGHBORHOOD_ROWS);
const sampleText = 'من یک آپارتمان ۱۸۰ متری در فرامرز عباسی میخوام';
const normalizedText = normalizePersian(sampleText);
const tokens = tokenize(normalizedText, { removeStopWords: true });
const ngrams = generateNgrams(tokens);
const ruleResult = analyzeNeedText(sampleText, indexes);
const candidates = buildIntakeCandidates(indexes, tokens, ngrams.all, null, ruleResult);

const catSlug = candidates.categories[0]?.slug ?? 'apartment-rent';
const citySlug = candidates.cities[0]?.slug ?? 'mashhad';

// --- valid constrained selection ---
const validJson = JSON.stringify({
  category: catSlug,
  city: citySlug,
  neighborhood: candidates.neighborhoods[0]?.slug ?? null,
  transactionType: 'RENT',
  budget: null,
  area: 180,
  rooms: 2,
  confidence: 0.92,
});
const valid = validateRawAiJson(validJson, candidates);
assert(valid.extraction != null, 'expected valid extraction');
assert(valid.validated != null, 'expected validated patch');
assert(valid.validated?.area === 180, 'expected area 180');

// --- invalid extraction (slug not in candidates) ---
const invalidJson = JSON.stringify({
  category: 'totally-fake-category-slug',
  city: 'fake-city-slug',
  neighborhood: 'fake-neighborhood-slug',
  transactionType: 'INVALID_TX',
  budget: -5,
  area: -10,
  rooms: 0,
  confidence: 1.5,
});
const invalidParsed = safeParseConstrainedSelection(invalidJson);
assert(invalidParsed === null, 'expected invalid confidence to fail zod');

const invalidJson2 = JSON.stringify({
  category: null,
  city: 'fake-city-slug',
  neighborhood: null,
  transactionType: 'RENT',
  budget: null,
  area: null,
  rooms: null,
  confidence: 0.5,
});
const invalid = validateRawAiJson(invalidJson2, candidates);
assert(invalid.validated?.city == null, 'unknown city slug must be discarded');
assert(invalid.rejects.length > 0, 'expected validation rejects');

// --- malformed JSON ---
assert(safeParseConstrainedSelection('not json at all') === null, 'malformed must fail');
assert(safeParseConstrainedSelection('```json\n{broken\n```') === null, 'broken fence must fail');

// --- legacy subcategory shape maps to category ---
const legacyJson = JSON.stringify({
  subcategory: catSlug,
  city: citySlug,
  neighborhood: null,
  transactionType: 'RENT',
  budget: null,
  area: null,
  rooms: null,
  confidence: 0.8,
});
const legacy = validateRawAiJson(legacyJson, candidates);
assert(legacy.validated?.subcategorySlug === catSlug, 'legacy subcategory must map to category slug');

// --- merge: rule wins ---
const ruleEntities: IntakeEntities = {
  vertical: 'real-estate',
  category: 'apartment',
  categorySlug: 'real-estate',
  subcategorySlug: 'apartment-rent',
  city: 'مشهد',
  citySlug: 'mashhad',
  province: null,
  neighborhood: null,
  neighborhoodSlug: null,
  area: null,
  budgetMin: null,
  budgetMax: null,
  rooms: null,
  transactionType: 'RENT',
};
const merged = mergeRuleAndAiEntities(ruleEntities, {
  category: 'villa',
  categorySlug: 'real-estate',
  subcategorySlug: 'villa-rent',
  area: 180,
});
assert(merged.category === 'apartment', 'rule category must win');
assert(merged.subcategorySlug === 'apartment-rent', 'rule subcategory must win');
assert(merged.area === 180, 'AI fills missing area');

// --- provider unavailable ---
resetAiProviderForTests();
resetAiMetricsForTests();

async function runAsyncTests() {
  const ambiguousRule = analyzeNeedText('xyz ambiguous text only', indexes);

  const timeoutProvider = new MockAiProvider({ shouldFail: true });
  const failResult = await timeoutProvider.resolveIntake({
    text: sampleText,
    normalizedText,
    ruleResult: ambiguousRule,
    candidates,
  });
  assert(failResult.ok === false, 'mock failure expected');
  assert(failResult.error?.code === 'UNAVAILABLE', 'expected unavailable error');

  const mockProvider = new MockAiProvider({ response: validJson });
  const okResult = await mockProvider.resolveIntake({
    text: sampleText,
    normalizedText,
    ruleResult,
    candidates,
  });
  assert(okResult.ok === true, 'mock success expected');
  assert(okResult.extraction?.area === 180, 'mock extraction area');
  assert((okResult.validationRejects?.length ?? 0) === 0, 'expected no validation rejects');

  const resolved = await runSemanticResolver(
    ambiguousRule,
    sampleText,
    indexes,
    tokens,
    ngrams.all,
    { forceAi: true, providerOverride: 'mock' }
  );
  assert(resolved.aiInvoked === true, 'semantic resolver should invoke AI');
  assert(resolved.provider === 'mock', 'expected mock provider');
}

runAsyncTests()
  .then(() => {
    console.log('ai semantic resolver self-test: 12/12 passed');
  })
  .catch((e) => {
    console.error('ai semantic resolver self-test FAILED:', e);
    process.exit(1);
  });
