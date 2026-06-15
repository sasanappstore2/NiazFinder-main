/**
 * Human-like random /post scenario generator for stress tests.
 */
import { CANONICAL_CATEGORIES } from '@/config/categories';
import { CANONICAL_CITIES } from '@/config/locations';
import type { PostPipelineFormInput } from '@/lib/need-intake/fixtures/post-pipeline-harness';

export interface HumanPostScenario extends PostPipelineFormInput {
  id: string;
  vertical: string;
  combinedText: string;
  behavior: 'minimal' | 'detailed' | 'typo' | 'split_uneven';
}

export interface HumanStressGeneratorOptions {
  seed?: number;
  count?: number;
}

const CITIES = CANONICAL_CITIES.map((c) => c.title);
const LEAF_CATEGORIES = CANONICAL_CATEGORIES.filter((c) => c.depth === 2);
const SERVICE_CATEGORIES = CANONICAL_CATEGORIES.filter(
  (c) => c.parentSlug === 'services' && c.depth === 1
);
const JOB_CATEGORIES = CANONICAL_CATEGORIES.filter((c) => c.parentSlug === 'jobs' && c.depth === 1);
const PRODUCT_LEAVES = LEAF_CATEGORIES.filter((c) => {
  const root = getRootSlug(c.slug);
  return root !== 'real-estate' && root !== 'services' && root !== 'jobs';
});

