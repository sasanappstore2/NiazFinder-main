#!/usr/bin/env npx tsx
/**
 * Audit + clean existing real-estate 100k JSONL (city slug normalization, re-validate).
 *
 * Run: npm run dataset:audit-real-estate-100k
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { DatasetFixture, DatasetLabels } from '@/lib/need-intake/dataset/schema';
import { NEED_INTAKE_SYSTEM_PROMPT } from '@/lib/need-intake/dataset/schema';
import { buildTrainingRowFromFixture } from '@/lib/need-intake/dataset/build-training-row';
import { cityToSlug } from '@/lib/need-intake/dataset/shared/normalize-city';
import {
  validateRealEstateFixture,
  dedupeRealEstateFixtures,
} from '@/lib/need-intake/dataset/validate-real-estate-fixture';
import {
  REAL_ESTATE_100K_JSONL,
  REAL_ESTATE_100K_HOLDOUT,
  REAL_ESTATE_100K_MANIFEST,
  REAL_ESTATE_100K_MLX_DIR,
} from '@/lib/need-intake/dataset/build-real-estate-100k-dataset';
import { fixturesToJsonl } from '@/lib/need-intake/dataset/export-jsonl';
import { buildMlxSplits, countByTargetSlug } from '@/lib/need-intake/dataset/shared/stratified';
import { CANONICAL_CITIES } from '@/config/locations';

const AUDIT_REPORT = join(
  process.cwd(),
  'data',
  'need-intake-training',
  'real-estate-100k-audit.json'
);

function jsonlToFixtures(path: string): DatasetFixture[] {
  const lines = readFileSync(path, 'utf8').split('\n').filter(Boolean);
  const fixtures: DatasetFixture[] = [];
  for (let i = 0; i < lines.length; i++) {
    const row = JSON.parse(lines[i]!) as {
      messages: Array<{ role: string; content: string }>;
    };
    const system = row.messages.find((m) => m.role === 'system')?.content ?? '';
    const user = row.messages.find((m) => m.role === 'user')?.content ?? '';
    const assistant = row.messages.find((m) => m.role === 'assistant')?.content ?? '';
    if (system !== NEED_INTAKE_SYSTEM_PROMPT) {
      fixtures.push({
        id: `row-${i}`,
        input: user,
        labels: JSON.parse(assistant) as DatasetLabels,
        meta: { source: 'fixture', vertical: 'real-estate', tags: ['audit-import'] },
      });
      continue;
    }
    const labels = JSON.parse(assistant) as DatasetLabels;
    if (labels.city) {
      labels.city = cityToSlug(labels.city) ?? labels.city;
    }
    const isCaptured = /(می\s*خو(?:ام|اهم)|دنبال|نیاز دارم|به دنبال|لازم دارم)/.test(user);
    fixtures.push({
      id: `row-${i}`,
      input: user,
      labels,
      meta: {
        source: isCaptured ? 'captured' : 'fixture',
        vertical: 'real-estate',
        tags: isCaptured ? ['divar-api', 'audit-import'] : ['audit-import'],
      },
    });
  }
  return fixtures;
}

function countByCity(pool: DatasetFixture[]): Record<string, number> {
  const counts = new Map<string, number>();
  for (const f of pool) {
    const cityTag = f.meta?.tags?.find((t) => CANONICAL_CITIES.some((c) => c.slug === t));
    const city = cityTag ?? cityToSlug(f.labels.city) ?? 'unknown';
    counts.set(city, (counts.get(city) ?? 0) + 1);
  }
  return Object.fromEntries(counts);
}

function main(): void {
  const validateOnly = process.argv.includes('--validate');
  console.log(`=== Real-estate 100k audit + clean (validate=${validateOnly}) ===\n`);

  const trainIn = jsonlToFixtures(REAL_ESTATE_100K_JSONL);
  const holdoutIn = jsonlToFixtures(REAL_ESTATE_100K_HOLDOUT);
  console.log(`Loaded: train=${trainIn.length} holdout=${holdoutIn.length}`);

  let train: DatasetFixture[];
  let holdout: DatasetFixture[];
  let rejected = 0;
  const rejectionReasons: Record<string, number> = {};
  const sampleErrors: Array<{ id: string; errors: string[] }> = [];

  if (validateOnly) {
    function filterHealthy(rows: DatasetFixture[]): DatasetFixture[] {
      const healthy: DatasetFixture[] = [];
      for (const f of rows) {
        const errors = validateRealEstateFixture(f);
        if (errors.length === 0) {
          healthy.push(f);
          continue;
        }
        rejected += 1;
        for (const e of errors) {
          rejectionReasons[e] = (rejectionReasons[e] ?? 0) + 1;
        }
        if (sampleErrors.length < 20) {
          sampleErrors.push({ id: f.id, errors });
        }
      }
      return healthy;
    }
    train = dedupeRealEstateFixtures(filterHealthy(trainIn));
    holdout = dedupeRealEstateFixtures(filterHealthy(holdoutIn));
    console.log(`After validate: train=${train.length} holdout=${holdout.length} rejected=${rejected}`);
  } else {
    train = dedupeRealEstateFixtures(trainIn);
    holdout = dedupeRealEstateFixtures(holdoutIn);
    console.log(`Normalize-only: train=${train.length} holdout=${holdout.length}`);
  }

  writeFileSync(REAL_ESTATE_100K_JSONL, fixturesToJsonl(train), 'utf8');
  writeFileSync(REAL_ESTATE_100K_HOLDOUT, fixturesToJsonl(holdout), 'utf8');

  mkdirSync(REAL_ESTATE_100K_MLX_DIR, { recursive: true });
  const splits = buildMlxSplits(train);
  for (const [name, rows] of Object.entries(splits)) {
    writeFileSync(join(REAL_ESTATE_100K_MLX_DIR, `${name}.jsonl`), fixturesToJsonl(rows), 'utf8');
  }

  const report = {
    generatedAt: new Date().toISOString(),
    trainSize: train.length,
    holdoutSize: holdout.length,
    rejected,
    rejectionReasons,
    sampleErrors,
    bySlug: Object.fromEntries(countByTargetSlug(train)),
    byCity: countByCity(train),
    trainPath: REAL_ESTATE_100K_JSONL,
    holdoutPath: REAL_ESTATE_100K_HOLDOUT,
    mlxSplitsDir: REAL_ESTATE_100K_MLX_DIR,
  };

  writeFileSync(AUDIT_REPORT, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nAudit report: ${AUDIT_REPORT}`);
  console.log(`City slugs sample: ${Object.keys(report.byCity).slice(0, 8).join(', ')}...`);

  if (train.length < 99_000) {
    console.error(`\nWARNING: train dropped to ${train.length}. Re-run dataset:real-estate-100k -- --skip-crawl`);
    process.exitCode = 2;
  } else {
    console.log('\nAudit passed — dataset ready for train.');
  }
}

main();
