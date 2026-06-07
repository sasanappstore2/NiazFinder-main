#!/usr/bin/env npx tsx
/**
 * Merge real-estate need dataset + estate knowledge chat dataset for training.
 *
 * Output: data/need-intake-training/need-intake-estate-combined.jsonl
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'data', 'need-intake-training', 'need-intake-estate-combined.jsonl');
const SOURCES = [
  join(process.cwd(), 'data', 'need-intake-training', 'need-intake-real-estate-100k.jsonl'),
  join(process.cwd(), 'data', 'need-intake-training', 'estate-knowledge-10k.jsonl'),
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

  for (const src of SOURCES) {
    const lines = loadLines(src);
    console.log(`${src}: ${lines.length} rows`);
    for (const line of lines) {
      if (seen.has(line)) continue;
      seen.add(line);
      merged.push(line);
    }
  }

  mkdirSync(join(process.cwd(), 'data', 'need-intake-training'), { recursive: true });
  writeFileSync(OUT, merged.join('\n') + '\n', 'utf8');
  console.log(`Merged: ${merged.length} rows → ${OUT}`);
}

main();
