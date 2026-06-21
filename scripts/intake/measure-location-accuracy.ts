/**
 * Location accuracy harness — generates test cases from the catalog itself and
 * measures smartResolveLocation across cities + variants. Deterministic, no LLM.
 *
 * Variants:
 *   - city-direct:     "نیاز در {city}"                  -> expect city
 *   - nb-infer:        "آپارتمان در {uniqueNeighborhood}" -> expect its city
 *   - finglish-city:   "khone dar {finglishCity}"         -> expect city
 *   - typo-city:       one-char perturbation of city      -> expect city
 *   - no-location:     a need with no place                -> expect none
 *
 * Usage: npx --yes tsx scripts/intake/measure-location-accuracy.ts [--per N]
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { normalizeIntakeText } from '@/lib/need-intake/normalize-intake-text';

const perCity = (() => {
  const i = process.argv.indexOf('--per');
  return i >= 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : 4;
})();

const CATALOG_DIR = path.join(process.cwd(), 'src', 'data', 'neighborhoods', 'catalog');

// Major cities (catalog slug -> finglish) to tune deeply; inference still covers all.
const MAJOR: Array<[string, string]> = [
  ['tehran-city', 'tehran'], ['mashhad', 'mashhad'], ['isfahan', 'esfahan'],
  ['alborz-karaj', 'karaj'], ['shiraz', 'shiraz'], ['tabriz', 'tabriz'], ['ahvaz', 'ahvaz'],
  ['qom', 'qom'], ['kermanshah', 'kermanshah'], ['rasht', 'rasht'],
  ['kerman', 'kerman'], ['yazd', 'yazd'], ['ardabil', 'ardabil'],
  ['zanjan', 'zanjan'], ['qazvin', 'qazvin'],
  ['bushehr', 'bushehr'], ['bandar-abbas', 'bandarabbas'],
];

async function stub(): Promise<void> {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const p = require.resolve('server-only');
  require.cache[p] = { id: p, filename: p, loaded: true, exports: {} } as NodeModule;
}

function typo(s: string): string {
  if (s.length < 4) return s;
  const i = Math.floor(s.length / 2);
  return s.slice(0, i) + s.slice(i + 1); // drop a middle char
}

async function main(): Promise<void> {
  await stub();
  const { smartResolveLocation } = await import('@/intake/intelligence-engine/semantic/smart-location');

  // Build name->cities map to find neighborhoods unique to one city.
  const nbToCities = new Map<string, Set<string>>();
  const cityName = new Map<string, string>();
  const cityNbs = new Map<string, Array<{ name: string }>>();
  for (const f of readdirSync(CATALOG_DIR)) {
    if (!f.endsWith('.json')) continue;
    const slug = f.replace(/\.json$/, '');
    let data: { cityName?: string; neighborhoods?: Array<{ name: string }> };
    try { data = JSON.parse(readFileSync(path.join(CATALOG_DIR, f), 'utf8')); } catch { continue; }
    cityName.set(slug, (data.cityName ?? slug).trim());
    cityNbs.set(slug, data.neighborhoods ?? []);
    for (const n of data.neighborhoods ?? []) {
      const key = normalizeIntakeText(n.name);
      if (!key) continue;
      (nbToCities.get(key) ?? nbToCities.set(key, new Set()).get(key)!).add(slug);
    }
  }

  type R = { variant: string; ok: boolean; expect: string; got: string; text: string };
  const results: R[] = [];
  const rec = (variant: string, text: string, expectSlug: string | null, got: string | null) => {
    const ok = expectSlug === null ? got === null : got === expectSlug;
    results.push({ variant, ok, expect: expectSlug ?? '∅', got: got ?? '∅', text });
  };

  for (const [slug, fing] of MAJOR) {
    if (!existsSync(path.join(CATALOG_DIR, `${slug}.json`))) continue;
    const cname = cityName.get(slug)!;
    // city-direct, finglish (typo dropped — single-char drops on short Persian
    // city names create other valid place names, so it's a noisy signal).
    rec('city-direct', `یه تعمیرکار در ${cname} میخوام`, slug, smartResolveLocation(`یه تعمیرکار در ${cname} میخوام`).citySlug);
    rec('finglish-city', `khone dar ${fing} mikham`, slug, smartResolveLocation(`khone dar ${fing} mikham`).citySlug);
    void typo;

    // nb-infer: neighborhoods unique to this city, specific enough (multi-word or ≥5 chars)
    const unique = (cityNbs.get(slug) ?? [])
      .filter((n) => {
        const sz = nbToCities.get(normalizeIntakeText(n.name))?.size ?? 9;
        return sz === 1 && (n.name.includes(' ') || n.name.length >= 5);
      })
      .slice(0, perCity);
    for (const n of unique) {
      const text = `آپارتمان در ${n.name} میخوام`;
      rec('nb-infer', text, slug, smartResolveLocation(text).citySlug);
    }
  }

  // no-location controls
  for (const t of ['یه تعمیرکار کولر گازی میخوام', 'گرامافون نو و صفحه موسیقی', 'لپ‌تاپ گیمینگ دست دوم', 'پرستار سالمند نیاز دارم']) {
    rec('no-location', t, null, smartResolveLocation(t).citySlug);
  }

  // report
  const byVariant = new Map<string, { ok: number; total: number }>();
  for (const r of results) {
    const e = byVariant.get(r.variant) ?? { ok: 0, total: 0 };
    e.total += 1; if (r.ok) e.ok += 1; byVariant.set(r.variant, e);
  }
  const pct = (a: number, b: number) => `${((a / b) * 100).toFixed(1)}%`;
  console.log(`\nLocation accuracy — ${results.length} cases, ${MAJOR.length} major cities\n`);
  let okAll = 0;
  for (const [v, e] of [...byVariant.entries()].sort()) {
    console.log(`  ${v.padEnd(14)} ${e.ok}/${e.total}  (${pct(e.ok, e.total)})`);
    okAll += e.ok;
  }
  console.log(`  ${'OVERALL'.padEnd(14)} ${okAll}/${results.length}  (${pct(okAll, results.length)})`);

  const fails = results.filter((r) => !r.ok).slice(0, 20);
  if (fails.length) {
    console.log(`\n  failures (expect -> got):`);
    fails.forEach((f) => console.log(`   [${f.variant}] ${f.expect} -> ${f.got}   "${f.text.slice(0, 36)}"`));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
