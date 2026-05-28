import { evalFixtures } from '@/lib/need-intake/dataset/eval-dataset';
import { exportFixturesToFile } from '@/lib/need-intake/dataset/export-jsonl';
import { uncoveredLeafSlugs } from './category-coverage';
import { DATASET_FIXTURES } from './dataset-cases';

const MIN_ACCURACY = 0.75;

export function runDatasetSelfTest(): {
  passed: number;
  failed: string[];
  accuracy: number;
  exportPath?: string;
} {
  const report = evalFixtures(DATASET_FIXTURES);
  const failed: string[] = report.results
    .filter((r) => !r.pass)
    .map((r) => `${r.id}: ${r.errors.join('; ')}`);

  if (report.accuracy < MIN_ACCURACY) {
    failed.push(
      `accuracy ${(report.accuracy * 100).toFixed(1)}% below minimum ${MIN_ACCURACY * 100}%`
    );
  }

  const uncovered = uncoveredLeafSlugs(DATASET_FIXTURES);
  if (uncovered.length > 50) {
    console.warn(`[dataset] ${uncovered.length} leaf categories still without fixtures`);
  }

  let exportPath: string | undefined;
  if (process.env.EXPORT_DATASET === '1') {
    exportPath = exportFixturesToFile(DATASET_FIXTURES);
    console.log(`Exported training JSONL to ${exportPath}`);
  }

  return {
    passed: report.passed,
    failed,
    accuracy: report.accuracy,
    exportPath,
  };
}

const isDirectRun =
  typeof process !== 'undefined' &&
  Boolean(process.argv[1]?.includes('run-dataset-self-test'));

if (isDirectRun) {
  const { passed, failed, accuracy } = runDatasetSelfTest();
  console.log(
    `Dataset eval: ${passed}/${DATASET_FIXTURES.length} passed (${(accuracy * 100).toFixed(1)}%)`
  );
  if (failed.length) {
    console.error('FAILED:\n', failed.join('\n'));
    process.exit(1);
  }
  console.log('OK');
}
