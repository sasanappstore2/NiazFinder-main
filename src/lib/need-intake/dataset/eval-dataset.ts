import { parseFromText } from '@/lib/need-intake/internal-orchestrator.server';
import { classifyVertical, type ClassifierVertical } from '@/lib/need-intake/vertical-classifier';
import type { DatasetFixture } from './schema';
import { labelsFromParsedIntent } from './schema';

export interface EvalCaseResult {
  id: string;
  pass: boolean;
  errors: string[];
  input: string;
  expected?: Partial<DatasetFixture>;
  got: {
    intentType: string;
    categorySlug: string;
    subcategorySlug?: string;
    entities: Record<string, string>;
    city?: string;
    confidence: number;
    vertical: ClassifierVertical;
    verticalCertainty: number;
  };
}

export interface EvalReport {
  total: number;
  passed: number;
  failed: number;
  accuracy: number;
  byVertical: Record<string, { total: number; passed: number }>;
  results: EvalCaseResult[];
}

function assertFixture(f: DatasetFixture): string[] {
  const errors: string[] = [];
  const r = parseFromText(f.input);
  const classification = classifyVertical(f.input);
  const categoryHaystack = [r.categorySlug, r.subcategorySlug].filter(Boolean).join(' ');

  if (f.expectIntentPrefix && !r.intentType.startsWith(f.expectIntentPrefix)) {
    errors.push(`intent ${r.intentType} expected prefix ${f.expectIntentPrefix}`);
  }
  if (f.expectCategoryIncludes && !categoryHaystack.includes(f.expectCategoryIncludes)) {
    errors.push(`category ${categoryHaystack} expected includes ${f.expectCategoryIncludes}`);
  }
  if (f.expectDealType && r.entities.dealType !== f.expectDealType) {
    errors.push(`dealType ${r.entities.dealType} expected ${f.expectDealType}`);
  }
  if (f.expectCity && r.city !== f.expectCity) {
    errors.push(`city ${r.city} expected ${f.expectCity}`);
  }
  if (f.expectVertical && classification.vertical !== f.expectVertical) {
    errors.push(`vertical ${classification.vertical} expected ${f.expectVertical}`);
  }
  if (f.minConfidence != null && r.confidence < f.minConfidence) {
    errors.push(`confidence ${r.confidence} below ${f.minConfidence}`);
  }
  if (f.expectAreaMax && r.entities.areaMax !== f.expectAreaMax) {
    errors.push(`areaMax ${r.entities.areaMax} expected ${f.expectAreaMax}`);
  }
  if (f.expectAreaMin && r.entities.areaMin !== f.expectAreaMin) {
    errors.push(`areaMin ${r.entities.areaMin} expected ${f.expectAreaMin}`);
  }
  if (
    f.expectNeighborhoodIncludes &&
    !(r.neighborhoodSlug ?? '').includes(f.expectNeighborhoodIncludes)
  ) {
    errors.push(
      `neighborhoodSlug ${r.neighborhoodSlug} expected includes ${f.expectNeighborhoodIncludes}`
    );
  }

  return errors;
}

export function evalFixtures(fixtures: DatasetFixture[]): EvalReport {
  const results: EvalCaseResult[] = [];
  const byVertical: Record<string, { total: number; passed: number }> = {};

  for (const f of fixtures) {
    const r = parseFromText(f.input);
    const classification = classifyVertical(f.input);
    const errors = assertFixture(f);
    const vertical = f.meta?.vertical ?? classification.vertical;
    if (!byVertical[vertical]) byVertical[vertical] = { total: 0, passed: 0 };
    byVertical[vertical].total += 1;
    if (errors.length === 0) byVertical[vertical].passed += 1;

    results.push({
      id: f.id,
      pass: errors.length === 0,
      errors,
      input: f.input,
      expected: f,
      got: {
        intentType: r.intentType,
        categorySlug: r.categorySlug,
        subcategorySlug: r.subcategorySlug,
        entities: r.entities,
        city: r.city,
        confidence: r.confidence,
        vertical: classification.vertical,
        verticalCertainty: classification.certainty,
      },
    });
  }

  const passed = results.filter((x) => x.pass).length;
  return {
    total: fixtures.length,
    passed,
    failed: fixtures.length - passed,
    accuracy: fixtures.length ? passed / fixtures.length : 1,
    byVertical,
    results,
  };
}

/** Build teacher labels from current rules (for export when labels omitted). */
export function fixtureWithTeacherLabels(f: DatasetFixture): DatasetFixture {
  if (f.labels.intentType) return f;
  const parsed = parseFromText(f.input);
  return { ...f, labels: labelsFromParsedIntent(parsed) };
}
