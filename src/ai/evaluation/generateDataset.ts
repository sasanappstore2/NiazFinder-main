import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildIntakeIndexesSync } from '@/intake/dictionaries/loader';
import { analyzeNeedText } from '@/intake/engine/intakeEngine';
import type { EvaluationCase, EvaluationExpected } from '@/ai/evaluation/datasetLoader';
import { DATASET_FIXTURES } from '@/lib/need-intake/fixtures/dataset-cases';
import { generateRealEstateDataset } from '@/lib/need-intake/dataset/generate-real-estate-dataset';

const NEIGHBORHOOD_ROWS = [
  {
    cityId: 'mashhad',
    cityName: 'مشهد',
    id: 'faramarz-abbasi',
    name: 'شهید فرامرز عباسی',
    areas: ['فرامرز عباسی', 'فرامرز'],
  },
  {
    cityId: 'mashhad',
    cityName: 'مشهد',
    id: 'ahmadabad',
    name: 'احمدآباد',
    areas: ['احمدآباد'],
  },
  {
    cityId: 'mashhad',
    cityName: 'مشهد',
    id: 'sajad',
    name: 'سجاد',
    areas: ['سجاد', 'بلوار سجاد'],
  },
  {
    cityId: 'tehran-city',
    cityName: 'تهران',
    id: 'vanak',
    name: 'ونک',
    areas: ['ونک'],
  },
  {
    cityId: 'tehran-city',
    cityName: 'تهران',
    id: 'elahiyeh',
    name: 'الهیه',
    areas: ['الهیه'],
  },
  {
    cityId: 'isfahan',
    cityName: 'اصفهان',
    id: 'chahar-bagh',
    name: 'چهارباغ',
    areas: ['چهارباغ'],
  },
];

/** Curated gold labels — override rule-engine when we know the intended slug. */
const MANUAL_GOLD: Array<{ text: string; expected: EvaluationExpected; group: string }> = [
  {
    group: 'real-estate',
    text: 'یه آپارتمان 180 متری تو فرامرز عباسی میخوام',
    expected: { category: 'apartment-rent', city: 'mashhad', neighborhood: 'شهید-فرامرز-عباسی' },
  },
  {
    group: 'real-estate',
    text: 'خانه ویلایی در الهیه',
    expected: { category: 'villa-rent', city: 'tehran', neighborhood: 'الهیه' },
  },
  {
    group: 'real-estate',
    text: 'مغازه برای اجاره در احمدآباد',
    expected: { category: 'shop-rent', city: 'mashhad', neighborhood: 'احمدآباد', transactionType: 'RENT' },
  },
  {
    group: 'real-estate',
    text: 'دفتر کار در سجاد',
    expected: { category: 'office-rent', city: 'mashhad', neighborhood: 'سجاد' },
  },
  {
    group: 'vehicles',
    text: 'پژو 207 سقف شیشه ای میخوام',
    expected: { category: 'car', transactionType: 'BUY' },
  },
  {
    group: 'vehicles',
    text: 'سانتافه مدل 2022',
    expected: { category: 'car', transactionType: 'BUY' },
  },
  {
    group: 'vehicles',
    text: 'پراید زیر 300 میلیون',
    expected: { category: 'car', transactionType: 'BUY' },
  },
  {
    group: 'services',
    text: 'لوله کش فوری میخوام',
    expected: { category: 'plumbing' },
  },
  {
    group: 'services',
    text: 'برقکار برای ساختمان',
    expected: { category: 'electrical' },
  },
  {
    group: 'services',
    text: 'تعمیرکار کولر گازی فوری',
    expected: { category: 'repairs' },
  },
  {
    group: 'employment',
    text: 'استخدام برنامه نویس ری اکت',
    expected: { category: 'it-services' },
  },
  {
    group: 'employment',
    text: 'طراح گرافیک دورکار',
    expected: {},
  },
  {
    group: 'employment',
    text: 'حسابدار خانم',
    expected: {},
  },
  {
    group: 'ambiguous',
    text: 'خونه میخوام',
    expected: { category: 'villa-rent' },
  },
  {
    group: 'ambiguous',
    text: 'ماشین خوب میخوام',
    expected: { category: 'car' },
  },
  {
    group: 'ambiguous',
    text: 'یه متخصص نیاز دارم',
    expected: {},
  },
  {
    group: 'ambiguous',
    text: 'دفتر کار لازم دارم',
    expected: { category: 'office-rent' },
  },
];

function labelFromRuleEngine(text: string): EvaluationExpected {
  const indexes = buildIntakeIndexesSync(NEIGHBORHOOD_ROWS);
  const result = analyzeNeedText(text, indexes);
  const expected: EvaluationExpected = {};

  const category = result.entities.subcategorySlug ?? result.entities.categorySlug;
  if (category) expected.category = category;
  if (result.entities.citySlug) expected.city = result.entities.citySlug;
  if (result.entities.neighborhoodSlug) expected.neighborhood = result.entities.neighborhoodSlug;
  if (result.entities.transactionType) expected.transactionType = result.entities.transactionType;

  return expected;
}

function hasAnyExpected(expected: EvaluationExpected): boolean {
  return (
    expected.category != null ||
    expected.city != null ||
    expected.neighborhood != null ||
    expected.transactionType != null
  );
}

function dedupeCases(cases: EvaluationCase[]): EvaluationCase[] {
  const seen = new Set<string>();
  const out: EvaluationCase[] = [];
  for (const row of cases) {
    const key = row.text.trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

export function generateEvaluationDataset(targetCount = 120): EvaluationCase[] {
  const cases: EvaluationCase[] = [];

  for (const row of MANUAL_GOLD) {
    cases.push({ text: row.text, expected: row.expected });
  }

  for (const fixture of DATASET_FIXTURES) {
    const expected = labelFromRuleEngine(fixture.input);
    if (hasAnyExpected(expected)) {
      cases.push({ text: fixture.input, expected });
    }
  }

  const estateRows = generateRealEstateDataset({ targetCount: Math.max(80, targetCount) });
  for (const row of estateRows) {
    const expected = labelFromRuleEngine(row.input);
    if (hasAnyExpected(expected)) {
      cases.push({ text: row.input, expected });
    }
  }

  return dedupeCases(cases).slice(0, targetCount);
}

export function exportEvaluationDataset(
  targetCount = 120,
  outputPath = join(process.cwd(), 'src/intake/fixtures/evaluation-dataset.json')
): { path: string; count: number; byGroup: Record<string, number> } {
  const dataset = generateEvaluationDataset(targetCount);
  writeFileSync(outputPath, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8');

  const byGroup: Record<string, number> = {
    manual: MANUAL_GOLD.length,
    fixtures: DATASET_FIXTURES.length,
    exported: dataset.length,
  };

  return { path: outputPath, count: dataset.length, byGroup };
}

const isDirectRun =
  typeof process !== 'undefined' &&
  Boolean(process.argv[1]?.includes('generateDataset'));

if (isDirectRun) {
  const target = Number(process.env.EVAL_DATASET_SIZE ?? 120);
  const result = exportEvaluationDataset(target);
  console.log(`Generated ${result.count} evaluation cases → ${result.path}`);
  if (result.count < 100) {
    console.error('Expected at least 100 cases');
    process.exit(1);
  }
}
