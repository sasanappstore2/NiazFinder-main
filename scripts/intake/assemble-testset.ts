/**
 * Assemble the generated chunks into one validated test set.
 *
 * - Prefers verified/chunk-N.jsonl where it exists, else gen/chunk-N.jsonl.
 * - Validates each row: JSON shape, categorySlug is a real leaf, vertical matches.
 * - Dedups by normalized text.
 * - Writes data/intake-testset/testset.json in the harness format
 *   ({ version, cases: [{ id, text, tone, expect: { vertical, categorySlug } }] }).
 *
 * Usage: npx --yes tsx scripts/intake/assemble-testset.ts
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CANONICAL_CATEGORIES, getCategoryPath } from '@/config/categories';

const ROOT = process.cwd();
const GEN_DIR = join(ROOT, 'data/intake-testset/gen');
const VER_DIR = join(ROOT, 'data/intake-testset/verified');
const OUT = join(ROOT, 'data/intake-testset/testset.json');

const hasChild = new Set<string>();
for (const c of CANONICAL_CATEGORIES) if (c.parentSlug) hasChild.add(c.parentSlug);
const leafSlugs = new Map<string, string>(); // slug -> vertical
for (const c of CANONICAL_CATEGORIES) {
  if (c.depth === 2 || (c.depth === 1 && !hasChild.has(c.slug))) {
    leafSlugs.set(c.slug, getCategoryPath(c.slug)[0]?.slug ?? '');
  }
}

function chunkFiles(): string[] {
  const verified = new Set(
    existsSync(VER_DIR) ? readdirSync(VER_DIR).filter((f) => f.endsWith('.jsonl')) : []
  );
  const out: string[] = [];
  if (existsSync(GEN_DIR)) {
    for (const f of readdirSync(GEN_DIR)) {
      if (!f.endsWith('.jsonl')) continue;
      out.push(verified.has(f) ? join(VER_DIR, f) : join(GEN_DIR, f));
    }
  }
  return out;
}

function norm(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

const cases: Array<{ id: string; text: string; tone: string; expect: { vertical: string; categorySlug: string } }> = [];
const seen = new Set<string>();
const drops = { badJson: 0, missing: 0, badSlug: 0, verticalMismatch: 0, dup: 0 };
const perTone = new Map<string, number>();
const perVertical = new Map<string, number>();
let fromVerified = 0;

for (const file of chunkFiles()) {
  const isVerified = file.includes('/verified/');
  const lines = readFileSync(file, 'utf8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    let row: { text?: string; categorySlug?: string; vertical?: string; tone?: string };
    try {
      row = JSON.parse(t);
    } catch {
      drops.badJson += 1;
      continue;
    }
    const { text, categorySlug, tone } = row;
    if (!text || !categorySlug) {
      drops.missing += 1;
      continue;
    }
    const expectedVertical = leafSlugs.get(categorySlug);
    if (!expectedVertical) {
      drops.badSlug += 1;
      continue;
    }
    if (row.vertical && row.vertical !== expectedVertical) {
      drops.verticalMismatch += 1;
      continue;
    }
    const key = norm(text);
    if (seen.has(key)) {
      drops.dup += 1;
      continue;
    }
    seen.add(key);
    const toneKey = tone ?? 'unknown';
    cases.push({
      id: `${categorySlug}-${toneKey}-${cases.length}`,
      text,
      tone: toneKey,
      expect: { vertical: expectedVertical, categorySlug },
    });
    if (isVerified) fromVerified += 1;
    perTone.set(toneKey, (perTone.get(toneKey) ?? 0) + 1);
    perVertical.set(expectedVertical, (perVertical.get(expectedVertical) ?? 0) + 1);
  }
}

writeFileSync(OUT, JSON.stringify({ version: 1, count: cases.length, cases }, null, 0));

console.log(`\nassembled ${cases.length} cases -> ${OUT}`);
console.log(`  (${fromVerified} from LLM-verified chunks, rest gen-only)`);
console.log(`  distinct categories covered: ${new Set(cases.map((c) => c.expect.categorySlug)).size}/${leafSlugs.size}`);
console.log(`  drops:`, drops);
console.log(`  per tone:`, Object.fromEntries([...perTone.entries()].sort()));
console.log(`  per vertical:`, Object.fromEntries([...perVertical.entries()].sort()));
