/**
 * Deterministic realistic-estate ad generator for the Laya /post matrix.
 * Produces N ad texts with the expected extraction targets derived from the
 * same catalog data the engine resolves against.
 *
 * Run: npx --yes tsx scripts/testing/laya-matrix/generate-cases.ts --count 10000 --seed 20261001 --out out/laya-matrix/cases-10k.jsonl
 */
import { promises as fs } from 'fs';
import path from 'path';

const ROOT = process.cwd();
const CATALOG_DIR = path.join(ROOT, 'src', 'data', 'neighborhoods', 'catalog');

// ---------- seeded PRNG (mulberry32) ----------
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

// ---------- catalog loading ----------
interface CityCatalog {
  cityId: string;
  cityName: string;
  /** City appears in the canonical cities list (engine-selectable). */
  known: boolean;
  hoods: Array<{ id: string; name: string; areas: string[] }>;
  areaIndex: Map<string, string[]>; // area name -> parent hood ids (this city)
}

async function loadCanonicalTitles(): Promise<Set<string>> {
  const raw = await fs.readFile(path.join(ROOT, 'src', 'config', 'locations.ts'), 'utf8');
  const titles = new Set<string>();
  for (const m of raw.matchAll(/title:\s*'([^']+)'/g)) titles.add(m[1]!);
  return titles;
}

async function loadCity(cityId: string, canonicalTitles: Set<string>): Promise<CityCatalog | null> {
  try {
    const raw = await fs.readFile(path.join(CATALOG_DIR, `${cityId}.json`), 'utf8');
    const data = JSON.parse(raw) as {
      cityId?: string;
      cityName?: string;
      neighborhoods?: Array<{ id: string; name: string; areas?: string[] }>;
    };
    const hoods = (data.neighborhoods ?? []).map((n) => ({
      id: n.id,
      name: n.name,
      areas: (n.areas ?? []).filter((a) => a.replace(/\s+/g, '').length >= 3),
    }));
    if (!hoods.length) return null;
    const areaIndex = new Map<string, string[]>();
    for (const h of hoods) {
      for (const a of h.areas) {
        const list = areaIndex.get(a) ?? [];
        if (!list.includes(h.id)) list.push(h.id);
        areaIndex.set(a, list);
      }
    }
    const cityName = data.cityName ?? cityId;
    return {
      cityId: data.cityId ?? cityId,
      cityName,
      known: canonicalTitles.has(cityName),
      hoods,
      areaIndex,
    };
  } catch {
    return null;
  }
}

async function loadCities(canonicalTitles: Set<string>): Promise<CityCatalog[]> {
  const manifest = JSON.parse(
    await fs.readFile(path.join(ROOT, 'src', 'data', 'neighborhoods', 'manifest.json'), 'utf8')
  ) as { counts?: Record<string, number> };
  const ids = Object.entries(manifest.counts ?? {})
    .filter(([, c]) => c > 0)
    .map(([id]) => id);
  const out: CityCatalog[] = [];
  const BATCH = 24;
  for (let i = 0; i < ids.length; i += BATCH) {
    const results = await Promise.all(ids.slice(i, i + BATCH).map((id) => loadCity(id, canonicalTitles)));
    for (const r of results) if (r) out.push(r);
  }
  return out;
}

// ---------- text helpers ----------
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
function toPersianDigits(n: number | string): string {
  return String(n).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]!);
}

interface Case {
  id: string;
  group: string;
  text: string;
  expect: {
    cityId: string;
    cityName: string;
    /** false: the city name is not engine-known → city check skipped. */
    cityKnown: boolean;
    /** false: the template omitted the city name (context-only expectation). */
    cityInText: boolean;
    /** Parent hood the mentioned sub-area/hood resolves to. */
    hoodIds: string[]; // all acceptable parent ids (1 = unique truth)
    mentionedLabel: string;
    mentionMode: 'hood' | 'sub' | 'sub+parent';
    categorySlug?: string;
    dealType?: string;
    propertyKind?: string;
    areaMeters?: number;
    rooms?: number;
    rahnAmount?: number;
    monthlyRent?: number;
    budgetMax?: number;
    parking?: boolean;
    elevator?: boolean;
  };
}

type Deal =
  | 'apartment-rent'
  | 'apartment-full-rahn'
  | 'apartment-sale'
  | 'villa-rent'
  | 'villa-sale'
  | 'land-sale'
  | 'land-rent'
  | 'office-rent'
  | 'office-sale'
  | 'shop-rent'
  | 'shop-sale';

