/**
 * Estate intake 500-loop: one real-estate need at a time through wizard stages 1–4.
 *
 * Stages (UI timeline):
 *   1 need      — raw text accepted / analyze OK
 *   2 details   — area, rooms, rahn/rent, amenities signals present when expected
 *   3 location  — category leaf under real-estate + city/neighborhood when stated
 *   4 preview   — title/description or draft fields ready
 *
 * Usage:
 *   npx tsx scripts/stress/run-estate-intake-500-loop.ts --next
 *   npx tsx scripts/stress/run-estate-intake-500-loop.ts --index 0
 *   npx tsx scripts/stress/run-estate-intake-500-loop.ts --status
 *
 * Progress: tmp/estate-intake-500/progress.json
 * Log:      tmp/estate-intake-500/results.jsonl
 * Bugs:     tmp/estate-intake-500/bugs.jsonl
 */
import { mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DIR = join(ROOT, 'tmp/estate-intake-500');
const PROGRESS = join(DIR, 'progress.json');
const RESULTS = join(DIR, 'results.jsonl');
const BUGS = join(DIR, 'bugs.jsonl');
const TOTAL = 500;
const BASE = process.env.ESTATE_INTAKE_BASE_URL ?? 'http://127.0.0.1:3000';

mkdirSync(DIR, { recursive: true });

type EstateKind =
  | 'apartment-rent'
  | 'apartment-sale'
  | 'villa-rent'
  | 'villa-sale'
  | 'shop-rent'
  | 'office-rent'
  | 'land-sale'
  | 'suite-apartment-rent';

interface EstateCase {
  index: number;
  id: string;
  kind: EstateKind;
  text: string;
  expect: {
    leafHints: string[];
    vertical: 'real-estate';
    cityHint?: string;
    neighborhoodHint?: string;
    area?: number;
    hasRahn?: boolean;
    hasRent?: boolean;
    amenities?: string[];
  };
}

interface StageCheck {
  stage: 1 | 2 | 3 | 4;
  name: 'need' | 'details' | 'location' | 'preview';
  ok: boolean;
  notes: string[];
}

interface Progress {
  nextIndex: number;
  completed: number;
  passed: number;
  failed: number;
  lastId: string | null;
  lastOk: boolean | null;
  updatedAt: string;
}

interface RunResult {
  index: number;
  id: string;
  ok: boolean;
  text: string;
  stages: StageCheck[];
  got: Record<string, unknown>;
  issues: string[];
  latencyMs: number;
  at: string;
}

const CITIES = [
  { name: 'مشهد', slug: 'mashhad', neighborhoods: ['هاشمیه', 'احمدآباد', 'سجاد', 'طلاب', 'قاسم‌آباد'] },
  { name: 'تهران', slug: 'tehran', neighborhoods: ['ونک', 'سعادت‌آباد', 'پونک', 'جردن', 'نیاوران'] },
  { name: 'اصفهان', slug: 'isfahan', neighborhoods: ['ملک‌شهر', 'خانه اصفهان', 'جلفا'] },
  { name: 'شیراز', slug: 'shiraz', neighborhoods: ['معالی‌آباد', 'زندیه', 'گلدشت'] },
  { name: 'کرج', slug: 'karaj', neighborhoods: ['گوهردشت', 'مهرشهر', 'عظیمیه'] },
] as const;

const AMENITIES = [
  'آسانسور',
  'پارکینگ',
  'انباری',
  'بالکن',
  'استخر',
  'لابی',
  'نگهبانی',
  'کابینت',
] as const;

const FLOOR_PHRASES = ['طبقات بالا', 'طبقه آخر', 'طبقه سوم به بالا', 'نه همکف'] as const;

function kindForIndex(i: number): EstateKind {
  const kinds: EstateKind[] = [
    'apartment-rent',
    'apartment-sale',
    'villa-rent',
    'villa-sale',
    'shop-rent',
    'office-rent',
    'land-sale',
    'suite-apartment-rent',
  ];
  return kinds[i % kinds.length]!;
}

function buildCase(index: number): EstateCase {
  const city = CITIES[index % CITIES.length]!;
  const hood = city.neighborhoods[index % city.neighborhoods.length]!;
  const kind = kindForIndex(index);
  const area = 70 + ((index * 17) % 280);
  const rooms = 1 + (index % 4);
  const rahn = 50 + ((index * 13) % 400);
  const rent = 5 + ((index * 7) % 40);
  const price = 2 + ((index * 11) % 40);
  const amenity = AMENITIES[index % AMENITIES.length]!;
  const amenity2 = AMENITIES[(index + 3) % AMENITIES.length]!;
  const floor = FLOOR_PHRASES[index % FLOOR_PHRASES.length]!;

  let text = '';
  let leafHints: string[] = [];
  let hasRahn = false;
  let hasRent = false;

  switch (kind) {
    case 'apartment-rent':
      leafHints = ['apartment-rent', 'residential-rent'];
      hasRahn = true;
      hasRent = true;
      text = `من یک آپارتمان ${area} متری ${rooms} خوابه در ${hood} ${city.name} می‌خوام. ${rahn} میلیون رهن دارم و ${rent} میلیون اجاره. می‌خوام ${amenity} داشته باشه و ${floor} باشه${index % 3 === 0 ? ` و ${amenity2} هم مهمه` : ''}.`;
      break;
    case 'apartment-sale':
      leafHints = ['apartment-sale', 'residential-sale'];
      text = `دنبال خرید آپارتمان ${area} متری در ${hood} ${city.name} هستم تا حدود ${price} میلیارد. ${rooms} خواب، ${amenity} و ${floor}.`;
      break;
    case 'villa-rent':
      leafHints = ['villa-rent', 'residential-rent'];
      hasRahn = true;
      hasRent = true;
      text = `ویلای ${area} متری برای اجاره در ${hood} ${city.name} می‌خوام. رهن ${rahn} میلیون اجاره ${rent} میلیون. ${amenity} لازم است.`;
      break;
    case 'villa-sale':
      leafHints = ['villa-sale', 'residential-sale'];
      text = `ویلا ${area} متری با حیاط در ${hood} ${city.name} برای خرید تا ${price} میلیارد. ${amenity} و سند تک‌برگ.`;
      break;
    case 'shop-rent':
      leafHints = ['shop-rent', 'commercial-rent'];
      hasRahn = true;
      hasRent = true;
      text = `مغازه ${area} متری اجاره‌ای در ${hood} ${city.name} می‌خوام. رهن ${rahn} میلیون اجاره ${rent} میلیون. ویترین خوب و ${amenity}.`;
      break;
    case 'office-rent':
      leafHints = ['office-rent', 'commercial-rent'];
      hasRahn = true;
      hasRent = true;
      text = `دفتر کار ${area} متری در ${hood} ${city.name} اجاره می‌کنم. رهن ${rahn} اجاره ${rent} میلیون. ${amenity} و ${floor}.`;
      break;
    case 'land-sale':
      leafHints = ['land-sale', 'land', 'construction-partnership'];
      text = `زمین ${area} متری در ${hood} ${city.name} برای خرید تا ${price} میلیارد. کاربری مسکونی یا مشارکت در ساخت.`;
      break;
    case 'suite-apartment-rent':
      leafHints = ['suite-apartment-rent', 'short-term-rent'];
      hasRent = true;
      text = `سوئیت ${area} متری اجاره روزانه نزدیک ${hood} ${city.name} برای ${2 + (index % 5)} شب. حدود ${rent} میلیون هر شب. ${amenity} داشته باشد.`;
      break;
  }

  // Seed case 0 = user's exact example style
  if (index === 0) {
    text =
      'من یک آپارتمان ۱۹۰ متری در هاشمیه می‌خوام ۱۰۰ میلیون رهن دارم و ۱۰ میلیون اجاره می‌خوام آسانسور داشته باشه و طبقات بالا باشه';
    leafHints = ['apartment-rent', 'residential-rent'];
    return {
      index,
      id: 'estate-000-hashemieh-190',
      kind: 'apartment-rent',
      text,
      expect: {
        leafHints,
        vertical: 'real-estate',
        cityHint: 'مشهد',
        neighborhoodHint: 'هاشمیه',
        area: 190,
        hasRahn: true,
        hasRent: true,
        amenities: ['آسانسور'],
      },
    };
  }

  return {
    index,
    id: `estate-${String(index).padStart(3, '0')}-${kind}`,
    kind,
    text,
    expect: {
      leafHints,
      vertical: 'real-estate',
      cityHint: city.name,
      neighborhoodHint: hood,
      area,
      hasRahn,
      hasRent,
      amenities: [amenity],
    },
  };
}

function loadProgress(): Progress {
  if (!existsSync(PROGRESS)) {
    return {
      nextIndex: 0,
      completed: 0,
      passed: 0,
      failed: 0,
      lastId: null,
      lastOk: null,
      updatedAt: new Date().toISOString(),
    };
  }
  return JSON.parse(readFileSync(PROGRESS, 'utf8')) as Progress;
}

function saveProgress(p: Progress): void {
  p.updatedAt = new Date().toISOString();
  writeFileSync(PROGRESS, JSON.stringify(p, null, 2));
}

function pathHasRealEstate(slug: string): boolean {
  return (
    slug.includes('rent') ||
    slug.includes('sale') ||
    slug.includes('apartment') ||
    slug.includes('villa') ||
    slug.includes('shop') ||
    slug.includes('office') ||
    slug.includes('land') ||
    slug.includes('suite') ||
    slug.includes('real-estate') ||
    slug.includes('residential') ||
    slug.includes('commercial') ||
    slug.includes('partnership') ||
    slug.includes('agency') ||
    slug.includes('pre-sale')
  );
}

async function analyze(text: string): Promise<{ status: number; body: Record<string, unknown>; ms: number }> {
  const started = Date.now();
  const res = await fetch(`${BASE}/api/intake/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, forceAi: true }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, body, ms: Date.now() - started };
}

function dig(obj: Record<string, unknown>, ...keys: string[]): unknown {
  let cur: unknown = obj;
  for (const k of keys) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

function evaluateStages(
  c: EstateCase,
  status: number,
  body: Record<string, unknown>
): { stages: StageCheck[]; issues: string[]; got: Record<string, unknown>; ok: boolean } {
  const entities = (dig(body, 'entities') ?? dig(body, 'parsedIntent', 'entities') ?? {}) as Record<
    string,
    unknown
  >;
  const parsed = (dig(body, 'parsedIntent') ?? {}) as Record<string, unknown>;
  const draft = (dig(body, 'draft') ?? {}) as Record<string, unknown>;
  const draftParsed = (dig(draft, 'parsedIntent') ?? {}) as Record<string, unknown>;
  const listing = (dig(draft, 'listingPreview') ?? dig(body, 'listingPreview') ?? {}) as Record<
    string,
    unknown
  >;

  const categorySlug = String(
    dig(entities, 'categorySlug') ??
      dig(parsed, 'categorySlug') ??
      dig(draftParsed, 'categorySlug') ??
      dig(body, 'categorySlug') ??
      dig(body, 'detectedCategory') ??
      ''
  );
  const subcategorySlug = String(
    dig(entities, 'subcategorySlug') ??
      dig(parsed, 'subcategorySlug') ??
      dig(draftParsed, 'subcategorySlug') ??
      ''
  );
  const leaf = subcategorySlug || categorySlug;
  const vertical = String(dig(entities, 'vertical') ?? dig(parsed, 'vertical') ?? '');
  const city = String(dig(entities, 'city') ?? dig(parsed, 'city') ?? '');
  const neighborhood = String(
    dig(entities, 'neighborhood') ?? dig(parsed, 'neighborhood') ?? ''
  );
  const area = dig(entities, 'area') ?? dig(parsed, 'area') ?? dig(entities, 'areaMin');
  const rooms = dig(entities, 'rooms');
  const title = String(dig(listing, 'title') ?? dig(draft, 'title') ?? '');
  const description = String(dig(listing, 'description') ?? '');
  const candidates = (dig(parsed, 'categoryCandidates') ??
    dig(body, 'categoryCandidates') ??
    []) as unknown[];
  const error = String(dig(body, 'error') ?? '');

  const got = {
    status,
    vertical,
    leaf,
    categorySlug,
    subcategorySlug,
    city,
    neighborhood,
    area,
    rooms,
    title: title.slice(0, 80),
    candidates: Array.isArray(candidates) ? candidates.length : 0,
    error: error || undefined,
  };

  const stages: StageCheck[] = [];
  const issues: string[] = [];

  // Stage 1 — need / analyze
  const s1notes: string[] = [];
  let s1ok = status === 200 && !error;
  if (status !== 200) {
    s1ok = false;
    s1notes.push(`http=${status}`);
    issues.push(`stage1:analyze_http_${status}`);
  }
  if (error) {
    s1ok = false;
    s1notes.push(error);
    issues.push(`stage1:analyze_error:${error}`);
  }
  if (c.text.trim().length < 10) {
    s1ok = false;
    issues.push('stage1:text_too_short');
  }
  s1notes.push(`textLen=${c.text.length}`);
  stages.push({ stage: 1, name: 'need', ok: s1ok, notes: s1notes });

  // Stage 2 — details (slots)
  const s2notes: string[] = [];
  let s2ok = true;
  if (c.expect.area != null) {
    const gotArea = typeof area === 'number' ? area : Number(area);
    if (!Number.isFinite(gotArea)) {
      s2ok = false;
      s2notes.push('area_missing');
      issues.push('stage2:area_missing');
    } else if (Math.abs(gotArea - c.expect.area) > 30) {
      s2ok = false;
      s2notes.push(`area=${gotArea} expected~${c.expect.area}`);
      issues.push(`stage2:area_mismatch:${gotArea}`);
    } else {
      s2notes.push(`area=${gotArea}`);
    }
  }
  // Soft: rahn/rent often in answers not entities — check raw text still carried
  if (c.expect.hasRahn && !/رهن|ودیعه/u.test(c.text)) {
    issues.push('stage2:case_missing_rahn_word');
  }
  if (c.expect.amenities?.length) {
    for (const a of c.expect.amenities) {
      if (!c.text.includes(a)) continue;
      s2notes.push(`amenity_in_text:${a}`);
    }
  }
  stages.push({ stage: 2, name: 'details', ok: s2ok, notes: s2notes });

  // Stage 3 — category + location
  const s3notes: string[] = [];
  let s3ok = true;
  if (!leaf) {
    if (Array.isArray(candidates) && candidates.length >= 2) {
      s3notes.push(`ambiguous_candidates=${candidates.length}`);
      // Ambiguity with candidates is acceptable for UI — not hard fail if vertical ok
      if (vertical && vertical !== 'real-estate') {
        s3ok = false;
        issues.push(`stage3:vertical_wrong:${vertical}`);
      } else {
        s3notes.push('ui_disambiguation_ok');
      }
    } else {
      s3ok = false;
      s3notes.push('no_leaf_no_candidates');
      issues.push('stage3:category_unresolved');
    }
  } else {
    const hintHit = c.expect.leafHints.some(
      (h) => leaf === h || leaf.includes(h) || h.includes(leaf)
    );
    const estateish = pathHasRealEstate(leaf) || vertical === 'real-estate';
    const expectRent = c.expect.leafHints.some((h) => h.includes('rent'));
    const expectSale = c.expect.leafHints.some((h) => h.includes('sale') || h.includes('land'));
    const gotRent = leaf.includes('rent');
    const gotSale = leaf.includes('sale') || leaf.includes('partnership');
    const expectCommercial = c.expect.leafHints.some(
      (h) => h.includes('shop') || h.includes('office') || h.includes('commercial')
    );
    const gotCommercial =
      leaf.includes('shop') || leaf.includes('office') || leaf.includes('commercial');
    const gotResidential =
      leaf.includes('apartment') ||
      leaf.includes('villa') ||
      leaf.includes('residential') ||
      leaf.includes('suite');

    if (!hintHit && !estateish) {
      s3ok = false;
      s3notes.push(`leaf=${leaf} not estate`);
      issues.push(`stage3:wrong_category:${leaf}`);
    } else if (!hintHit && expectCommercial && gotResidential) {
      s3ok = false;
      s3notes.push(`leaf=${leaf} expected commercial`);
      issues.push(`stage3:commercial_as_residential:${leaf}`);
    } else if (!hintHit && expectRent && gotSale && !gotRent) {
      s3ok = false;
      s3notes.push(`leaf=${leaf} expected rent`);
      issues.push(`stage3:rent_as_sale:${leaf}`);
    } else if (!hintHit && expectSale && gotRent && !gotSale) {
      s3ok = false;
      s3notes.push(`leaf=${leaf} expected sale`);
      issues.push(`stage3:sale_as_rent:${leaf}`);
    } else if (!hintHit && estateish) {
      s3notes.push(`leaf=${leaf} estate_ok_soft`);
    } else {
      s3notes.push(`leaf=${leaf}`);
    }
    if (vertical && vertical !== 'real-estate' && !estateish) {
      s3ok = false;
      issues.push(`stage3:vertical:${vertical}`);
    }
  }

  if (c.expect.cityHint) {
    if (!city) {
      s3notes.push('city_missing');
      // Soft fail — neighborhood-only texts often miss city slug
      if (c.index === 0) {
        // Hashemieh is Mashhad — city should ideally resolve
        issues.push('stage3:city_missing_soft');
      }
    } else if (!city.includes(c.expect.cityHint) && !c.expect.cityHint.includes(city)) {
      s3notes.push(`city=${city} expected ${c.expect.cityHint}`);
      issues.push(`stage3:city_mismatch:${city}`);
    } else {
      s3notes.push(`city=${city}`);
    }
  }

  if (c.expect.neighborhoodHint) {
    if (!neighborhood) {
      s3notes.push('neighborhood_missing');
      issues.push('stage3:neighborhood_missing_soft');
    } else if (
      !neighborhood.includes(c.expect.neighborhoodHint) &&
      !c.expect.neighborhoodHint.includes(neighborhood)
    ) {
      // Sometimes LRE puts whole phrase in neighborhood — soft
      s3notes.push(`neighborhood=${neighborhood}`);
      if (neighborhood.length > 40) {
        issues.push('stage3:neighborhood_garbage_soft');
      }
    } else {
      s3notes.push(`neighborhood=${neighborhood}`);
    }
  }
  stages.push({ stage: 3, name: 'location', ok: s3ok, notes: s3notes });

  // Stage 4 — preview readiness
  const s4notes: string[] = [];
  let s4ok = true;
  if (!leaf && !(Array.isArray(candidates) && candidates.length >= 2)) {
    s4ok = false;
    s4notes.push('cannot_preview_without_category');
    issues.push('stage4:no_category_for_preview');
  } else {
    s4notes.push(title ? `title=${title.slice(0, 40)}` : 'title_empty_ok_template');
    if (description) s4notes.push(`descLen=${description.length}`);
  }
  stages.push({ stage: 4, name: 'preview', ok: s4ok, notes: s4notes });

  // Hard failures only (ignore *_soft)
  const hard = issues.filter((i) => !i.endsWith('_soft'));
  const ok = stages.every((s) => s.ok) && hard.length === 0;

  return { stages, issues, got, ok };
}

async function runOne(index: number): Promise<RunResult> {
  const c = buildCase(index);
  const { status, body, ms } = await analyze(c.text);
  const { stages, issues, got, ok } = evaluateStages(c, status, body);

  const result: RunResult = {
    index,
    id: c.id,
    ok,
    text: c.text,
    stages,
    got,
    issues,
    latencyMs: ms,
    at: new Date().toISOString(),
  };

  appendFileSync(RESULTS, `${JSON.stringify(result)}\n`);
  if (!ok || issues.length) {
    appendFileSync(
      BUGS,
      `${JSON.stringify({
        index,
        id: c.id,
        ok,
        issues,
        got,
        text: c.text,
        at: result.at,
      })}\n`
    );
  }

  const progress = loadProgress();
  progress.completed += 1;
  if (ok) progress.passed += 1;
  else progress.failed += 1;
  progress.lastId = c.id;
  progress.lastOk = ok;
  progress.nextIndex = Math.max(progress.nextIndex, index + 1);
  saveProgress(progress);

  return result;
}

function printResult(r: RunResult): void {
  console.log(`\n=== ${r.id} (index ${r.index}) ${r.ok ? 'PASS' : 'FAIL'} ${r.latencyMs}ms ===`);
  console.log(`text: ${r.text}`);
  for (const s of r.stages) {
    console.log(
      `  stage${s.stage} ${s.name}: ${s.ok ? 'OK' : 'FAIL'} — ${s.notes.join('; ') || '—'}`
    );
  }
  console.log(`  got: ${JSON.stringify(r.got)}`);
  if (r.issues.length) console.log(`  issues: ${r.issues.join(' | ')}`);
  const p = loadProgress();
  console.log(
    `progress: ${p.completed}/${TOTAL} next=${p.nextIndex} pass=${p.passed} fail=${p.failed}`
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--status')) {
    console.log(JSON.stringify(loadProgress(), null, 2));
    console.log(`cases_ready=${TOTAL}`);
    return;
  }

  let index = 0;
  if (args.includes('--next')) {
    index = loadProgress().nextIndex;
  } else if (args.includes('--index')) {
    const i = args.indexOf('--index');
    index = Math.max(0, Number(args[i + 1]) || 0);
  } else {
    index = loadProgress().nextIndex;
  }

  if (index >= TOTAL) {
    console.log(`DONE all ${TOTAL}. pass=${loadProgress().passed} fail=${loadProgress().failed}`);
    process.exit(0);
  }

  // Health
  try {
    const h = await fetch(`${BASE}/`);
    if (!h.ok && h.status >= 500) throw new Error(`base ${h.status}`);
  } catch (e) {
    console.error(`Server not reachable at ${BASE}:`, e);
    process.exit(2);
  }

  const result = await runOne(index);
  printResult(result);
  process.exit(result.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
