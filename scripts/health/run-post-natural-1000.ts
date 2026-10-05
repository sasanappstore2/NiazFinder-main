/**
 * 1000-case realistic stress test for POST /api/post/natural-analyze.
 *
 * Generates catalog-grounded Persian needs (seeded RNG) across strata:
 *  - explicit city + neighborhood (300)
 *  - explicit city only (120)
 *  - unique-name neighborhood, no city (220)  -> expects city auto-inference
 *  - multi-city neighborhood name, no city (220) -> expects ranked city candidates, no silent pick
 *  - no location at all (90)                   -> expects no city
 *  - measurement traps, no location cue (50)  -> expects no city (anti «۳۰ متری» regression)
 *
 * Exercises the full production path per case: deterministic extraction,
 * nationwide inference, gaps/warnings, and the local Si worker.
 * Each case uses a unique loopback IP (simulates 1000 distinct users, and
 * stays under the 24 req/min/IP route limit).
 *
 * Run:
 *   SMOKE_BASE_URL=http://127.0.0.1:3006 npx --yes tsx scripts/health/run-post-natural-1000.ts [--limit N] [--concurrency N] [--seed N]
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------- RNG
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = Number(process.argv.includes('--seed') ? process.argv[process.argv.indexOf('--seed') + 1] : 1404);
const rand = mulberry32(SEED);
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number): number => min + Math.floor(rand() * (max - min + 1));
const chance = (p: number): boolean => rand() < p;

// ---------------------------------------------------------------- text utils
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
function faNum(n: number): string {
  return rand() < 0.7 ? String(n).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]) : String(n);
}
function normKey(s: string): string {
  return s.replace(/[\u200c\u200d]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

// ---------------------------------------------------------------- catalog
const CATALOG_DIR = resolve('src/data/neighborhoods/catalog');
interface CatRow { file: string; cityId: string; cityName: string; id: string; name: string }
const rows: CatRow[] = [];
const cityNames = new Map<string, string>(); // cityId -> cityName
for (const file of readdirSync(CATALOG_DIR).filter((f) => f.endsWith('.json'))) {
  try {
    const data = JSON.parse(readFileSync(resolve(CATALOG_DIR, file), 'utf8')) as {
      cityName?: string;
      neighborhoods?: Array<{ id: string; name: string; areas?: string[] }>;
    };
    if (!data || !Array.isArray(data.neighborhoods)) continue;
    const cityId = file.slice(0, -5);
    const cityName = data.cityName?.trim() || cityId;
    cityNames.set(cityId, cityName);
    for (const n of data.neighborhoods) {
      if (!n || typeof n.name !== 'string' || !n.name.trim()) continue;
      rows.push({ file, cityId, cityName, id: n.id, name: n.name });
    }
  } catch { /* skip unreadable */ }
}

const STOP = new Set(['ملک', 'واحد', 'خانه', 'خونه', 'آپارت', 'اپارت', 'مسکونی', 'تجاری', 'صنعتی', 'زمین', 'انباری', 'انبار', 'باغ', 'مرکز', 'شهر', 'میدان', 'پارک', 'خیابان', 'بلوار', 'منطقه', 'محله', 'شهرک', 'کوی', 'بازار', 'رهن', 'اجاره', 'خرید', 'فروش']);
const cityNameSet = new Set([...cityNames.values()].map(normKey));
function cleanName(name: string): boolean {
  const k = normKey(name);
  if (k.length < 3 || k.length > 24) return false;
  if (/^[\d۰-۹]/.test(k)) return false;
  if (!/[\u0600-\u06FF]/.test(k)) return false;
  if (/متری|متر\b|متراژ/.test(k)) return false;
  if (STOP.has(k)) return false;
  if (cityNameSet.has(k)) return false;
  return true;
}

// normalized name -> cityIds
const nameIndex = new Map<string, Set<string>>();
for (const r of rows) {
  if (!cleanName(r.name)) continue;
  const k = normKey(r.name);
  let s = nameIndex.get(k);
  if (!s) { s = new Set(); nameIndex.set(k, s); }
  s.add(r.cityId);
}
const uniqueNames: Array<{ name: string; cityId: string }> = [];
const multiNames: Array<{ name: string; cityIds: string[] }> = [];
for (const [name, cities] of nameIndex) {
  if (cities.size === 1) {
    const row = rows.find((r) => normKey(r.name) === name)!;
    uniqueNames.push({ name: row.name, cityId: row.cityId });
  } else if (cities.size >= 2 && cities.size <= 8) {
    const row = rows.find((r) => normKey(r.name) === name)!;
    multiNames.push({ name: row.name, cityIds: [...cities] });
  }
}