const DEALS: Array<{ deal: Deal; weight: number }> = [
  { deal: 'apartment-rent', weight: 30 },
  { deal: 'apartment-full-rahn', weight: 10 },
  { deal: 'apartment-sale', weight: 22 },
  { deal: 'villa-rent', weight: 7 },
  { deal: 'villa-sale', weight: 7 },
  { deal: 'land-sale', weight: 5 },
  { deal: 'land-rent', weight: 3 },
  { deal: 'office-rent', weight: 6 },
  { deal: 'office-sale', weight: 3 },
  { deal: 'shop-rent', weight: 5 },
  { deal: 'shop-sale', weight: 2 },
];

function pickWeighted<T>(rng: () => number, items: Array<{ value: T; weight: number }>): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rng() * total;
  for (const item of items) {
    r -= item.weight;
    if (r < 0) return item.value;
  }
  return items[items.length - 1]!.value;
}

const PRIORITY_CITIES = [
  'tehran-city',
  'mashhad',
  'isfahan-city',
  'shiraz',
  'tabriz',
  'karaj',
  'ahvaz',
  'qom-city',
  'urmia',
  'rasht',
];

function pickCity(rng: () => number, cities: CityCatalog[]): CityCatalog {
  const roll = rng();
  if (roll < 0.45) {
    const tehran = cities.find((c) => c.cityId === 'tehran-city');
    if (tehran) return tehran;
  }
  if (roll < 0.8) {
    const id = PRIORITY_CITIES[Math.floor(rng() * PRIORITY_CITIES.length)]!;
    const city = cities.find((c) => c.cityId === id);
    if (city) return city;
  }
  return cities[Math.floor(rng() * cities.length)]!;
}

function pickHoodOrSub(rng: () => number, city: CityCatalog): {
  label: string;
  mode: 'hood' | 'sub' | 'sub+parent';
  hoodIds: string[];
  parentName?: string;
} {
  const hood = city.hoods[Math.floor(rng() * city.hoods.length)]!;
  const roll = rng();
  if (roll < 0.6 || !hood.areas.length) {
    return { label: hood.name, mode: 'hood', hoodIds: [hood.id] };
  }
  if (roll < 0.9) {
    const area = hood.areas[Math.floor(rng() * hood.areas.length)]!;
    const parents = city.areaIndex.get(area) ?? [hood.id];
    return { label: area, mode: 'sub', hoodIds: parents };
  }
  const area = hood.areas[Math.floor(rng() * hood.areas.length)]!;
  const parents = city.areaIndex.get(area) ?? [hood.id];
  return { label: `${area} ${hood.name}`, mode: 'sub+parent', hoodIds: parents, parentName: hood.name };
}

function num(rng: () => number, min: number, max: number): number {
  return Math.round(min + rng() * (max - min));
}

function fmtAmount(rng: () => number, millions: number): string {
  const persian = rng() < 0.65;
  const unitRoll = rng();
  if (unitRoll < 0.75) {
    const text = `${millions} میلیون`;
    return persian ? toPersianDigits(text) : text;
  }
  if (unitRoll < 0.9) {
    const text = `${millions} میلیون تومن`;
    return persian ? toPersianDigits(text) : text;
  }
  const text = `${millions} میلیون تومان`;
  return persian ? toPersianDigits(text) : text;
}

function fmtArea(rng: () => number, meters: number): string {
  const text = `${meters} متر`;
  return rng() < 0.65 ? toPersianDigits(text) : text;
}

const WANT_VERBS = ['میخوام', 'می‌خواهم', 'دنبالش هستم', 'لازم دارم', 'نیاز مندم', 'دنبالم', 'بخوام'];
const LOCATION_PREFIX = ['در', 'تو', 'توی', 'محدوده', 'حوالی', 'نزدیک', ''];

