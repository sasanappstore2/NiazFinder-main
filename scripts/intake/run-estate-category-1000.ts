/**
 * Batch 1000-case real-estate CATEGORY eval against the same engine as /post.
 *
 * Default: runCategoryIntentEngine with allowAi=false (live fast path).
 * Optional: --hybrid to also score runHybridIntakePipeline on the same texts.
 *
 * Usage:
 *   npx tsx scripts/intake/run-estate-category-1000.ts
 *   npx tsx scripts/intake/run-estate-category-1000.ts --generate
 *   npx tsx scripts/intake/run-estate-category-1000.ts --limit=36
 *   npx tsx scripts/intake/run-estate-category-1000.ts --hybrid
 */
import '../stress/intake-marathon/stub-server-only';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { EstateParagraphCase } from '@/lib/need-intake/estate/estate-paragraph-types';

const ROOT = process.cwd();
const CORPUS_A = join(ROOT, 'tmp/estate-category-1000/corpus.jsonl');
const CORPUS_B = join(ROOT, 'fixtures/estate-category-1000.jsonl');
const CORPUS_C = join(ROOT, 'fixtures/estate-needs-colloquial-1000.jsonl');
const OUT_DIR = join(ROOT, 'tmp/estate-category-1000');
const ARTIFACT_DIR = '/opt/cursor/artifacts';

interface Row {
  id: string;
  index: number;
  expect: string;
  got: string | null;
  pass: boolean;
  method: string;
  confidence: number | null;
  candidates: string[];
  city: string;
  hood: string;
  textPreview: string;
  latencyMs: number;
}

function parseArgs(argv: string[]) {
  const limitArg = argv.find((a) => a.startsWith('--limit='))?.split('=')[1];
  const fromArg = argv.find((a) => a.startsWith('--from='))?.split('=')[1];
  return {
    generate: argv.includes('--generate'),
    hybrid: argv.includes('--hybrid'),
    limit: limitArg ? Number(limitArg) : undefined,
    from: fromArg ? Number(fromArg) : 1,
  };
}

function loadCorpus(): EstateParagraphCase[] {
  const path = existsSync(CORPUS_A) ? CORPUS_A : existsSync(CORPUS_B) ? CORPUS_B : CORPUS_C;
  if (!existsSync(path)) {
    throw new Error(`Missing corpus. Run: npx tsx scripts/intake/generate-estate-category-1000.ts`);
  }
  return readFileSync(path, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as EstateParagraphCase);
}

function leafOf(slug: string | null | undefined): string | null {
  const s = (slug ?? '').trim();
  return s || null;
}

function applyEnv() {
  process.env.NEED_INTAKE_LOC_SKIP_PRISMA = 'true';
  process.env.NEED_INTAKE_HYBRID_ENABLED = 'true';
  process.env.NEED_INTAKE_RULES_ONLY = 'true';
  process.env.NEED_INTAKE_LLM_ENABLED = 'false';
  process.env.NEED_INTAKE_DISAMBIG_AI_ENABLED = 'false';
  process.env.NEED_INTAKE_INTENT_GIST_ENABLED = 'false';
  process.env.AI_SEMANTIC_RESOLVER_ENABLED = 'false';
  process.env.NEED_INTAKE_TRUTH_VERIFY_ENABLED = 'false';
}

