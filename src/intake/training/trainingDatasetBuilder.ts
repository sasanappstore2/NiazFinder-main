import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { db } from '@/lib/db';
import {
  entitySlugSummary,
  type GoldDatasetEntry,
} from '@/intake/training/trainingExample';

const DEFAULT_OUTPUT = join(process.cwd(), 'data/gold-intake-dataset.json');

function entitiesFromExample(
  corrected: unknown | null,
  finalEntities: unknown
): Record<string, unknown> {
  if (corrected && typeof corrected === 'object') {
    return corrected as Record<string, unknown>;
  }
  if (finalEntities && typeof finalEntities === 'object') {
    return finalEntities as Record<string, unknown>;
  }
  return {};
}

export async function buildGoldDatasetFromDb(): Promise<GoldDatasetEntry[]> {
  const rows = await db.intakeTrainingExample.findMany({
    where: { reviewed: true },
    orderBy: { publishedAt: 'desc' },
  });

  return rows.map((row) => {
    const entities = entitiesFromExample(row.correctedEntities, row.finalEntities);
    const summary = entitySlugSummary(entities);
    return {
      text: row.sourceText,
      expected: {
        category: summary.category,
        city: summary.city,
        neighborhood: summary.neighborhood,
        transactionType: summary.transactionType,
        vertical: summary.vertical,
      },
      sourceExampleId: row.id,
    };
  });
}

export async function exportGoldDataset(
  outputPath = DEFAULT_OUTPUT
): Promise<{ path: string; count: number }> {
  const dataset = await buildGoldDatasetFromDb();
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8');
  return { path: outputPath, count: dataset.length };
}

const isDirectRun =
  typeof process !== 'undefined' &&
  Boolean(process.argv[1]?.includes('trainingDatasetBuilder'));

if (isDirectRun) {
  exportGoldDataset()
    .then(({ path, count }) => {
      console.log(`Gold dataset: ${count} reviewed examples → ${path}`);
      if (count === 0) {
        console.warn('No reviewed examples yet — review training queue in admin first.');
      }
    })
    .catch((err) => {
      console.error('build:gold-dataset failed:', err);
      process.exit(1);
    });
}