const MAJORS = ['tehran-city', 'mashhad', 'isfahan', 'shiraz', 'tabriz', 'karaj'];
function tierOf(cityId: string): 'high' | 'mid' | 'low' {
  if (cityId === 'tehran-city') return 'high';
  if (MAJORS.includes(cityId)) return 'mid';
  return 'low';
}

// ---------------------------------------------------------------- templates
type Kind = 'apartment' | 'villa' | 'office' | 'shop' | 'land' | 'suite';
type Tx = 'buy' | 'rent' | 'rahn' | 'short';
const KINDS: Kind[] = ['apartment', 'apartment', 'apartment', 'villa', 'office', 'shop', 'land', 'suite', 'villa', 'apartment'];
const TXS: Tx[] = ['buy', 'rent', 'rent', 'rahn', 'rahn', 'rent', 'short', 'buy'];

function propFrag(kind: Kind): string {
  const area = kind === 'villa' ? int(150, 600) : kind === 'land' ? int(200, 2000) : kind === 'shop' ? int(20, 150) : kind === 'suite' ? int(40, 90) : kind === 'office' ? int(40, 200) : int(50, 200);
  const rooms = int(1, 4);
  const roomWord = chance(0.5) ? `${faNum(rooms)} خوابه` : `${faNum(rooms)} خواب`;
  switch (kind) {
    case 'apartment': return `آپارتمان ${faNum(area)} متری ${roomWord}`;
    case 'villa': return chance(0.5) ? `ویلای ${faNum(area)} متری` : `باغ ویلای ${faNum(area)} متری`;
    case 'office': return chance(0.5) ? `واحد اداری ${faNum(area)} متری` : `دفتر کار ${faNum(area)} متری`;
    case 'shop': return `مغازه ${faNum(area)} متری برای ${pick(['لوازم آرایشی', 'سوپرمارکت', 'پوشاک', 'موبایل‌فروشی', 'کافه', 'نانوایی'])}`;
    case 'land': return `زمین ${faNum(area)} متری`;
    case 'suite': return `سوئیت مبله ${faNum(area)} متری`;
  }
}

function dealFrag(tx: Tx, tier: 'high' | 'mid' | 'low'): { text: string; expected: string } {
  const B = tier === 'high' ? int(8, 25) : tier === 'mid' ? int(3, 10) : int(1, 4);
  const R = tier === 'high' ? int(20, 60) : tier === 'mid' ? int(8, 25) : int(3, 12);
  switch (tx) {
    case 'buy': return { text: pick([`بودجه‌م حدود ${faNum(B)} میلیارد تومنه برای خرید`, `قصد خرید دارم تا سقف ${faNum(B)} میلیارد`, `نقداً ${faNum(B)} میلیارد دارم برای خرید`]), expected: 'buy' };
    case 'rent': return { text: pick([`اجاره ماهی ${faNum(R)} میلیون می‌تونم بدم`, `برای اجاره ماهانه تا ${faNum(R)} میلیون`]), expected: 'rent_monthly' };
    case 'rahn': {
      if (chance(0.5)) return { text: `${faNum(B)} میلیارد رهن کامل دارم`, expected: 'rent_rahn_full' };
      const X = int(100, 800); const Y = int(5, 30);
      return { text: `${faNum(X)} میلیون رهن دارم ${faNum(Y)} میلیون اجاره`, expected: 'rent_rahn_ejare' };
    }
    case 'short': return { text: pick(['برای اجاره روزانه می‌خوام', 'برای چند روز تعطیلات اجاره روزانه می‌خوام', 'کوتاه مدت، مبله باشه']), expected: 'rent_short_term' };
  }
}