function summarize(rows: Row[]) {
  const byLeaf: Record<string, { n: number; pass: number; misses: Record<string, number> }> = {};
  const confusion: Record<string, number> = {};
  for (const r of rows) {
    const leaf = r.expect;
    byLeaf[leaf] ??= { n: 0, pass: 0, misses: {} };
    byLeaf[leaf].n += 1;
    if (r.pass) byLeaf[leaf].pass += 1;
    else {
      const got = r.got ?? 'null';
      byLeaf[leaf].misses[got] = (byLeaf[leaf].misses[got] ?? 0) + 1;
      const key = `${leaf}→${got}`;
      confusion[key] = (confusion[key] ?? 0) + 1;
    }
  }
  const pass = rows.filter((r) => r.pass).length;
  const confusionTop = Object.entries(confusion)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([pair, n]) => ({ pair, n }));
  const leafTable = Object.entries(byLeaf)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([leaf, s]) => ({
      leaf,
      n: s.n,
      pass: s.pass,
      pct: s.n ? Math.round((1000 * s.pass) / s.n) / 10 : 0,
      topMiss: Object.entries(s.misses).sort((a, b) => b[1] - a[1])[0] ?? null,
    }));
  return {
    total: rows.length,
    pass,
    fail: rows.length - pass,
    pct: rows.length ? Math.round((1000 * pass) / rows.length) / 10 : 0,
    leafTable,
    confusionTop,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(ARTIFACT_DIR, { recursive: true });

  if (args.generate || (!existsSync(CORPUS_A) && !existsSync(CORPUS_B))) {
    const { spawnSync } = await import('node:child_process');
    const gen = spawnSync('npx', ['--yes', 'tsx', 'scripts/intake/generate-estate-category-1000.ts'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: process.env,
    });
    if (gen.status !== 0) {
      console.error(gen.stdout);
      console.error(gen.stderr);
      throw new Error('corpus generate failed');
    }
    console.log(gen.stdout);
  }

  applyEnv();
  const { runCategoryIntentEngine } = await import(
    '@/intake/intelligence-engine/category/category-intent-engine'
  );

  const hybridFn = args.hybrid
    ? (await import('@/intake/intelligence-engine/hybrid/hybrid-pipeline')).runHybridIntakePipeline
    : null;

  const corpus = loadCorpus();
  const slice = corpus.filter((c) => c.index >= args.from).slice(0, args.limit ?? corpus.length);
  const rows: Row[] = [];
  const hybridMisses: Array<{ id: string; expect: string; engine: string | null; hybrid: string | null }> =
    [];

  let i = 0;
  for (const cse of slice) {
    i += 1;
    const expect = cse.oracle.leaf[0]!;
    const t0 = Date.now();
    const engine = await runCategoryIntentEngine({ text: cse.text, allowAi: false });
    const got = leafOf(engine.match?.subcategorySlug ?? engine.match?.categorySlug);
    const pass = got === expect;
    const row: Row = {
      id: cse.id,
      index: cse.index,
      expect,
      got,
      pass,
      method: engine.method,
      confidence: engine.match?.confidence ?? null,
      candidates: engine.candidates.slice(0, 5).map((c) => c.slug),
      city: cse.oracle.city,
      hood: cse.oracle.neighborhood ?? '',
      textPreview: cse.text.slice(0, 220),
      latencyMs: Date.now() - t0,
    };
    rows.push(row);

    if (hybridFn) {
      const hy = await hybridFn({ text: cse.text });
      const hyGot = leafOf(
        String(hy.fields.subcategorySlug?.value ?? hy.fields.categorySlug?.value ?? '')
      );
      if (hyGot !== got) {
        hybridMisses.push({ id: cse.id, expect, engine: got, hybrid: hyGot });
      }
    }

    if (i % 100 === 0) {
      const soFar = summarize(rows);
      console.log(`progress ${i}/${slice.length} category=${soFar.pct}%`);
    }
  }

  const summary = summarize(rows);
  const failures = rows.filter((r) => !r.pass);
  const report = {
    at: new Date().toISOString(),
    mode: 'category-intent-engine allowAi=false',
    hybridChecked: Boolean(hybridFn),
    hybridEngineDisagree: hybridMisses.length,
    hybridMisses: hybridMisses.slice(0, 20),
    summary,
    sampleFailures: failures.slice(0, 40).map((f) => ({
      id: f.id,
      expect: f.expect,
      got: f.got,
      method: f.method,
      candidates: f.candidates,
      city: f.city,
      hood: f.hood,
      textPreview: f.textPreview,
    })),
  };

  writeFileSync(join(OUT_DIR, 'results.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  writeFileSync(join(OUT_DIR, 'failures.jsonl'), failures.map((r) => JSON.stringify(r)).join('\n') + '\n');
  writeFileSync(join(OUT_DIR, 'summary.json'), JSON.stringify(report, null, 2));
  writeFileSync(join(ARTIFACT_DIR, 'estate_category_1000_summary.json'), JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`wrote ${join(OUT_DIR, 'summary.json')}`);
  if (summary.pct < 95) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