function buildText(rng: () => number, deal: Deal, city: CityCatalog, loc: ReturnType<typeof pickHoodOrSub>): {
  text: string;
  expect: Case['expect'];
} {
  const expect: Case['expect'] = {
    cityId: city.cityId,
    cityName: city.cityName,
    cityKnown: city.known,
    cityInText: true,
    hoodIds: loc.hoodIds,
    mentionedLabel: loc.label,
    mentionMode: loc.mode,
  };
  const verb = WANT_VERBS[Math.floor(rng() * WANT_VERBS.length)]!;
  const locPhrase =
    (LOCATION_PREFIX[Math.floor(rng() * LOCATION_PREFIX.length)]!
      ? `${LOCATION_PREFIX[Math.floor(rng() * LOCATION_PREFIX.length)]!} `
      : '') + loc.label;

  let text: string;
  if (deal === 'apartment-rent') {
    const area = num(rng, 55, 220);
    const rahn = num(rng, 50, 1500);
    const rent = num(rng, 5, 120);
    Object.assign(expect, {
      categorySlug: 'apartment-rent',
      dealType: 'rent_rahn_ejare',
      propertyKind: 'apartment',
      areaMeters: area,
      rahnAmount: rahn * 1_000_000,
      monthlyRent: rent * 1_000_000,
    });
    const extraRoll = rng();
    if (extraRoll < 0.2) expect.parking = true;
    else if (extraRoll < 0.3) expect.elevator = true;
    else if (extraRoll < 0.4) expect.rooms = num(rng, 1, 3);
    const rahnTxt = fmtAmount(rng, rahn);
    const rentTxt = fmtAmount(rng, rent);
    const templates = [
      `من یک آپارتمان ${fmtArea(rng, area)} ${locPhrase} ${city.cityName} ${verb} ${rahnTxt} رهن دارم ${rentTxt} اجاره`,
      `آپارتمان ${fmtArea(rng, area)} ${locPhrase} ${city.cityName} رهن ${rahnTxt} و اجارهٔ ماهانه ${rentTxt}`,
      `${fmtArea(rng, area)} آپارتمان ${verb} ${locPhrase}، ${rahnTxt} رهن ${rentTxt} اجاره`,
    ];
    text = templates[Math.floor(rng() * templates.length)]!;
  } else if (deal === 'apartment-full-rahn') {
    const area = num(rng, 50, 180);
    const rahn = num(rng, 300, 4000);
    Object.assign(expect, {
      categorySlug: 'apartment-rent',
      dealType: 'rahn_complete',
      propertyKind: 'apartment',
      areaMeters: area,
      rahnAmount: rahn * 1_000_000,
    });
    text = `آپارتمان ${fmtArea(rng, area)} ${locPhrase} ${city.cityName} رهن کامل ${fmtAmount(rng, rahn)} اجاره ندارم`;
  } else if (deal === 'apartment-sale') {
    const area = num(rng, 55, 250);
    const price = num(rng, 3000, 60000); // میلیون تومن
    Object.assign(expect, {
      categorySlug: 'apartment-sale',
      dealType: 'buy',
      propertyKind: 'apartment',
      areaMeters: area,
      budgetMax: price * 1_000_000,
    });
    const unit =
      price % 1000 === 0
        ? `${toPersianDigits(price / 1000)} میلیارد`
        : `${toPersianDigits(price)} میلیون`;
    text = `دنبال خرید آپارتمان ${fmtArea(rng, area)} ${locPhrase} ${city.cityName} هستم با بودجه ${unit}`;
  } else if (deal === 'villa-rent') {
    const rahn = num(rng, 100, 3000);
    const rent = num(rng, 10, 150);
    Object.assign(expect, {
      categorySlug: 'villa-rent',
      dealType: 'rent_rahn_ejare',
      propertyKind: 'villa',
      rahnAmount: rahn * 1_000_000,
      monthlyRent: rent * 1_000_000,
    });
    text = `ویلا ${locPhrase} ${city.cityName} ${verb} رهن ${fmtAmount(rng, rahn)} اجاره ${fmtAmount(rng, rent)}`;
  } else if (deal === 'villa-sale') {
    const price = num(rng, 5000, 90000);
    Object.assign(expect, {
      categorySlug: 'villa-sale',
      dealType: 'buy',
      propertyKind: 'villa',
      budgetMax: price * 1_000_000,
    });
    text = `خرید خانه و ویلا ${locPhrase} ${city.cityName} با بودجه تا ${fmtAmount(rng, price)}`;
  } else if (deal === 'land-sale') {
    const meters = num(rng, 150, 2000);
    const price = num(rng, 2000, 80000);
    Object.assign(expect, {
      categorySlug: 'land-sale',
      dealType: 'buy',
      propertyKind: 'land',
      areaMeters: meters,
      budgetMax: price * 1_000_000,
    });
    text = `زمین ${fmtArea(rng, meters)} ${locPhrase} ${city.cityName} برای خرید، بودجه ${fmtAmount(rng, price)}`;
  } else if (deal === 'land-rent') {
    const rahn = num(rng, 200, 2000);
    const rent = num(rng, 10, 80);
    Object.assign(expect, {
      categorySlug: 'land-rent',
      dealType: 'rent_rahn_ejare',
      propertyKind: 'land',
      rahnAmount: rahn * 1_000_000,
      monthlyRent: rent * 1_000_000,
    });
    text = `اجاره زمین کشاورزی ${locPhrase} ${city.cityName} رهن ${fmtAmount(rng, rahn)} اجارهٔ ماهانه ${fmtAmount(rng, rent)}`;
  } else if (deal === 'office-rent') {
    const area = num(rng, 40, 400);
    const rahn = num(rng, 200, 3000);
    const rent = num(rng, 15, 200);
    Object.assign(expect, {
      categorySlug: 'office-rent',
      dealType: 'rent_rahn_ejare',
      propertyKind: 'office',
      areaMeters: area,
      rahnAmount: rahn * 1_000_000,
      monthlyRent: rent * 1_000_000,
    });
    text = `دفتر کار اداری ${fmtArea(rng, area)} ${locPhrase} ${city.cityName} ${verb} رهن ${fmtAmount(rng, rahn)} و اجاره ${fmtAmount(rng, rent)}`;
  } else if (deal === 'office-sale') {
    const area = num(rng, 50, 350);
    const price = num(rng, 8000, 120000);
    Object.assign(expect, {
      categorySlug: 'office-sale',
      dealType: 'buy',
      propertyKind: 'office',
      areaMeters: area,
      budgetMax: price * 1_000_000,
    });
    text = `خرید دفتر کار ${fmtArea(rng, area)} ${locPhrase} ${city.cityName} تا بودجه ${fmtAmount(rng, price)}`;
  } else if (deal === 'shop-rent') {
    const area = num(rng, 15, 200);
    const rahn = num(rng, 300, 5000);
    const rent = num(rng, 20, 250);
    Object.assign(expect, {
      categorySlug: 'shop-rent',
      dealType: 'rent_rahn_ejare',
      propertyKind: 'shop',
      areaMeters: area,
      rahnAmount: rahn * 1_000_000,
      monthlyRent: rent * 1_000_000,
    });
    text = `مغازه ${fmtArea(rng, area)} متری ${locPhrase} ${city.cityName} رهن ${fmtAmount(rng, rahn)} اجارهٔ ماهانه ${fmtAmount(rng, rent)}`;
  } else {
    // shop-sale
    const area = num(rng, 15, 180);
    const price = num(rng, 10000, 200000);
    Object.assign(expect, {
      categorySlug: 'shop-sale',
      dealType: 'buy',
      propertyKind: 'shop',
      areaMeters: area,
      budgetMax: price * 1_000_000,
    });
    text = `قصد خرید مغازه و غرفه ${fmtArea(rng, area)} ${locPhrase} ${city.cityName} دارم، بودجه ${fmtAmount(rng, price)}`;
  }

  // 12% of the texts omit the city name (context-only, like a user whose form
  // already has the city selected).
  if (rng() < 0.12 && text.includes(` ${city.cityName}`)) {
    text = text.replace(` ${city.cityName}`, '');
    expect.cityInText = false;
  }
  return { text, expect };
}

