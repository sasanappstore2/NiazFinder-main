/**
 * Category-detection accuracy harness.
 *
 * Runs the REAL hybrid intake pipeline over a labeled golden set and reports:
 *   - vertical accuracy, strict slug accuracy, loose slug accuracy
 *   - per-vertical breakdown
 *   - top confusion pairs (expected -> got)
 *   - latency p50 / p95 / max, AI-invocation rate
 *
 * Modes:
 *   (default) rules-only — offline, deterministic. The apples-to-apples floor
 *             we compare the new semantic layer against.
 *   --ai      loads .env + .env.local so it mirrors the running app
 *             (LM Studio gemma + intent-gist provider, etc).
 *
 * Usage:
 *   npx --yes tsx scripts/intake/measure-category-accuracy.ts [--ai] [--limit N]
 *       [--dataset path.json] [--out reports/intake-category-accuracy.json]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

interface GoldenCase {
  id: string;
  text: string;
  tone?: string;
  expect: { vertical: string; categorySlug: string };
}
interface GoldenFile {
  version: number;
  cases: GoldenCase[];
}

interface CaseResult {
  id: string;
  text: string;
  tone: string;
  expectedVertical: string;
  expectedSlug: string;
  gotVertical: string;
  gotSlug: string;
  verticalOk: boolean;
  slugStrictOk: boolean;
  slugLooseOk: boolean;
  latencyMs: number;
  engine: string;
  aiInvoked: boolean;
}

// ---------- args ----------
const argv = process.argv.slice(2);
function flag(name: string): boolean {
  return argv.includes(`--${name}`);
}
function opt(name: string, fallback: string): string {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1]! : fallback;
}
const MODE: 'ai' | 'rules-only' | 'semantic' = flag('semantic')
  ? 'semantic'
  : flag('ai')
    ? 'ai'
    : 'rules-only';
const SEMANTIC_NO_AI = flag('no-llm'); // semantic+rules fusion without Gemma disambiguation
const LIMIT = Number(opt('limit', '0')) || 0;
const DATASET = opt(
  'dataset',
  'src/intake/intelligence-engine/fixtures/hybrid-intake-golden.json'
);
const OUT = opt('out', `reports/intake-category-accuracy.${MODE}.json`);

// ---------- minimal .env loader (no dep) ----------
function loadEnvFile(rel: string): void {
  const path = join(process.cwd(), rel);
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

async function stubServerOnly(): Promise<void> {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const p = require.resolve('server-only');
  require.cache[p] = { id: p, filename: p, loaded: true, exports: {} } as NodeModule;
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx]!;
}

async function main(): Promise<void> {
  // Always: exercise the hybrid path, skip DB location lookups for isolation.
  process.env.NEED_INTAKE_HYBRID_ENABLED = 'true';
  process.env.NEED_INTAKE_LOC_SKIP_PRISMA = 'true';

  if (MODE === 'semantic') {
    // Offline semantic fusion: bge-m3 (ollama) + scoped rules + optional Gemma.
    // Intent-gist (broken Gemini) is disabled to avoid 403 noise.
    process.env.NEED_INTAKE_SEMANTIC_RETRIEVAL_ENABLED = 'true';
    process.env.LOCAL_EMBED_URL = process.env.LOCAL_EMBED_URL ?? 'http://127.0.0.1:11434';
    process.env.LOCAL_EMBED_MODEL = process.env.LOCAL_EMBED_MODEL ?? 'bge-m3';
    process.env.LOCAL_EMBED_PREFIX_STYLE = process.env.LOCAL_EMBED_PREFIX_STYLE ?? 'none';
    process.env.NEED_INTAKE_INTENT_GIST_ENABLED = 'false';
    process.env.NEED_INTAKE_INTENT_SLICE_ENABLED = 'false';
    process.env.NEED_INTAKE_TRUTH_VERIFY_ENABLED = 'false';
    process.env.NEED_INTAKE_RULES_ONLY = 'false';
    process.env.AI_SEMANTIC_RESOLVER_ENABLED = 'false';
    // Local LLM gateway for Gemma disambiguation.
    process.env.NEED_INTAKE_LLM_URL = process.env.NEED_INTAKE_LLM_URL ?? 'http://127.0.0.1:1234';
    process.env.NEED_INTAKE_LLM_MODEL = process.env.NEED_INTAKE_LLM_MODEL ?? 'gemma';
    process.env.NEED_INTAKE_LLM_ENABLED = SEMANTIC_NO_AI ? 'false' : 'true';
    process.env.NEED_INTAKE_DISAMBIG_AI_ENABLED = SEMANTIC_NO_AI ? 'false' : 'true';
  } else if (MODE === 'ai') {
    loadEnvFile('.env');
    loadEnvFile('.env.local');
    process.env.NEED_INTAKE_HYBRID_ENABLED = 'true';
    process.env.NEED_INTAKE_LOC_SKIP_PRISMA = 'true';
  } else {
    process.env.NEED_INTAKE_RULES_ONLY = 'true';
    process.env.NEED_INTAKE_LLM_ENABLED = 'false';
    process.env.NEED_INTAKE_DISAMBIG_AI_ENABLED = 'false';
    process.env.NEED_INTAKE_INTENT_GIST_ENABLED = 'false';
    process.env.NEED_INTAKE_INTENT_SLICE_ENABLED = 'false';
    process.env.AI_SEMANTIC_RESOLVER_ENABLED = 'false';
    process.env.NEED_INTAKE_TRUTH_VERIFY_ENABLED = 'false';
  }

  await stubServerOnly();
  const { runHybridIntakePipeline } = await import(
    '@/intake/intelligence-engine/hybrid/hybrid-pipeline'
  );
  const { clearIntelligenceCache } = await import(
    '@/lib/need-intake/intake-parse-cache-store'
  );
  await clearIntelligenceCache();

  const golden = JSON.parse(
    readFileSync(join(process.cwd(), DATASET), 'utf8')
  ) as GoldenFile;
  const cases = LIMIT > 0 ? golden.cases.slice(0, LIMIT) : golden.cases;

  console.log(
    `\nCategory accuracy — mode=${MODE} dataset=${DATASET} cases=${cases.length}\n`
  );

  const results: CaseResult[] = [];
  for (const c of cases) {
    const started = performance.now();
    let gotVertical = '';
    let gotSlug = '';
    let engine = 'error';
    let aiInvoked = false;
    try {
      const r = await runHybridIntakePipeline({ text: c.text });
      gotVertical = String(r.fields.vertical?.value ?? '');
      gotSlug = String(
        r.fields.subcategorySlug?.value ?? r.fields.categorySlug?.value ?? ''
      );
      engine = r.meta.engine;
      aiInvoked = Boolean(r.meta.aiInvoked);
    } catch (e) {
      gotSlug = `ERR:${(e as Error).message}`;
    }
    const latencyMs = performance.now() - started;
    const verticalOk = gotVertical === c.expect.vertical;
    const slugStrictOk = gotSlug === c.expect.categorySlug;
    const slugLooseOk =
      slugStrictOk ||
      (!!gotSlug &&
        (gotSlug.includes(c.expect.categorySlug) ||
          c.expect.categorySlug.includes(gotSlug)));
    results.push({
      id: c.id,
      text: c.text,
      tone: c.tone ?? 'unknown',
      expectedVertical: c.expect.vertical,
      expectedSlug: c.expect.categorySlug,
      gotVertical,
      gotSlug,
      verticalOk,
      slugStrictOk,
      slugLooseOk,
      latencyMs: Math.round(latencyMs),
      engine,
      aiInvoked,
    });
  }

  // ---------- aggregate ----------
  const n = results.length;
  const verticalAcc = results.filter((r) => r.verticalOk).length / n;
  const slugStrictAcc = results.filter((r) => r.slugStrictOk).length / n;
  const slugLooseAcc = results.filter((r) => r.slugLooseOk).length / n;
  const aiRate = results.filter((r) => r.aiInvoked).length / n;

  const byVertical = new Map<string, { total: number; strict: number }>();
  for (const r of results) {
    const e = byVertical.get(r.expectedVertical) ?? { total: 0, strict: 0 };
    e.total += 1;
    if (r.slugStrictOk) e.strict += 1;
    byVertical.set(r.expectedVertical, e);
  }

  const byTone = new Map<string, { total: number; strict: number }>();
  for (const r of results) {
    const e = byTone.get(r.tone) ?? { total: 0, strict: 0 };
    e.total += 1;
    if (r.slugStrictOk) e.strict += 1;
    byTone.set(r.tone, e);
  }

  const byCategory = new Map<string, { total: number; strict: number }>();
  for (const r of results) {
    const e = byCategory.get(r.expectedSlug) ?? { total: 0, strict: 0 };
    e.total += 1;
    if (r.slugStrictOk) e.strict += 1;
    byCategory.set(r.expectedSlug, e);
  }

  const confusion = new Map<string, number>();
  for (const r of results) {
    if (r.slugStrictOk) continue;
    const key = `${r.expectedSlug}  ->  ${r.gotSlug || '(none)'}`;
    confusion.set(key, (confusion.get(key) ?? 0) + 1);
  }

  const lat = results.map((r) => r.latencyMs).sort((a, b) => a - b);

  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  console.log(`  vertical accuracy : ${pct(verticalAcc)}`);
  console.log(`  slug (strict)     : ${pct(slugStrictAcc)}  <-- the number that matters`);
  console.log(`  slug (loose)      : ${pct(slugLooseAcc)}`);
  console.log(`  AI invoked        : ${pct(aiRate)}`);
  console.log(
    `  latency           : p50=${percentile(lat, 50)}ms  p95=${percentile(lat, 95)}ms  max=${lat[lat.length - 1] ?? 0}ms`
  );

  console.log(`\n  per-vertical (strict slug):`);
  for (const [v, e] of [...byVertical.entries()].sort()) {
    console.log(`    ${v.padEnd(16)} ${e.strict}/${e.total}  (${pct(e.strict / e.total)})`);
  }

  console.log(`\n  per-tone (strict slug):`);
  for (const [v, e] of [...byTone.entries()].sort()) {
    console.log(`    ${v.padEnd(14)} ${e.strict}/${e.total}  (${pct(e.strict / e.total)})`);
  }

  const worstCats = [...byCategory.entries()]
    .filter(([, e]) => e.total >= 3)
    .map(([slug, e]) => ({ slug, rate: e.strict / e.total, ...e }))
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 15);
  if (worstCats.length) {
    console.log(`\n  weakest categories (strict slug, >=3 cases):`);
    worstCats.forEach((c) => console.log(`    ${c.slug.padEnd(26)} ${c.strict}/${c.total}  (${pct(c.rate)})`));
  }

  if (confusion.size) {
    console.log(`\n  top confusions (expected -> got):`);
    [...confusion.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .forEach(([k, c]) => console.log(`    ${c}x  ${k}`));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: MODE,
    dataset: DATASET,
    cases: n,
    metrics: {
      verticalAccuracy: verticalAcc,
      slugStrictAccuracy: slugStrictAcc,
      slugLooseAccuracy: slugLooseAcc,
      aiInvokedRate: aiRate,
      latencyMs: { p50: percentile(lat, 50), p95: percentile(lat, 95), max: lat[lat.length - 1] ?? 0 },
    },
    perVertical: Object.fromEntries(
      [...byVertical.entries()].map(([v, e]) => [v, { strict: e.strict, total: e.total }])
    ),
    perTone: Object.fromEntries(
      [...byTone.entries()].map(([v, e]) => [v, { strict: e.strict, total: e.total }])
    ),
    perCategory: Object.fromEntries(
      [...byCategory.entries()].map(([v, e]) => [v, { strict: e.strict, total: e.total }])
    ),
    confusions: Object.fromEntries(
      [...confusion.entries()].sort((a, b) => b[1] - a[1])
    ),
    results,
  };
  const outPath = join(process.cwd(), OUT);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\n  report written: ${OUT}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
