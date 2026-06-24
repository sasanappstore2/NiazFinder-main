// Comprehensive LIVE-SITE eval: runs the location-augmented testset
// (data/intake-testset/testset-with-location.json — every category leaf,
// random real cities/neighborhoods, conflict-checked; see
// gen-randomized-location-testset.mjs) against the running dev server's real
// /api/intake/analyze endpoint — the actual propose-validate+Gemma engine the
// site uses — and reports category + city + neighborhood accuracy broken
// down by vertical, plus every mismatch for diagnosis.
//
// Requires: dev server on :3000 (NEED_INTAKE_PROPOSE_VALIDATE_ENABLED=true),
// LM Studio (gemma) + ollama (bge-m3) up.
//
// Run: node scripts/intake/eval-propose-validate.mjs [path-to-testset.json] [limit]

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const ROOT = process.cwd();
const testsetPath = process.argv[2] || 'data/intake-testset/testset-with-location.json';
const limit = process.argv[3] ? parseInt(process.argv[3], 10) : 0;

const norm = (s) =>
  String(s || '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, ' ').replace(/\s+/g, ' ').trim();

async function analyze(text) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/intake/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const latencyMs = Date.now() - t0;
  const j = await res.json();
  const e = j.entities || {};
  return {
    categorySlug: e.categorySlug ?? null,
    subcategorySlug: e.subcategorySlug ?? null,
    city: e.city ?? null,
    neighborhood: e.neighborhood ?? null,
    engine: j.meta?.engine ?? null,
    latencyMs,
  };
}

async function main() {
  const set = JSON.parse(readFileSync(path.join(ROOT, testsetPath), 'utf8'));
  const cases = limit > 0 ? set.cases.slice(0, limit) : set.cases;
  console.log(`Running ${cases.length} cases against ${BASE} ...\n`);

  const rows = [];
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const predicted = await analyze(c.text);
    const predictedLeaf = predicted.subcategorySlug || predicted.categorySlug;
    const catOk = predictedLeaf === c.expect.categorySlug;
    const cityOk = c.expect.city ? norm(predicted.city ?? '') === norm(c.expect.city) : null;
    const hoodOk = c.expect.neighborhood
      ? norm(predicted.neighborhood ?? '') === norm(c.expect.neighborhood)
      : null;
    rows.push({ ...c, predicted, catOk, cityOk, hoodOk });

    const mark = catOk ? '✓' : '✗';
    const cityMark = cityOk === null ? '·' : cityOk ? '✓' : '✗';
    const hoodMark = hoodOk === null ? '·' : hoodOk ? '✓' : '✗';
    console.log(
      `[${i + 1}/${cases.length}] cat:${mark} city:${cityMark} hood:${hoodMark}  (${predicted.latencyMs}ms, ${predicted.engine ?? '?'})  «${c.text.slice(0, 50)}»`,
    );
  }

  const total = rows.length;
  const catCorrect = rows.filter((r) => r.catOk).length;
  const cityApplicable = rows.filter((r) => r.cityOk !== null);
  const cityCorrect = cityApplicable.filter((r) => r.cityOk).length;
  const hoodApplicable = rows.filter((r) => r.hoodOk !== null);
  const hoodCorrect = hoodApplicable.filter((r) => r.hoodOk).length;
  const avgLatency = rows.reduce((s, r) => s + r.predicted.latencyMs, 0) / Math.max(1, total);

  const byVertical = new Map();
  for (const r of rows) {
    const v = r.expect.vertical;
    const e = byVertical.get(v) ?? { total: 0, catOk: 0 };
    e.total++;
    if (r.catOk) e.catOk++;
    byVertical.set(v, e);
  }

  console.log('\n══════════ SUMMARY ══════════');
  console.log(
    `Total cases: ${total} (covering ${new Set(rows.map((r) => r.expect.categorySlug)).size} category leaves)`,
  );
  console.log(`Category accuracy: ${catCorrect}/${total} (${((catCorrect / total) * 100).toFixed(1)}%)`);
  console.log(
    `City accuracy: ${cityCorrect}/${cityApplicable.length} (${cityApplicable.length ? ((cityCorrect / cityApplicable.length) * 100).toFixed(1) : '—'}%)`,
  );
  console.log(
    `Neighborhood accuracy: ${hoodCorrect}/${hoodApplicable.length} (${hoodApplicable.length ? ((hoodCorrect / hoodApplicable.length) * 100).toFixed(1) : '—'}%)`,
  );
  console.log(`Avg latency: ${Math.round(avgLatency)}ms`);

  console.log('\n── By vertical ──');
  for (const [v, e] of [...byVertical.entries()].sort((a, b) => b[1].total - a[1].total)) {
    console.log(`  ${v.padEnd(18)} ${e.catOk}/${e.total} (${((e.catOk / e.total) * 100).toFixed(0)}%)`);
  }

  const catMisses = rows.filter((r) => !r.catOk);
  if (catMisses.length) {
    console.log(`\n── Category misses (${catMisses.length}) ──`);
    for (const r of catMisses) {
      console.log(
        `  expected=${r.expect.categorySlug} got=${r.predicted.subcategorySlug || r.predicted.categorySlug || '(none)'}  «${r.text.slice(0, 55)}»`,
      );
    }
  }
  const cityMisses = rows.filter((r) => r.cityOk === false);
  if (cityMisses.length) {
    console.log(`\n── City misses (${cityMisses.length}) ──`);
    for (const r of cityMisses) {
      console.log(`  expected=${r.expect.city} got=${r.predicted.city || '(none)'}  «${r.text.slice(0, 55)}»`);
    }
  }
  const hoodMisses = rows.filter((r) => r.hoodOk === false);
  if (hoodMisses.length) {
    console.log(`\n── Neighborhood misses (${hoodMisses.length}) ──`);
    for (const r of hoodMisses) {
      console.log(
        `  expected=${r.expect.neighborhood} got=${r.predicted.neighborhood || '(none)'}  «${r.text.slice(0, 55)}»`,
      );
    }
  }

  const reportDir = path.join(ROOT, 'reports');
  mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, 'intake-live-accuracy-report.json');
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        total,
        catAccuracy: catCorrect / total,
        cityAccuracy: cityApplicable.length ? cityCorrect / cityApplicable.length : null,
        hoodAccuracy: hoodApplicable.length ? hoodCorrect / hoodApplicable.length : null,
        avgLatencyMs: avgLatency,
        byVertical: Object.fromEntries([...byVertical.entries()].map(([v, e]) => [v, { total: e.total, catOk: e.catOk }])),
        catMisses: catMisses.map((r) => ({
          id: r.id,
          text: r.text,
          expected: r.expect.categorySlug,
          got: r.predicted.subcategorySlug || r.predicted.categorySlug,
        })),
        cityMisses: cityMisses.map((r) => ({ id: r.id, text: r.text, expected: r.expect.city, got: r.predicted.city })),
        hoodMisses: hoodMisses.map((r) => ({
          id: r.id,
          text: r.text,
          expected: r.expect.neighborhood,
          got: r.predicted.neighborhood,
        })),
      },
      null,
      2,
    ),
  );
  console.log(`\nFull report → ${path.relative(ROOT, reportPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
