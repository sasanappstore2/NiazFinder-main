import type {
  EstateBenchmarkCase,
  EstateExpected,
  EstateParseResult,
} from '@/lib/need-intake/estate/estate-parse-result';
import { ESTATE_FIELD_WEIGHTS } from '@/lib/need-intake/estate/estate-parse-result';

export interface FieldScore {
  field: keyof typeof ESTATE_FIELD_WEIGHTS;
  weight: number;
  score: number;
  passed: boolean;
  detail?: string;
}

export interface CaseScoreResult {
  id: string;
  group: string;
  input: string;
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  fieldScores: FieldScore[];
  actual: EstateParseResult;
  failures: string[];
}

const PASS_THRESHOLD = 85;

function normalizeClarifyKey(key: string): string {
  return key
    .replace(/^location\./, '')
    .replace(/^budget\./, '')
    .replace('dealType', 'intent')
    .replace('propertyKind', 'property_type')
    .replace('budgetMin', 'budget')
    .replace('monthlyRent', 'budget.rent')
    .replace('deposit', 'budget.mortgage');
}

function collectClarifyFields(result: EstateParseResult): Set<string> {
  const keys = new Set<string>();
  for (const c of result.clarifications_needed) {
    keys.add(normalizeClarifyKey(c.field));
  }
  for (const p of result.missing_prerequisites) {
    keys.add(normalizeClarifyKey(p));
  }
  if (result.location.needs_clarification) keys.add('city');
  if (result.location.ambiguous) keys.add('city');
  return keys;
}

function matchOneOf<T>(actual: T, expected: T | T[] | undefined): boolean {
  if (expected === undefined) return true;
  if (Array.isArray(expected)) return expected.includes(actual);
  return actual === expected;
}

function scoreIntent(actual: EstateParseResult, expected: EstateExpected): FieldScore {
  const weight = ESTATE_FIELD_WEIGHTS.intent;
  if (expected.intent === undefined) {
    return { field: 'intent', weight, score: weight, passed: true };
  }
  const ok = matchOneOf(actual.intent, expected.intent);
  return {
    field: 'intent',
    weight,
    score: ok ? weight : 0,
    passed: ok,
    detail: ok ? undefined : `expected ${JSON.stringify(expected.intent)}, got ${actual.intent}`,
  };
}

function scorePropertyType(actual: EstateParseResult, expected: EstateExpected): FieldScore {
  const weight = ESTATE_FIELD_WEIGHTS.property_type;
  if (expected.property_type === undefined) {
    return { field: 'property_type', weight, score: weight, passed: true };
  }
  const ok = matchOneOf(actual.property_type, expected.property_type);
  return {
    field: 'property_type',
    weight,
    score: ok ? weight : 0,
    passed: ok,
    detail: ok
      ? undefined
      : `expected ${JSON.stringify(expected.property_type)}, got ${actual.property_type}`,
  };
}

function scoreLocationCity(actual: EstateParseResult, expected: EstateExpected): FieldScore {
  const weight = ESTATE_FIELD_WEIGHTS.location_city;
  const exp = expected.location;
  if (!exp?.city && exp?.needs_clarification == null && exp?.ambiguous == null) {
    return { field: 'location_city', weight, score: weight, passed: true };
  }
  if (exp?.city) {
    const ok = actual.location.city === exp.city;
    return {
      field: 'location_city',
      weight,
      score: ok ? weight : 0,
      passed: ok,
      detail: ok ? undefined : `expected city ${exp.city}, got ${actual.location.city}`,
    };
  }
  return { field: 'location_city', weight, score: weight, passed: true };
}

function scoreLocationNeighborhood(actual: EstateParseResult, expected: EstateExpected): FieldScore {
  const weight = ESTATE_FIELD_WEIGHTS.location_neighborhood;
  const exp = expected.location?.neighborhood;
  if (!exp) {
    return { field: 'location_neighborhood', weight, score: weight, passed: true };
  }
  const actualN = actual.location.neighborhood ?? '';
  const ok =
    actualN.includes(exp) ||
    exp.includes(actualN) ||
    (actual.location.district?.includes(exp) ?? false);
  return {
    field: 'location_neighborhood',
    weight,
    score: ok ? weight : 0,
    passed: ok,
    detail: ok ? undefined : `expected neighborhood hint ${exp}, got ${actualN}`,
  };
}

