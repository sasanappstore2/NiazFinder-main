import { NextResponse } from 'next/server';
import { evalFixtures } from '@/lib/need-intake/dataset/eval-dataset';
import { isNeedIntakeDevToolsEnabled } from '@/lib/need-intake/dataset/dev-guard';
import { buildCategoryCoverage } from '@/lib/need-intake/fixtures/category-coverage';
import { DATASET_FIXTURES } from '@/lib/need-intake/fixtures/dataset-cases';

export async function GET() {
  if (!isNeedIntakeDevToolsEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const report = evalFixtures(DATASET_FIXTURES);
  const coverage = buildCategoryCoverage(DATASET_FIXTURES);
  const uncoveredCount = coverage.filter((c) => c.depth === 2 && c.caseCount === 0).length;

  return NextResponse.json({
    report,
    coverageSummary: {
      totalLeafCategories: coverage.filter((c) => c.depth === 2).length,
      uncoveredLeafCount: uncoveredCount,
    },
    fixtureCount: DATASET_FIXTURES.length,
  });
}
