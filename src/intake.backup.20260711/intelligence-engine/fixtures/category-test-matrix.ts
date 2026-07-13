import { CANONICAL_CATEGORIES, getCategoryPath } from '@/config/categories';

export type TestVertical =
  | 'real-estate'
  | 'vehicles'
  | 'electronics'
  | 'home-appliances'
  | 'services'
  | 'personal-items'
  | 'entertainment'
  | 'social'
  | 'jobs';

export interface CategoryTestProfile {
  id: string;
  categorySlug: string;
  vertical: TestVertical;
  titleFa: string;
  /** Hint for Gemma generation (English ok). */
  generationHint: string;
  /** Cities/neighborhoods to weave into text. */
  locationHints?: string[];
}

function leafCategories(): Array<{ slug: string; title: string; vertical: TestVertical }> {
  const out: Array<{ slug: string; title: string; vertical: TestVertical }> = [];
  for (const c of CANONICAL_CATEGORIES) {
    if (c.depth !== 2) continue;
    const path = getCategoryPath(c.slug);
    const root = path[0]?.slug;
    if (
      root === 'real-estate' ||
      root === 'vehicles' ||
      root === 'electronics' ||
      root === 'home-appliances' ||
      root === 'services' ||
      root === 'personal-items' ||
      root === 'entertainment' ||
      root === 'social' ||
      root === 'jobs'
    ) {
      out.push({ slug: c.slug, title: c.title, vertical: root as TestVertical });
    }
  }
  return out;
}

const CURATED: Omit<CategoryTestProfile, 'id'>[] = [
  {
    categorySlug: 'apartment-rent',
    vertical: 'real-estate',
    titleFa: '\u0627\u062C\u0627\u0631\u0647 \u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646',
    generationHint: 'seeker wants 2-bed apartment rent in Tehran Niavaran, 90m2, 50M deposit 5M monthly',
    locationHints: ['\u062A\u0647\u0631\u0627\u0646', '\u0646\u06CC\u0627\u0648\u0631\u0627\u0646'],
  },
  {
    categorySlug: 'shop-rent',
    vertical: 'real-estate',
    titleFa: '\u0627\u062C\u0627\u0631\u0647 \u0645\u063A\u0627\u0632\u0647',
    generationHint: 'commercial shop rent 100m2 Tehran, 500M rahn 12M rent',
    locationHints: ['\u062A\u0647\u0631\u0627\u0646'],
  },
  {
    categorySlug: 'villa-sale',
    vertical: 'real-estate',
    titleFa: '\u0641\u0631\u0648\u0634 \u0648\u06CC\u0644\u0627',
    generationHint: 'sell villa 300m2 in north Tehran, 15 billion toman',
    locationHints: ['\u062A\u0647\u0631\u0627\u0646'],
  },
  {
    categorySlug: 'land-sale',
    vertical: 'real-estate',
    titleFa: '\u0641\u0631\u0648\u0634 \u0632\u0645\u06CC\u0646',
    generationHint: 'land plot 500m2 Karaj for sale 8 billion',
    locationHints: ['\u0643\u0631\u062C'],
  },
  {
    categorySlug: 'suite-apartment-rent',
    vertical: 'real-estate',
    titleFa: '\u0627\u062C\u0627\u0631\u0647 \u06A9\u0648\u062A\u0627\u0647\u200C\u0645\u062F\u062A',
    generationHint: 'short term suite daily rent in Isfahan near Naqsh-e Jahan',
    locationHints: ['\u0627\u0635\u0641\u0647\u0627\u0646'],
  },
  {
    categorySlug: 'office-rent',
    vertical: 'real-estate',
    titleFa: '\u0627\u062C\u0627\u0631\u0647 \u062F\u0641\u062A\u0631',
    generationHint: 'office 80m2 Vanak Tehran monthly rent 25M',
    locationHints: ['\u062A\u0647\u0631\u0627\u0646', '\u0648\u0646\u06A9'],
  },
  {
    categorySlug: 'car-ride',
    vertical: 'vehicles',
    titleFa: '\u062E\u0631\u06CC\u062F \u062E\u0648\u062F\u0631\u0648',
    generationHint: 'buy used Peugeot 206 1400 model Mashhad budget 800M',
    locationHints: ['\u0645\u0634\u0647\u062F'],
  },
  {
    categorySlug: 'motorcycle',
    vertical: 'vehicles',
    titleFa: '\u0641\u0631\u0648\u0634 \u0645\u062A\u0648\u0631',
    generationHint: 'sell Honda CDI motorcycle (not bicycle!) Tehran 45M',
    locationHints: ['\u062A\u0647\u0631\u0627\u0646'],
  },
  {
    categorySlug: 'mobile-phone',
    vertical: 'electronics',
    titleFa: '\u062E\u0631\u06CC\u062F \u06AF\u0648\u0634\u06CC',
    generationHint: 'buy iPhone 13 Pro used good condition Shiraz 45M',
    locationHints: ['\u0634\u06CC\u0631\u0627\u0632'],
  },
  {
    categorySlug: 'laptop',
    vertical: 'electronics',
    titleFa: '\u0644\u067E\u200C\u062A\u0627\u067E',
    generationHint: 'sell MacBook Air M1 laptop Tehran 38M',
    locationHints: ['\u062A\u0647\u0631\u0627\u0646'],
  },
  {
    categorySlug: 'game-console',
    vertical: 'electronics',
    titleFa: '\u06A9\u0646\u0633\u0648\u0644',
    generationHint: 'buy PS5 with 2 controllers Tabriz',
    locationHints: ['\u062A\u0628\u0631\u06CC\u0632'],
  },
  {
    categorySlug: 'refrigerator',
    vertical: 'home-appliances',
    titleFa: '\u06CC\u062E\u0686\u0627\u0644',
    generationHint: 'sell Samsung fridge side-by-side Tehran 25M',
    locationHints: ['\u062A\u0647\u0631\u0627\u0646'],
  },
  {
    categorySlug: 'washing-machine',
    vertical: 'home-appliances',
    titleFa: '\u0645\u0627\u0634\u06CC\u0646 \u0644\u0628\u0627\u0633\u0634\u0648\u06CC\u06CC',
    generationHint: 'need automatic washing machine under 12M Ahvaz',
    locationHints: ['\u0627\u0647\u0648\u0627\u0632'],
  },
  {
    categorySlug: 'plumbing',
    vertical: 'services',
    titleFa: '\u0644\u0648\u0644\u0647\u200C\u06A9\u0634\u06CC',
    generationHint: 'need plumber for apartment pipe leak today Tehran',
    locationHints: ['\u062A\u0647\u0631\u0627\u0646'],
  },
  {
    categorySlug: 'moving',
    vertical: 'services',
    titleFa: '\u0627\u0633\u0628\u0627\u0628\u200C\u06A9\u0634\u06CC',
    generationHint: 'moving service from Tehran to Karaj 3-bedroom house next week',
    locationHints: ['\u062A\u0647\u0631\u0627\u0646'],
  },
  {
    categorySlug: 'electrical',
    vertical: 'services',
    titleFa: '\u0628\u0631\u0642\u200C\u06A9\u0627\u0631\u06CC',
    generationHint: 'electrician for wiring new shop Isfahan',
    locationHints: ['\u0627\u0635\u0641\u0647\u0627\u0646'],
  },
  {
    categorySlug: 'cleaning',
    vertical: 'services',
    titleFa: '\u0646\u0638\u0627\u0641\u062A',
    generationHint: 'home deep cleaning 150m2 apartment Rasht',
    locationHints: ['\u0631\u0634\u062A'],
  },
  {
    categorySlug: 'education',
    vertical: 'services',
    titleFa: '\u0645\u0639\u0644\u0645 \u062E\u0635\u0648\u0635\u06CC',
    generationHint: 'private math tutor for konkur student Tehran',
    locationHints: ['\u062A\u0647\u0631\u0627\u0646'],
  },
  {
    categorySlug: 'clothing',
    vertical: 'personal-items',
    titleFa: '\u067E\u0648\u0634\u0627\u06A9',
    generationHint: 'sell mens winter coat brand new size L',
    locationHints: ['\u062A\u0647\u0631\u0627\u0646'],
  },
  {
    categorySlug: 'pets',
    vertical: 'entertainment',
    titleFa: '\u062D\u06CC\u0648\u0627\u0646 \u0627\u0644\u0648\u0641',
    generationHint: 'sell Persian cat kitten vaccinated Qom',
    locationHints: ['\u0642\u0645'],
  },
  {
    categorySlug: 'it',
    vertical: 'jobs',
    titleFa: '\u0633\u0631\u0645\u0627\u06CC\u06AF\u0631 \u0641\u0631\u0627\u0646\u062A\u200C\u0627\u0646\u062F',
    generationHint: 'company hiring React developer remote Tehran salary negotiable',
    locationHints: ['\u062A\u0647\u0631\u0627\u0646'],
  },
  {
    categorySlug: 'engineering',
    vertical: 'jobs',
    titleFa: '\u0645\u0647\u0646\u062F\u0633 \u0639\u0645\u0631\u0627\u0646',
    generationHint: 'civil engineer job site supervisor Mashhad',
    locationHints: ['\u0645\u0634\u0647\u062F'],
  },
];