function scoreClarifications(actual: EstateParseResult, expected: EstateExpected): FieldScore {
  const weight = ESTATE_FIELD_WEIGHTS.clarifications_asked_correctly;
  const actualKeys = collectClarifyFields(actual);
  let score: number = weight;
  const issues: string[] = [];

  for (const must of expected.must_clarify ?? []) {
    const norm = normalizeClarifyKey(must);
    const hit = [...actualKeys].some(
      (k) => k.includes(norm) || norm.includes(k) || k === must || must.includes(k)
    );
    if (!hit) {
      score -= weight / Math.max(1, (expected.must_clarify ?? []).length);
      issues.push(`missing clarification for ${must}`);
    }
  }

  for (const mustNot of expected.must_not_clarify ?? []) {
    const norm = normalizeClarifyKey(mustNot);
    const hit = [...actualKeys].some((k) => k.includes(norm) || norm.includes(k));
    if (hit) {
      score -= 5;
      issues.push(`unnecessary clarification for ${mustNot}`);
    }
  }

  if (expected.location?.needs_clarification === true) {
    const ok =
      actual.location.needs_clarification ||
      actual.location.ambiguous ||
      actualKeys.has('city');
    if (!ok) {
      score -= weight * 0.5;
      issues.push('location needs_clarification not set');
    }
  }

  if (expected.location?.ambiguous === true && !actual.location.ambiguous) {
    score -= weight * 0.3;
    issues.push('location ambiguous flag not set');
  }

  score = Math.max(0, Math.round(score));
  return {
    field: 'clarifications_asked_correctly',
    weight,
    score,
    passed: score >= weight * 0.7,
    detail: issues.length ? issues.join('; ') : undefined,
  };
}

function withinTolerance(actual: number | null, expected: number | null, tol = 0.05): boolean {
  if (expected == null) return true;
  if (actual == null) return false;
  if (actual === expected) return true;
  const ratio = Math.abs(actual - expected) / Math.max(expected, 1);
  return ratio <= tol;
}

function scoreBudget(actual: EstateParseResult, expected: EstateExpected): FieldScore {
  const weight = ESTATE_FIELD_WEIGHTS.budget;
  const exp = expected.budget;
  if (!exp) return { field: 'budget', weight, score: weight, passed: true };

  let checks = 0;
  let passed = 0;

  if (exp.mortgage?.amount != null) {
    checks++;
    if (withinTolerance(actual.budget.mortgage?.amount ?? null, exp.mortgage.amount)) passed++;
  }
  if (exp.rent?.amount != null) {
    checks++;
    if (withinTolerance(actual.budget.rent?.amount ?? null, exp.rent.amount)) passed++;
  }
  if (exp.purchase_price?.min != null || exp.purchase_price?.max != null) {
    checks++;
    const okMin = withinTolerance(
      actual.budget.purchase_price?.min ?? null,
      exp.purchase_price?.min ?? null
    );
    const okMax = withinTolerance(
      actual.budget.purchase_price?.max ?? null,
      exp.purchase_price?.max ?? null
    );
    if (okMin && okMax) passed++;
  }

  if (checks === 0) return { field: 'budget', weight, score: weight, passed: true };
  const ratio = passed / checks;
  return {
    field: 'budget',
    weight,
    score: Math.round(weight * ratio),
    passed: ratio >= 0.99,
    detail: ratio < 1 ? `budget match ${passed}/${checks}` : undefined,
  };
}

function scoreArea(actual: EstateParseResult, expected: EstateExpected): FieldScore {
  const weight = ESTATE_FIELD_WEIGHTS.area;
  const exp = expected.area;
  if (!exp) return { field: 'area', weight, score: weight, passed: true };

  let ok = true;
  if (exp.exact != null && actual.area.exact !== exp.exact) ok = false;
  if (exp.min != null && actual.area.min !== exp.min && actual.area.exact !== exp.min) ok = false;
  if (exp.max != null && actual.area.max !== exp.max && actual.area.exact !== exp.max) ok = false;

  return {
    field: 'area',
    weight,
    score: ok ? weight : 0,
    passed: ok,
    detail: ok ? undefined : `area mismatch expected ${JSON.stringify(exp)}`,
  };
}

