import { mkdirSync, writeFileSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fetchExamplesForExport } from '@/intake/training/trainingRepository';
import { splitTrainVal, toMlxTrainingRow } from '@/intake/training/exportMlx';
import type { TrainingExportFormat } from '@/intake/training/types';
import type { DatasetFixture } from '@/lib/need-intake/dataset/schema';

const ROOT = process.cwd();
const EXPORT_DIR = join(ROOT, 'data', 'training-exports');

export interface BuildGoldDatasetOptions {
  reviewedOnly?: boolean;
  format?: TrainingExportFormat;
  outputDir?: string;
  limit?: number;
}

export interface BuildGoldDatasetResult {
  format: TrainingExportFormat;
  trainPath: string;
  valPath?: string;
  manifestPath: string;
  trainCount: number;
  valCount: number;
  exportedAt: string;
  totalSource: number;
}

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

function labelsFromExample(row: {
  sourceText: string;
  correctedEntities: unknown;
  finalEntities: unknown;
  qualityFlags: string[];
}) {
  const entities =
    (row.correctedEntities as Record<string, unknown> | null) ??
    (row.finalEntities as Record<string, unknown>);
  return { sourceText: row.sourceText, entities, humanVerified: row.qualityFlags.includes('human_verified') };
}

export async function buildGoldDataset(
  opts: BuildGoldDatasetOptions = {}
): Promise<BuildGoldDatasetResult> {
  const format = opts.format ?? 'mlx-jsonl';
  const reviewedOnly = opts.reviewedOnly ?? true;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = opts.outputDir ?? join(EXPORT_DIR, stamp);
  ensureDir(outDir);

  const rows = await fetchExamplesForExport({
    reviewedOnly,
    limit: opts.limit ?? 50_000,
  });

  const exportedAt = new Date().toISOString();
  const manifestBase = {
    exportedAt,
    format,
    reviewedOnly,
    totalSource: rows.length,
  };

  if (format === 'raw-jsonl') {
    const rawPath = join(outDir, 'intake-training-raw.jsonl');
    const lines = rows.map((r) => JSON.stringify(r)).join('\n');
    writeFileSync(rawPath, lines.length ? `${lines}\n` : '');
    const manifestPath = join(outDir, 'manifest.json');
    writeFileSync(manifestPath, JSON.stringify({ ...manifestBase, rawPath }, null, 2));
    return {
      format,
      trainPath: rawPath,
      manifestPath,
      trainCount: rows.length,
      valCount: 0,
      exportedAt,
      totalSource: rows.length,
    };
  }

  if (format === 'dataset-fixtures') {
    const fixtures: DatasetFixture[] = rows.map((r, i) => {
      const { sourceText, entities } = labelsFromExample(r);
      const payload = entities as Record<string, unknown>;
      return {
        id: `captured-${r.id}`,
        input: sourceText,
        labels: {
          intentType: (payload.intentType as DatasetFixture['labels']['intentType']) ?? 'service_request',
          categorySlug: String(payload.categorySlug ?? payload.category ?? 'general'),
          subcategorySlug: payload.subcategorySlug ? String(payload.subcategorySlug) : undefined,
          entities: Object.fromEntries(
            Object.entries(payload).filter(
              ([k, v]) =>
                typeof v === 'string' &&
                !['categorySlug', 'subcategorySlug', 'city', 'intentType'].includes(k)
            )
          ) as Record<string, string>,
          city: payload.city ? String(payload.city) : undefined,
          budgetMin: payload.budgetMin != null ? Number(payload.budgetMin) : undefined,
          budgetMax: payload.budgetMax != null ? Number(payload.budgetMax) : undefined,
        },
        meta: { source: 'captured', tags: r.qualityFlags },
      };
    });
    const fixturePath = join(outDir, 'intake-training-fixtures.json');
    writeFileSync(fixturePath, JSON.stringify(fixtures, null, 2));
    const manifestPath = join(outDir, 'manifest.json');
    writeFileSync(
      manifestPath,
      JSON.stringify({ ...manifestBase, fixturePath, trainCount: fixtures.length }, null, 2)
    );
    return {
      format,
      trainPath: fixturePath,
      manifestPath,
      trainCount: fixtures.length,
      valCount: 0,
      exportedAt,
      totalSource: rows.length,
    };
  }

  const prioritized = [...rows].sort((a, b) => {
    const aScore = a.qualityFlags.includes('human_verified') ? 1 : 0;
    const bScore = b.qualityFlags.includes('human_verified') ? 1 : 0;
    return bScore - aScore;
  });

  const mlxRows = prioritized.map((r) => {
    const { sourceText, entities } = labelsFromExample(r);
    return toMlxTrainingRow(sourceText, entities as Record<string, unknown>);
  });

  const { train, val } = splitTrainVal(mlxRows, 0.1, 42);
  const trainPath = join(outDir, 'intake-finetune-train.jsonl');
  const valPath = join(outDir, 'intake-finetune-val.jsonl');
  writeFileSync(
    trainPath,
    train.map((r) => JSON.stringify(r)).join('\n') + (train.length ? '\n' : '')
  );
  writeFileSync(
    valPath,
    val.map((r) => JSON.stringify(r)).join('\n') + (val.length ? '\n' : '')
  );
  const manifestPath = join(outDir, 'manifest.json');
  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        ...manifestBase,
        trainPath,
        valPath,
        trainCount: train.length,
        valCount: val.length,
        splitSeed: 42,
        valRatio: 0.1,
      },
      null,
      2
    )
  );

  return {
    format,
    trainPath,
    valPath,
    manifestPath,
    trainCount: train.length,
    valCount: val.length,
    exportedAt,
    totalSource: rows.length,
  };
}

export function listRecentExports(limit = 10): Array<{ dir: string; manifestPath: string; exportedAt?: string }> {
  try {
    ensureDir(EXPORT_DIR);
    const dirs = readdirSync(EXPORT_DIR)
      .map((name) => {
        const full = join(EXPORT_DIR, name);
        try {
          return { name, full, mtime: statSync(full).mtimeMs };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Array<{ name: string; full: string; mtime: number }>;

    return dirs
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, limit)
      .map((d) => {
        const manifestPath = join(d.full, 'manifest.json');
        let exportedAt: string | undefined;
        try {
          const raw = readFileSync(manifestPath, 'utf8');
          exportedAt = (JSON.parse(raw) as { exportedAt?: string }).exportedAt;
        } catch {
          /* ignore */
        }
        return { dir: d.name, manifestPath, exportedAt };
      });
  } catch {
    return [];
  }
}

async function main(): Promise<void> {
  const reviewedOnly = !process.argv.includes('--all');
  const result = await buildGoldDataset({ reviewedOnly, format: 'mlx-jsonl' });
  console.log(JSON.stringify(result, null, 2));
}

const isDirectRun = process.argv[1]?.includes('trainingDatasetBuilder');
if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