function locFrag(mode: 'both' | 'city' | 'hood', city: string, hood: string): { text: string; cued: boolean } {
  if (mode === 'city') return { text: pick([`در ${city}`, `تو ${city}`, `داخل ${city}`]), cued: true };
  if (mode === 'hood') return { text: pick([`در ${hood}`, `تو ${hood}`, `در محدوده ${hood}`, `حوالی ${hood}`, `اطراف ${hood}`, `نزدیک ${hood}`]), cued: true };
  const r = rand();
  if (r < 0.6) return { text: pick([`در ${hood} ${city}`, `تو ${hood} ${city}`, `در محدوده ${hood} ${city}`, `محدوده ${hood}، ${city}`]), cued: true };
  if (r < 0.8) return { text: `${hood} ${city}`, cued: false };
  return { text: pick([`در ${hood}، ${city}`, `تو محدوده ${hood} ${city}`]), cued: true };
}

const VERBS = ['می‌خوام', 'میخوام', 'می‌خواهم', 'میخواهم'];
const EXTRAS = ['', '', '', ' پارکینگ و آسانسور داشته باشه', ' ترجیحاً طبقه اول یا همکف باشه', ' سنددار باشه', ' نورگیر و تمیز باشه', ' همسایه‌ها آروم باشن', ' فوری', ' انباری هم داشته باشه', ' ممنون میشم راهنمایی کنید'];
function frame(prop: string, loc: string, deal: string): string {
  const greet = chance(0.25) ? 'سلام، ' : '';
  const verb = pick(VERBS);
  const extra = pick(EXTRAS);
  const r = rand();
  if (r < 0.55) return `${greet}${prop} ${loc} ${verb}؛ ${deal}${extra}`;
  if (r < 0.8) return `${greet}دنبال ${prop} ${loc} هستم؛ ${deal}${extra}`;
  return `${greet}برای ${deal.includes('خرید') || deal.includes('بودجه') || deal.includes('نقداً') ? 'خرید' : deal.includes('اجاره ماه') || deal.includes('ماهانه') ? 'اجاره' : deal.includes('رهن') ? 'رهن' : 'اجاره'} ${prop} ${loc} ${verb}؛ ${deal}${extra}`;
}
function noisify(text: string): string {
  let t = text;
  if (chance(0.3)) t = t.replace(/می‌خوام/g, 'میخوام');
  if (chance(0.2)) t = t.replace(/\u200c/g, ' ');
  if (chance(0.15)) t = t.replace(/تومن/g, 'تومان');
  if (chance(0.1)) t = t.replace(/\s+/g, '  ');
  return t.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------- generation
export interface GenCase {
  id: string;
  stratum: 'explicit' | 'city-only' | 'unique' | 'multi' | 'noloc' | 'trap';
  text: string;
  expectedCity: string | null;
  expectedCityId?: string;
  expectedNeighborhood: string | null;
  expectedDeal: string | null;
  expectedCities?: string[];
  /** Location cue present in text (vs bare juxtaposition). */
  cued?: boolean;
}

const cases: GenCase[] = [];
function add(c: GenCase): void { cases.push({ ...c, text: noisify(c.text) }); }

function sampleRow(pred: (r: CatRow) => boolean): CatRow {
  const pool = rows.filter((r) => cleanName(r.name) && pred(r));
  return pick(pool);
}

// 1. explicit city + neighborhood (300)
for (let i = 0; i < 300; i++) {
  const major = chance(0.65);
  const row = sampleRow((r) => major ? MAJORS.includes(r.cityId) : !MAJORS.includes(r.cityId));
  const kind = pick(KINDS); const tx = pick(TXS);
  const deal = dealFrag(tx, tierOf(row.cityId));
  const loc = locFrag('both', row.cityName, row.name);
  add({
    id: `ex-${i}`, stratum: 'explicit',
    text: frame(propFrag(kind), loc.text, deal.text),
    expectedCity: row.cityName, expectedCityId: row.cityId,
    expectedNeighborhood: row.name, expectedDeal: deal.expected,
    cued: loc.cued,
  });
}
// 2. city only (120)
for (let i = 0; i < 120; i++) {
  const row = sampleRow(() => chance(0.5) || true);
  const kind = pick(KINDS); const tx = pick(TXS);
  const deal = dealFrag(tx, tierOf(row.cityId));
  add({
    id: `co-${i}`, stratum: 'city-only',
    text: frame(propFrag(kind), locFrag('city', row.cityName, '').text, deal.text),
    expectedCity: row.cityName, expectedCityId: row.cityId,
    expectedNeighborhood: null, expectedDeal: deal.expected,
  });
}
// 3. unique hood, no city (220)
for (let i = 0; i < 220; i++) {
  const u = pick(uniqueNames);
  const cityName = cityNames.get(u.cityId)!;
  const kind = pick(KINDS); const tx = pick(TXS);
  const deal = dealFrag(tx, tierOf(u.cityId));
  const loc = locFrag('hood', '', u.name);
  add({
    id: `uq-${i}`, stratum: 'unique',
    text: frame(propFrag(kind), loc.text, deal.text),
    expectedCity: cityName, expectedCityId: u.cityId,
    expectedNeighborhood: u.name, expectedDeal: deal.expected,
    cued: loc.cued,
  });
}
// 4. multi hood, no city (220)
for (let i = 0; i < 220; i++) {
  const m = pick(multiNames);
  const tier = tierOf(m.cityIds[0]!);
  const kind = pick(KINDS); const tx = pick(TXS);
  const deal = dealFrag(tx, tier);
  const expectedCities = m.cityIds.map((id) => cityNames.get(id)!);
  add({
    id: `mu-${i}`, stratum: 'multi',
    text: frame(propFrag(kind), locFrag('hood', '', m.name).text, deal.text),
    expectedCity: null, expectedNeighborhood: null, expectedDeal: deal.expected,
    expectedCities,
  });
}
// 5. no location (90)
for (let i = 0; i < 90; i++) {
  const kind = pick(KINDS); const tx = pick(TXS);
  const deal = dealFrag(tx, chance(0.4) ? 'mid' : 'low');
  add({
    id: `nl-${i}`, stratum: 'noloc',
    text: frame(propFrag(kind), '', deal.text),
    expectedCity: null, expectedNeighborhood: null, expectedDeal: deal.expected,
  });
}
// 6. measurement traps (50)
for (let i = 0; i < 50; i++) {
  const kind = pick(['apartment', 'apartment', 'shop', 'office', 'suite'] as Kind[]);
  const tx = pick(['rent', 'rahn', 'buy'] as Tx[]);
  const deal = dealFrag(tx, 'mid');
  const area = pick([24, 30, 45, 60, 95, 110, 130, 150, 200]);
  const prop = kind === 'apartment'
    ? `آپارتمان ${faNum(area)} متری ${faNum(int(1, 3))} خوابه`
    : kind === 'shop' ? `مغازه ${faNum(area)} متری` : kind === 'office' ? `واحد اداری ${faNum(area)} متری` : `سوئیت ${faNum(area)} متری`;
  add({
    id: `tr-${i}`, stratum: 'trap',
    text: frame(prop, '', deal.text),
    expectedCity: null, expectedNeighborhood: null, expectedDeal: deal.expected,
  });
}

const LIMIT = process.argv.includes('--limit') ? Number(process.argv[process.argv.indexOf('--limit') + 1]) : cases.length;
const CONC = process.argv.includes('--concurrency') ? Number(process.argv[process.argv.indexOf('--concurrency') + 1]) : 8;
const runCases = cases.slice(0, LIMIT);
console.log(`generated=${cases.length} run=${runCases.length} uniqueNames=${uniqueNames.length} multiNames=${multiNames.length} seed=${SEED}`);

// ---------------------------------------------------------------- runner
const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3006';
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

interface RespField { key: string; value: unknown; source?: string; confidence?: number; requiresConfirmation?: boolean }

interface Resp {
  status: number;
  draftPatch?: { entities?: Record<string, unknown> };
  fields?: RespField[];
  gaps?: string[];
  warnings?: string[];
  locationCandidates?: Array<{ slug: string; label: string; city?: string; citySlug?: string }>;
  categoryCandidates?: Array<{ slug: string; label: string }>;
  provisionalCategory?: { slug: string; confidence?: number; requiresConfirmation?: boolean };
  si?: { status?: string; latencyMs?: number };
  latencyMs?: number;
  error?: unknown;
  clientMs?: number;
}

async function postOne(c: GenCase, ip: string): Promise<Resp> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const started = Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 90_000);
    try {
      const res = await fetch(`${BASE}/api/post/natural-analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
        body: JSON.stringify({ sourceText: c.text }),
        signal: ctrl.signal,
      });
      if (res.status === 429 && attempt < 2) {
        console.log('  429; waiting a window...');
        await sleep(61_000);
        continue;
      }
      const body = (await res.json()) as Resp;
      return { ...body, status: res.status, clientMs: Date.now() - started };
    } catch (err) {
      if (attempt === 2) return { status: -1, error: String(err), clientMs: Date.now() - started };
      await sleep(2000);
    } finally {
      clearTimeout(timer);
    }
  }
  return { status: -2 };
}

function fieldOf(r: Resp, key: string): RespField | undefined {
  return r.fields?.find((f) => f.key === key);
}

const DEAL_MAP: Record<string, string> = {
  buy: 'buy', purchase: 'buy', sell: 'sell', sale: 'sell',
  rent: 'rent_monthly', monthly_rent: 'rent_monthly', rent_monthly: 'rent_monthly',
  full_deposit: 'rent_rahn_full', mortgage: 'rent_rahn_full', rent_rahn_full: 'rent_rahn_full',
  deposit_and_rent: 'rent_rahn_ejare', rent_rahn_ejare: 'rent_rahn_ejare',
  daily_rent: 'rent_short_term', nightly: 'rent_short_term', rent_short_term: 'rent_short_term',
};

async function main(): Promise<void> {
  const health = await fetch(`${BASE}/api/post/natural-analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.9.9.9' },
    body: JSON.stringify({ sourceText: 'آپارتمان در تهران' }),
  }).catch(() => null);
  if (!health || !health.ok) {
    console.error(`dev server not reachable at ${BASE}`);
    process.exit(1);
  }

  const out: Array<{ id: string; stratum: string; text: string; cued?: boolean; expected: object; resp: Resp }> = new Array(runCases.length);
  let done = 0;
  const started = Date.now();
  async function worker(idx: number): Promise<void> {
    while (idx < runCases.length) {
      const c = runCases[idx]!;
      const a = 1 + Math.floor(idx / 250);
      const b = 1 + (idx % 250);
      const resp = await postOne(c, `127.${a}.${b}.1`);
      out[idx] = {
        id: c.id, stratum: c.stratum, text: c.text, cued: c.cued,
        expected: { city: c.expectedCity, neighborhood: c.expectedNeighborhood, deal: c.expectedDeal, cities: c.expectedCities ?? null },
        resp,
      };
      done += 1;
      if (done % 100 === 0) console.log(`  ${done}/${runCases.length} (${(((Date.now() - started) / 1000) | 0)}s)`);
      idx += CONC;
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONC, runCases.length) }, (_, i) => worker(i)));

  // ---- grading
  const stats: Record<string, { checked: number; correct: number }> = {};
  const bump = (k: string, ok: boolean | null): void => {
    if (ok === null) return;
    stats[k] ??= { checked: 0, correct: 0 };
    stats[k]!.checked += 1;
    if (ok) stats[k]!.correct += 1;
  };
  const fails: Array<Record<string, unknown>> = [];
  const lat: number[] = [];
  const siCount: Record<string, number> = {};
  const candRanks: number[] = [];
  let candRecall = 0; let candTotal = 0;

  for (let i = 0; i < runCases.length; i++) {
    const c = runCases[i]!;
    const r = out[i]!.resp;
    if (typeof r.clientMs === 'number') lat.push(r.clientMs);
    if (r.si?.status) siCount[r.si.status] = (siCount[r.si.status] ?? 0) + 1;
    if (r.status !== 200) {
      fails.push({ id: c.id, stratum: c.stratum, field: 'http', status: r.status, error: r.error ?? null, text: c.text.slice(0, 80) });
      continue;
    }
    const ent = r.draftPatch?.entities ?? {};
    const obsCity = (fieldOf(r, 'city')?.value as string | undefined) ?? (typeof ent.city === 'string' ? ent.city : null);
    const obsHood = (fieldOf(r, 'neighborhood')?.value as string | undefined) ?? null;
    const obsDealRaw = fieldOf(r, 'dealType')?.value;
    const obsDeal = typeof obsDealRaw === 'string' ? (DEAL_MAP[obsDealRaw.trim().toLowerCase()] ?? obsDealRaw) : null;

    if (c.stratum === 'explicit' || c.stratum === 'city-only' || c.stratum === 'unique') {
      const ok = obsCity === c.expectedCity;
      bump('city', ok);
      if (!ok) fails.push({ id: c.id, stratum: c.stratum, field: 'city', expected: c.expectedCity, observed: obsCity, text: c.text.slice(0, 100) });
    }
    if (c.stratum === 'explicit' || c.stratum === 'unique') {
      const ok = obsHood === c.expectedNeighborhood;
      bump('neighborhood', ok);
      bump(runCases[i]!.cued === false ? 'neighborhood-bare' : 'neighborhood-cued', ok);
      if (!ok) fails.push({ id: c.id, stratum: c.stratum, field: 'neighborhood', expected: c.expectedNeighborhood, observed: obsHood, city: obsCity, cued: c.cued ?? null, text: c.text.slice(0, 100) });
    }
    if (c.stratum === 'multi') {
      candTotal += 1;
      const cands = r.locationCandidates ?? [];
      const cities = cands.map((x) => x.city);
      const rank = cities.indexOf(c.expectedCities![0]!);
      // expectedCities[0] is one true city (sampled name may repeat); accept ANY true city
      let best = -1;
      for (const trueCity of c.expectedCities!) {
        const at = cities.indexOf(trueCity);
        if (at >= 0 && (best < 0 || at < best)) best = at;
      }
      if (best >= 0) { candRecall += 1; candRanks.push(best + 1); }
      bump('multi-no-autocity', !ent.city);
      if (ent.city) fails.push({ id: c.id, stratum: c.stratum, field: 'silent-city', observed: ent.city, text: c.text.slice(0, 100) });
      if (best < 0) fails.push({ id: c.id, stratum: c.stratum, field: 'candidate-recall', expected: c.expectedCities, observed: cities, text: c.text.slice(0, 100) });
      void rank;
    }
    if (c.stratum === 'noloc' || c.stratum === 'trap') {
      const okCity = !ent.city;
      const okHood = !ent.neighborhood;
      bump(`${c.stratum}-no-city`, okCity);
      bump(`${c.stratum}-no-hood`, okHood);
      if (!okCity || !okHood) fails.push({ id: c.id, stratum: c.stratum, field: 'false-location', city: ent.city ?? null, hood: ent.neighborhood ?? null, text: c.text.slice(0, 100) });
    }
    if (c.expectedDeal) {
      const ok = obsDeal === c.expectedDeal;
      bump('dealType', ok);
      if (!ok) fails.push({ id: c.id, stratum: c.stratum, field: 'dealType', expected: c.expectedDeal, observed: obsDeal, text: c.text.slice(0, 100) });
    }
  }

  lat.sort((a, b) => a - b);
  const pct = (p: number): number => lat[Math.min(lat.length - 1, Math.floor((p / 100) * lat.length))] ?? -1;
  const report = {
    meta: { seed: SEED, base: BASE, concurrency: CONC, total: runCases.length, elapsedSec: Math.round((Date.now() - started) / 1000) },
    accuracy: Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, { ...v, rate: v.checked ? v.correct / v.checked : null }])),
    multi: { recall: candTotal ? candRecall / candTotal : null, checked: candTotal, mrr: candRanks.length ? candRanks.reduce((a, r) => a + 1 / r, 0) / candTotal : null, meanRank: candRanks.length ? candRanks.reduce((a, r) => a + r, 0) / candRanks.length : null },
    si: siCount,
    latencyMs: { p50: pct(50), p95: pct(95), max: lat[lat.length - 1] ?? -1 },
    failures: fails,
    cases: out,
  };
  const path = resolve(`data/si-experiments/post-natural-1000-${Date.now()}.json`);
  writeFileSync(path, JSON.stringify(report));
  console.log(JSON.stringify({ accuracy: report.accuracy, multi: { recall: report.multi.recall, mrr: report.multi.mrr }, si: report.si, latencyMs: report.latencyMs, failures: fails.length }, null, 1));
  console.log(`report: ${path}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
