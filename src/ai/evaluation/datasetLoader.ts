import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface EvaluationExpected {
  category?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  transactionType?: string | null;
}

export interface EvaluationCase {
  text: string;
  expected: EvaluationExpected;
}

const DEFAULT_DATASET_PATH = join(
  process.cwd(),
  'src/intake/fixtures/evaluation-dataset.json'
);

export function loadEvaluationDataset(path = DEFAULT_DATASET_PATH): EvaluationCase[] {
  const raw = readFileSync(path, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`Evaluation dataset must be an array: ${path}`);
  }

  return parsed.map((row, index) => {
    if (!row || typeof row !== 'object') {
      throw new Error(`Invalid row at index ${index}`);
    }
    const record = row as Record<string, unknown>;
    if (typeof record.text !== 'string' || !record.text.trim()) {
      throw new Error(`Missing text at index ${index}`);
    }
    if (!record.expected || typeof record.expected !== 'object') {
      throw new Error(`Missing expected at index ${index}`);
    }
    return {
      text: record.text,
      expected: record.expected as EvaluationExpected,
    };
  });
}
