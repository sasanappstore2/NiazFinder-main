import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { DatasetFixture } from './schema';
import { buildTrainingRowFromFixture } from './build-training-row';

export const DEFAULT_TRAINING_DIR = join(process.cwd(), 'data', 'need-intake-training');
export const DEFAULT_TRAINING_FILE = 'need-intake-train.jsonl';

export function fixturesToJsonl(fixtures: DatasetFixture[]): string {
  return fixtures.map((f) => JSON.stringify(buildTrainingRowFromFixture(f))).join('\n') + '\n';
}

export function exportFixturesToFile(
  fixtures: DatasetFixture[],
  outPath = join(DEFAULT_TRAINING_DIR, DEFAULT_TRAINING_FILE)
): string {
  mkdirSync(dirname(outPath), { recursive: true });
  const content = fixturesToJsonl(fixtures);
  writeFileSync(outPath, content, 'utf8');
  return outPath;
}