function getRootSlug(slug: string): string {
  let cur = CANONICAL_CATEGORIES.find((c) => c.slug === slug);
  while (cur?.parentSlug) {
    cur = CANONICAL_CATEGORIES.find((c) => c.slug === cur!.parentSlug);
  }
  return cur?.slug ?? slug;
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function pickWeighted<T>(rng: () => number, items: readonly { item: T; weight: number }[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rng() * total;
  for (const { item, weight } of items) {
    r -= weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1]!.item;
}

const ESTATE_KINDS = [
  { sub: 'apartment-sale', parent: 'residential-sale', labels: ['\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646', '\u0648\u0627\u062D\u062F'] },
  { sub: 'apartment-rent', parent: 'residential-rent', labels: ['\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646', '\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u062F\u0648 \u062E\u0648\u0627\u0628\u0647'] },
  { sub: 'villa-sale', parent: 'residential-sale', labels: ['\u0648\u06CC\u0644\u0627', '\u062E\u0627\u0646\u0647 \u0648\u06CC\u0644\u0627\u06CC\u06CC'] },
  { sub: 'villa-rent', parent: 'residential-rent', labels: ['\u0648\u06CC\u0644\u0627', '\u062E\u0627\u0646\u0647'] },
  { sub: 'shop-rent', parent: 'commercial-rent', labels: ['\u0645\u063A\u0627\u0632\u0647', '\u063A\u0631\u0641\u0647'] },
  { sub: 'shop-sale', parent: 'commercial-sale', labels: ['\u0645\u063A\u0627\u0632\u0647', '\u063A\u0631\u0641\u0647 \u062A\u062C\u0627\u0631\u06CC'] },
  { sub: 'office-rent', parent: 'commercial-rent', labels: ['\u062F\u0641\u062A\u0631 \u06A9\u0627\u0631', '\u062F\u0641\u062A\u0631 \u0627\u062F\u0627\u0631\u06CC'] },
  { sub: 'land-sale', parent: 'residential-sale', labels: ['\u0632\u0645\u06CC\u0646', '\u0643\u0644\u0646\u06AF\u06CC'] },
] as const;

const DISTRICTS: Record<string, string[]> = {
  '\u062A\u0647\u0631\u0627\u0646': ['\u0648\u0644\u0646\u062C\u06A9', '\u0633\u0639\u0627\u062F\u062A\u200C\u0622\u0628\u0627\u062F', '\u067E\u0648\u0646\u06A9', '\u0648\u0646\u06A9'],
  '\u0645\u0634\u0647\u062F': ['\u0633\u062C\u0627\u062F', '\u0627\u062D\u0645\u062F\u0622\u0628\u0627\u062F', '\u0647\u0627\u0634\u0645\u06CC\u0647', '\u06A9\u0648\u0647\u0633\u0646\u06AF\u06CC'],
  '\u0627\u0635\u0641\u0647\u0627\u0646': ['\u0645\u0631\u062F\u0627\u0648\u06CC\u062C', '\u0686\u0647\u0627\u0631\u0628\u0627\u063A'],
  '\u0634\u06CC\u0631\u0627\u0632': ['\u0645\u0639\u0627\u0644\u06CC\u200C\u0622\u0628\u0627\u062F', '\u0635\u062F\u0631\u0627'],
  '\u062A\u0628\u0631\u06CC\u0632': ['\u0648\u0644\u06CC\u0639\u0635\u0631', '\u0631\u0634\u062F\u06CC\u0647'],
  '\u06A9\u0631\u062C': ['\u06AF\u0644\u0634\u0647\u0631', '\u0639\u0638\u06CC\u0645\u06CC\u0647'],
};

const BRANDS = ['\u067E\u0698\u0648 206', '\u067E\u0698\u0648 207', '\u0633\u0645\u0646\u062F', '\u062A\u06CC\u0628\u0627', '\u062F\u0646\u0627', '\u067E\u0631\u0627\u06CC\u062F'];
const ITEMS = ['\u0622\u06CC\u0641\u0648\u0646 13', '\u06AF\u0644\u06A9\u0633\u06CC S23', '\u0644\u0646\u0648\u0648\u0648 ThinkPad'];
const STACKS = ['Node.js', 'React', 'Python'];

function typoize(text: string, rng: () => number): string {
  if (rng() > 0.12) return text;
  const fa = '\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9';
  return text.replace(/(\d)/g, (d) => (rng() > 0.5 ? fa[Number(d)]! : d));
}

function fillTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

function buildEstateScenario(rng: () => number, idx: number): HumanPostScenario {
  const city = pick(rng, CITIES);
  const hoodList = DISTRICTS[city] ?? [city];
  const hood = pick(rng, hoodList);
  const kind = pick(rng, ESTATE_KINDS);
  const label = pick(rng, kind.labels);
  const dealRoll = rng();
  let needText: string;
  let userDealType: string | undefined;
  if (dealRoll < 0.25) {
    needText = `\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u062E\u0631\u06CC\u062F ${hood} ${city}`;
    userDealType = 'buy';
  } else if (dealRoll < 0.5) {
    needText = `\u0627\u062C\u0627\u0631\u0647 ${label} ${hood} ${city}`;
    userDealType = 'rent_monthly';
  } else if (dealRoll < 0.75) {
    needText = `\u0631\u0647\u0646 \u0648 \u0627\u062C\u0627\u0631\u0647 ${label} ${hood}`;
    userDealType = 'rent_rahn_ejare';
  } else {
    needText = `\u0631\u0647\u0646 \u0643\u0627\u0645\u0644 ${label} ${city}`;
    userDealType = 'rent_rahn_full';
  }
  const detailsText = pick(rng, [
    `${pick(rng, ['65', '85', '100', '120'])} \u0645\u062A\u0631`,
    `\u0628\u0648\u062F\u062C\u0647 \u062A\u0627 ${pick(rng, ['1', '2', '3'])} \u0645\u06CC\u0644\u06CC\u0627\u0631\u062F`,
    '',
  ]);
  const combined = [needText, detailsText].filter(Boolean).join('\n');
  const behavior = pick(rng, ['minimal', 'detailed', 'typo', 'split_uneven'] as const);
  return {
    id: `estate-${idx}`,
    vertical: 'real-estate',
    needText: behavior === 'split_uneven' ? needText : combined.split('\n')[0] ?? combined,
    detailsText: behavior === 'minimal' ? '' : detailsText,
    categorySlug: kind.parent,
    subcategorySlug: kind.sub,
    city,
    neighborhood: rng() > 0.35 ? hood : '',
    combinedText: typoize(combined, rng),
    behavior,
    userDealType,
  };
}

function buildVehicleScenario(rng: () => number, idx: number): HumanPostScenario {
  const city = pick(rng, CITIES);
  const brand = pick(rng, BRANDS);
  const year = String(1388 + Math.floor(rng() * 15));
  const needText = `\u062E\u0631\u06CC\u062F ${brand} \u0645\u062F\u0644 ${year} ${city}`;
  return {
    id: `vehicle-${idx}`,
    vertical: 'vehicles',
    needText,
    detailsText: rng() > 0.5 ? `\u0643\u0627\u0631\u0643\u0631\u062F ${Math.floor(rng() * 120000)} \u0643\u064A\u0644\u0648\u0645\u062A\u0631` : '',
    categorySlug: 'car',
    subcategorySlug: 'car-ride',
    city,
    combinedText: typoize(needText, rng),
    behavior: 'detailed',
  };
}

function buildProductScenario(rng: () => number, idx: number): HumanPostScenario {
  const cat = pick(rng, PRODUCT_LEAVES);
  const city = pick(rng, CITIES);
  const parent = CANONICAL_CATEGORIES.find((c) => c.slug === cat.parentSlug);
  const item = pick(rng, ITEMS);
  const needText = `\u062E\u0631\u06CC\u062F ${item} \u062F\u0631 ${city}`;
  return {
    id: `product-${idx}`,
    vertical: getRootSlug(cat.slug),
    needText,
    detailsText: '',
    categorySlug: parent?.slug ?? cat.parentSlug ?? cat.slug,
    subcategorySlug: cat.depth === 2 ? cat.slug : undefined,
    city,
    combinedText: typoize(needText, rng),
    behavior: 'minimal',
  };
}

function buildServiceScenario(rng: () => number, idx: number): HumanPostScenario {
  const cat = pick(rng, SERVICE_CATEGORIES);
  const city = pick(rng, CITIES);
  const hood = pick(rng, DISTRICTS[city] ?? [city]);
  const needText = `${cat.title} ${hood} ${city}`;
  return {
    id: `service-${idx}`,
    vertical: 'services',
    needText,
    detailsText: rng() > 0.5 ? '\u062A\u0631\u062C\u06CC\u062D\u0627\u064B \u0627\u0645\u0631\u0648\u0632' : '',
    categorySlug: cat.slug,
    city,
    neighborhood: hood,
    combinedText: typoize(needText, rng),
    behavior: 'detailed',
  };
}

function buildJobScenario(rng: () => number, idx: number): HumanPostScenario {
  const cat = pick(rng, JOB_CATEGORIES);
  const city = pick(rng, CITIES);
  const stack = pick(rng, STACKS);
  const hiring = rng() > 0.5;
  const needText = hiring
    ? `\u0627\u0633\u062A\u062E\u062F\u0627\u0645 ${cat.title} ${stack} ${city}`
    : `\u062F\u0646\u0628\u0627\u0644 \u0643\u0627\u0631 ${cat.title} ${city}`;
  return {
    id: `job-${idx}`,
    vertical: 'jobs',
    needText,
    detailsText: hiring ? '\u062A\u0645\u0627\u0645\u200C\u0648\u0642\u062A' : '\u067E\u0627\u0631\u0647\u200C\u0648\u0642\u062A',
    categorySlug: cat.slug,
    city,
    combinedText: typoize(needText, rng),
    behavior: 'detailed',
  };
}

export function generateHumanPostScenarios(
  options: HumanStressGeneratorOptions = {}
): HumanPostScenario[] {
  const count = options.count ?? 1000;
  const seed = options.seed ?? 42;
  const rng = mulberry32(seed);
  const out: HumanPostScenario[] = [];

  for (let i = 0; i < count; i++) {
    const vertical = pickWeighted(rng, [
      { item: 'estate' as const, weight: 35 },
      { item: 'vehicle' as const, weight: 12 },
      { item: 'product' as const, weight: 18 },
      { item: 'service' as const, weight: 20 },
      { item: 'job' as const, weight: 15 },
    ]);
    switch (vertical) {
      case 'estate':
        out.push(buildEstateScenario(rng, i));
        break;
      case 'vehicle':
        out.push(buildVehicleScenario(rng, i));
        break;
      case 'product':
        out.push(buildProductScenario(rng, i));
        break;
      case 'service':
        out.push(buildServiceScenario(rng, i));
        break;
      case 'job':
        out.push(buildJobScenario(rng, i));
        break;
    }
  }
  return out;
}
