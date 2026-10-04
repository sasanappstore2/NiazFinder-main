import { POST_NATURAL_PERSIAN_DATASET, type PostNaturalExpected } from './post-natural-persian-dataset';
import { extractPostNaturalFields, type DeterministicPostExtraction } from '@/lib/need-intake/laya/post-natural-extractor';

type Metric = { total: number; correct: number; falsePositive: number; falseNegative: number };

const KEYS: Array<keyof PostNaturalExpected> = [
  'area',
  'rooms',
  'budgetMin',
  'budgetMax',
  'rahnAmount',
  'monthlyRent',
  'transactionType',
  'propertyKind',
  'city',
  'neighborhood',
  'amenities',
  'categoryIncludes',
];

function present(actual: unknown): boolean {
  return actual != null && actual !== '' && (!Array.isArray(actual) || actual.length > 0);
}

function actualValue(result: DeterministicPostExtraction, key: keyof PostNaturalExpected): unknown {
  if (key === 'city') return result.cityCandidate;
  if (key === 'neighborhood') return result.neighborhoodPhrase;
  if (key === 'amenities') return result.answers.amenities;
  if (key === 'categoryIncludes') return result.categoryCandidates.map((candidate) => candidate.slug);
  return result.entities[key];
}

function sameValue(actual: unknown, expected: unknown, key: keyof PostNaturalExpected): boolean {
  if (key === 'amenities') {
    const a = Array.isArray(actual) ? actual : [];
    const e = Array.isArray(expected) ? expected : [];
    return e.every((item) => a.includes(item));
  }
  if (key === 'categoryIncludes') {
    const a = Array.isArray(actual) ? actual : [];
    const e = Array.isArray(expected) ? expected : [];
    return e.some((item) => a.includes(item));
  }
  if (key === 'neighborhood') {
    const normalize = (value: unknown) => String(value ?? '').replace(/[\u200c\s-]/gu, '');
    return normalize(actual) === normalize(expected);
  }
  return actual === expected;
}

function metric(): Metric {
  return { total: 0, correct: 0, falsePositive: 0, falseNegative: 0 };
}

const metrics = Object.fromEntries(KEYS.map((key) => [key, metric()])) as Record<string, Metric>;
let casesWithErrors = 0;
const categoryFailures: Array<{ id: string; expected: string[]; actual: string[] }> = [];

for (const item of POST_NATURAL_PERSIAN_DATASET) {
  const result = extractPostNaturalFields(item.text);
  const expectedCategories = item.expected.categoryIncludes;
  if (
    expectedCategories?.length &&
    !expectedCategories.some((category) => result.categoryCandidates.some((candidate) => candidate.slug === category))
  ) {
    categoryFailures.push({
      id: item.id,
      expected: expectedCategories,
      actual: result.categoryCandidates.map((candidate) => candidate.slug),
    });
  }
  let hasError = false;
  for (const key of KEYS) {
    const expected = item.expected[key];
    const unknown = item.expected.unknown?.includes(String(key));
    if (expected === undefined && !unknown) continue;
    const m = metrics[key];
    m.total += 1;
    const actual = actualValue(result, key);
    if (unknown) {
      if (present(actual)) {
        m.falsePositive += 1;
        hasError = true;
      } else {
        m.correct += 1;
      }
    } else if (sameValue(actual, expected, key)) {
      m.correct += 1;
    } else {
      m.falseNegative += 1;
      hasError = true;
    }
  }
  if (hasError) casesWithErrors += 1;
}

console.log(`post-natural rules benchmark: ${POST_NATURAL_PERSIAN_DATASET.length} cases`);
for (const key of KEYS) {
  const m = metrics[key];
  if (!m.total) continue;
  const accuracy = ((m.correct / m.total) * 100).toFixed(1);
  console.log(
    `${key}: accuracy=${accuracy}% correct=${m.correct}/${m.total} falsePositive=${m.falsePositive} falseNegative=${m.falseNegative}`
  );
}
console.log(`cases_with_expected_errors=${casesWithErrors}`);
if (categoryFailures.length) console.log(`category_failures=${JSON.stringify(categoryFailures)}`);
console.log('laya_benchmark=not_run (set up the private worker to measure model-backed decisions separately)');