// ---------- main ----------
async function main() {
  const arg = (name: string, fallback: string): string => {
    const argv = process.argv;
    const eq = argv.find((a) => a.startsWith(`--${name}=`));
    if (eq) return eq.slice(name.length + 3);
    const idx = argv.indexOf(`--${name}`);
    if (idx >= 0 && argv[idx + 1] != null) return argv[idx + 1]!;
    return fallback;
  };
  const count = Number(arg('count', '10000'));
  const seed = Number(arg('seed', '20261001'));
  const outPath = arg('out', 'out/laya-matrix/cases.jsonl');

  const canonicalTitles = await loadCanonicalTitles();
  const cities = await loadCities(canonicalTitles);
  if (!cities.length) throw new Error('no city catalogs loaded');
  const priority = PRIORITY_CITIES.map((id) => cities.find((c) => c.cityId === id)).filter(
    (c): c is CityCatalog => Boolean(c)
  );
  console.log(`cities loaded: ${cities.length} (priority: ${priority.length})`);

  const rng = mulberry32(seed);
  const lines: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const city = rng() < 0.85 ? pickCity(rng, cities) : priority[Math.floor(rng() * priority.length)]!;
    const deal = pickWeighted<Deal>(rng, DEALS.map((d) => ({ value: d.deal, weight: d.weight })));
    const loc = pickHoodOrSub(rng, city);
    const { text, expect } = buildText(rng, deal, city, loc);
    const caseItem: Case = { id: `c${seed}-${i}`, group: deal, text, expect };
    lines.push(JSON.stringify(caseItem));
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, lines.join('\n'), 'utf8');
  console.log(`wrote ${lines.length} cases → ${outPath}`);
}

main().catch((e) => {
  console.error('GENERATOR FAILED:', e);
  process.exit(1);
});