/** Build 50 diverse profiles: curated first, then fill from leaf catalog. */
export function buildTestProfiles(count = 50, round = 1): CategoryTestProfile[] {
  const leaves = leafCategories();
  const used = new Set<string>();
  const out: CategoryTestProfile[] = [];

  const curatedStart = ((round - 1) * 5) % CURATED.length;
  const curatedOrder = [...CURATED.slice(curatedStart), ...CURATED.slice(0, curatedStart)];

  for (const c of curatedOrder) {
    if (out.length >= count) break;
    if (used.has(c.categorySlug)) continue;
    used.add(c.categorySlug);
    out.push({ id: `cur-${c.categorySlug}`, ...c });
  }

  const leafStart = ((round - 1) * 13) % Math.max(1, leaves.length);
  const rotated = [...leaves.slice(leafStart), ...leaves.slice(0, leafStart)];

  for (const leaf of rotated) {
    if (out.length >= count) break;
    if (used.has(leaf.slug)) continue;
    used.add(leaf.slug);
    out.push({
      id: `leaf-${leaf.slug}-r${round}`,
      categorySlug: leaf.slug,
      vertical: leaf.vertical,
      titleFa: leaf.title,
      generationHint: `realistic Persian marketplace post for category ${leaf.slug} (${leaf.title})`,
      locationHints: ['\u062A\u0647\u0631\u0627\u0646', '\u0645\u0634\u0647\u062F', '\u0627\u0635\u0641\u0647\u0627\u0646'],
    });
  }

  return out.slice(0, count);
}

export function verticalFromCategorySlug(slug: string): TestVertical | null {
  const path = getCategoryPath(slug);
  const root = path[0]?.slug;
  if (!root) return null;
  return root as TestVertical;
}