function scoreRooms(actual: EstateParseResult, expected: EstateExpected): FieldScore {
  const weight = ESTATE_FIELD_WEIGHTS.rooms;
  if (expected.rooms === undefined) {
    return { field: 'rooms', weight, score: weight, passed: true };
  }
  const ok = actual.rooms === expected.rooms;
  return {
    field: 'rooms',
    weight,
    score: ok ? weight : 0,
    passed: ok,
    detail: ok ? undefined : `expected ${expected.rooms} rooms, got ${actual.rooms}`,
  };
}

function scoreFeatures(actual: EstateParseResult, expected: EstateExpected): FieldScore {
  const weight = ESTATE_FIELD_WEIGHTS.features;
  const exp = expected.features;
  if (!exp) return { field: 'features', weight, score: weight, passed: true };

  let checks = 0;
  let passed = 0;
  for (const [k, v] of Object.entries(exp)) {
    if (v === undefined) continue;
    checks++;
    const actualVal = actual.features[k as keyof typeof actual.features];
    if (actualVal === v || (v === true && actualVal === true)) passed++;
  }
  if (checks === 0) return { field: 'features', weight, score: weight, passed: true };
  const ratio = passed / checks;
  return {
    field: 'features',
    weight,
    score: Math.round(weight * ratio),
    passed: ratio >= 0.99,
  };
}

function scoreCategory(actual: EstateParseResult, expected: EstateExpected): boolean {
  if (!expected.category) return true;
  return actual.category === expected.category;
}

export function scoreEstateCase(
  testCase: EstateBenchmarkCase,
  actual: EstateParseResult
): CaseScoreResult {
  const fieldScores: FieldScore[] = [
    scoreIntent(actual, testCase.expected),
    scorePropertyType(actual, testCase.expected),
    scoreLocationCity(actual, testCase.expected),
    scoreLocationNeighborhood(actual, testCase.expected),
    scoreClarifications(actual, testCase.expected),
    scoreBudget(actual, testCase.expected),
    scoreArea(actual, testCase.expected),
    scoreRooms(actual, testCase.expected),
    scoreFeatures(actual, testCase.expected),
  ];

  const failures: string[] = [];
  if (!scoreCategory(actual, testCase.expected)) {
    failures.push(`category: expected ${testCase.expected.category}, got ${actual.category}`);
    fieldScores.forEach((f) => {
      f.score = 0;
      f.passed = false;
    });
  } else {
    for (const fs of fieldScores) {
      if (!fs.passed && fs.detail) failures.push(`${fs.field}: ${fs.detail}`);
    }
  }

  const maxScore = fieldScores.reduce((s, f) => s + f.weight, 0);
  const score = fieldScores.reduce((s, f) => s + f.score, 0);
  const percent = Math.round((score / maxScore) * 1000) / 10;

  return {
    id: testCase.id,
    group: testCase.group,
    input: testCase.input,
    score,
    maxScore,
    percent,
    passed: percent >= PASS_THRESHOLD && scoreCategory(actual, testCase.expected),
    fieldScores,
    actual,
    failures,
  };
}

export function aggregateBenchmarkResults(results: CaseScoreResult[]) {
  const byGroup = new Map<string, CaseScoreResult[]>();
  const byField = new Map<string, { total: number; score: number }>();

  for (const r of results) {
    const list = byGroup.get(r.group) ?? [];
    list.push(r);
    byGroup.set(r.group, list);

    for (const fs of r.fieldScores) {
      const cur = byField.get(fs.field) ?? { total: 0, score: 0 };
      cur.total += fs.weight;
      cur.score += fs.score;
      byField.set(fs.field, cur);
    }
  }

  const overall = results.reduce((s, r) => s + r.percent, 0) / Math.max(1, results.length);
  const groupStats = [...byGroup.entries()].map(([group, rows]) => ({
    group,
    count: rows.length,
    percent: Math.round((rows.reduce((s, r) => s + r.percent, 0) / rows.length) * 10) / 10,
    failures: rows.filter((r) => !r.passed).length,
  }));

  const fieldStats = [...byField.entries()].map(([field, v]) => ({
    field,
    percent: Math.round((v.score / v.total) * 1000) / 10,
  }));

  return { overall, groupStats, fieldStats, failCount: results.filter((r) => !r.passed).length };
}
