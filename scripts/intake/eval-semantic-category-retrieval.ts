/**
 * Standalone proof of the semantic-retrieval hypothesis — NO pipeline changes.
 *
 * Embeds category exemplars once, then for each golden case embeds the user
 * text and ranks categories by max cosine similarity. Reports top-1 / top-3
 * accuracy + query latency, so we can compare against the rules/AI baseline
 * (88% / 90% strict) before wiring anything in.
 *
 * Usage:
 *   npx --yes tsx scripts/intake/eval-semantic-category-retrieval.ts
 *       [--no-prefix] [--limit N] [--dataset path.json]
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface GoldenCase {
  id: string;
  text: string;
  expect: { vertical: string; categorySlug: string };
}

const argv = process.argv.slice(2);
// Prefix style: nomic uses "search_query:/search_document:", e5 uses "query:/passage:".
const psi = argv.indexOf('--prefix-style');
const PREFIX_STYLE: 'nomic' | 'e5' | 'none' =
  psi >= 0 && argv[psi + 1] ? (argv[psi + 1] as 'nomic' | 'e5' | 'none') : 'nomic';
const QUERY_PREFIX =
  PREFIX_STYLE === 'e5' ? 'query: ' : PREFIX_STYLE === 'nomic' ? 'search_query: ' : undefined;
const DOC_PREFIX =
  PREFIX_STYLE === 'e5' ? 'passage: ' : PREFIX_STYLE === 'nomic' ? 'search_document: ' : undefined;
const li = argv.indexOf('--limit');
const LIMIT = li >= 0 && argv[li + 1] ? Number(argv[li + 1]) : 0;
const di = argv.indexOf('--dataset');
const DATASET =
  di >= 0 && argv[di + 1]
    ? argv[di + 1]!
    : 'src/intake/intelligence-engine/fixtures/hybrid-intake-golden.json';

function loadEnvFile(rel: string): void {
  const path = join(process.cwd(), rel);
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

async function main(): Promise<void> {
  loadEnvFile('.env.local');
  loadEnvFile('.env');

  const { buildCategoryExemplars } = await import(
    '@/intake/intelligence-engine/semantic/category-exemplars'
  );
  const { embedBatch, embedText, cosineSimilarity, checkLocalEmbedHealth } = await import(
    '@/lib/local-llm/local-embeddings-client'
  );
  const { rerankByIntent } = await import('@/intake/intelligence-engine/semantic/intent-rerank');
  const { normalizeForEmbedding } = await import('@/intake/intelligence-engine/semantic/finglish');
  const RERANK = !argv.includes('--no-rerank');

  const health = await checkLocalEmbedHealth();
  if (!health.ok) {
    console.error(`embedding gateway not reachable: ${health.error}`);
    process.exit(1);
  }
  console.log(`\nSemantic retrieval eval — embed dims=${health.dims} prefix-style=${PREFIX_STYLE}\n`);

  // ---------- build + embed the category index (once) ----------
  const cats = buildCategoryExemplars();
  const flatTexts: string[] = [];
  const ownerSlug: string[] = [];
  for (const c of cats) {
    for (const ex of c.exemplars) {
      flatTexts.push(ex);
      ownerSlug.push(c.slug);
    }
  }
  const idxStart = performance.now();
  const exemplarVecs = await embedBatch(flatTexts, { prefix: DOC_PREFIX });
  if (!exemplarVecs) {
    console.error('failed to embed exemplars');
    process.exit(1);
  }
  const indexMs = Math.round(performance.now() - idxStart);

  // category slug -> its exemplar vectors
  const byCat = new Map<string, number[][]>();
  exemplarVecs.forEach((v, i) => {
    const slug = ownerSlug[i]!;
    const arr = byCat.get(slug) ?? [];
    arr.push(v);
    byCat.set(slug, arr);
  });
  console.log(
    `  indexed ${cats.length} categories / ${flatTexts.length} exemplars in ${indexMs}ms (one-time)\n`
  );

  const indexedSlugs = new Set(cats.map((c) => c.slug));

  // ---------- evaluate ----------
  const golden = JSON.parse(readFileSync(join(process.cwd(), DATASET), 'utf8')) as {
    cases: GoldenCase[];
  };
  const cases = LIMIT > 0 ? golden.cases.slice(0, LIMIT) : golden.cases;

  let top1 = 0;
  let top3 = 0;
  let notInIndex = 0;
  let inIndexCount = 0;
  let inIndexTop1 = 0;
  const confusions: string[] = [];
  const perTone = new Map<string, { total: number; t1: number }>();

  // Batch-embed all queries up front (fast iteration).
  const qStart = performance.now();
  const qVecs = await embedBatch(
    cases.map((c) => normalizeForEmbedding(c.text)),
    { prefix: QUERY_PREFIX }
  );
  const totalEmbedMs = Math.round(performance.now() - qStart);
  if (!qVecs) {
    console.error('failed to embed queries');
    process.exit(1);
  }

  cases.forEach((c, i) => {
    const inIndex = indexedSlugs.has(c.expect.categorySlug);
    if (!inIndex) notInIndex += 1;
    else inIndexCount += 1;
    const tone = (c as { tone?: string }).tone ?? 'all';
    const pt = perTone.get(tone) ?? { total: 0, t1: 0 };
    pt.total += 1;

    const qVec = qVecs[i]!;
    let ranked = [...byCat.entries()]
      .map(([slug, vecs]) => ({
        slug,
        score: Math.max(...vecs.map((v) => cosineSimilarity(qVec, v))),
      }))
      .sort((a, b) => b.score - a.score);
    if (RERANK) ranked = rerankByIntent(ranked, c.text);

    const t1 = ranked[0]?.slug;
    const t3 = ranked.slice(0, 3).map((r) => r.slug);
    if (t1 === c.expect.categorySlug) {
      top1 += 1;
      pt.t1 += 1;
      if (inIndex) inIndexTop1 += 1;
    }
    if (t3.includes(c.expect.categorySlug)) top3 += 1;
    else
      confusions.push(
        `${c.expect.categorySlug}  ->  [${t3.join(', ')}]   "${c.text.slice(0, 40)}…"`
      );
    perTone.set(tone, pt);
  });

  const n = cases.length;
  const pct = (x: number) => `${((x / n) * 100).toFixed(1)}%`;

  console.log(`  cases             : ${n}`);
  console.log(`  semantic top-1    : ${top1}/${n}  ${pct(top1)}`);
  console.log(`  semantic top-3    : ${top3}/${n}  ${pct(top3)}`);
  console.log(`  avg embed/query   : ${(totalEmbedMs / n).toFixed(1)}ms (batched)`);
  console.log(`  per-tone top-1:`);
  for (const [t, e] of [...perTone.entries()].sort())
    console.log(`    ${t.padEnd(13)} ${((e.t1 / e.total) * 100).toFixed(1)}%`);
  if (notInIndex) {
    const inPct = inIndexCount ? ((inIndexTop1 / inIndexCount) * 100).toFixed(1) : '0';
    console.log(
      `  top-1 (in-index)  : ${inIndexTop1}/${inIndexCount}  ${inPct}%   (excludes ${notInIndex} cases whose label isn't a leaf)`
    );
  }

  if (confusions.length) {
    console.log(`\n  misses (expected -> top-3):`);
    confusions.slice(0, 20).forEach((f) => console.log(`   - ${f}`));
  }
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
