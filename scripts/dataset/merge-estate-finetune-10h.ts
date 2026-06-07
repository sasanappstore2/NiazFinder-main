#!/usr/bin/env npx tsx
/**
 * Merge estate benchmark train + real-estate 100k + divar-1k for 10h fine-tune.
 *
 * Output: data/need-intake-training/need-intake-estate-finetune-10h.jsonl
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'data/need-intake-training/need-intake-estate-finetune-10h.jsonl');
const MANIFEST = join(process.cwd(), 'data/need-intake-training/estate-finetune-10h-manifest.json');

const SOURCES: Array<{ path: string; required?: boolean; allowDuplicates?: boolean }> = [
  {
    path: join(process.cwd(), 'data/need-intake-training/need-intake-estate-benchmark-train.jsonl'),
    required: true,
    allowDuplicates: true,
  },
  {
    path: join(process.cwd(), 'data/need-intake-training/need-intake-real-estate-100k.jsonl'),
    required: true,
  },
  {
    path: join(process.cwd(), 'data/need-intake-training/need-intake-divar-1k.jsonl'),
    required: false,
  },
  {
    path: join(process.cwd(), 'data/need-intake-training/need-intake-retrain-v2.jsonl'),
    required: false,
  },
];

function loadLines(path: string): string[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

function main(): void {
  const seen = new Set<string>();
  const merged: string[] = [];
  const stats: Record<string, number> = {};

  for (const { path, required, allowDuplicates } of SOURCES) {
    if (!existsSync(path)) {
      if (required) {
        console.error(`Missing required: ${path}`);
        process.exit(1);
      }
      continue;
    }
    const lines = loadLines(path);
    let added = 0;
    for (const line of lines) {
      if (!allowDuplicates) {
        if (seen.has(line)) continue;
        seen.add(line);
      }
      merged.push(line);
      added++;
    }
    stats[path] = added;
    console.log(`${path}: +${added} (total ${merged.length})`);
  }

  mkdirSync(join(process.cwd(), 'data/need-intake-training'), { recursive: true });
  writeFileSync(OUT, merged.join('\n') + '\n', 'utf8');
  writeFileSync(
    MANIFEST,
    JSON.stringify({ output: OUT, totalRows: merged.length, sources: stats, createdAt: new Date().toISOString() }, null, 2),
    'utf8'
  );
  console.log(`Merged ${merged.length} rows → ${OUT}`);
}

main();
