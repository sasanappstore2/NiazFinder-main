import { CATEGORY_SYNONYMS } from '@/intake/dictionaries/categoryIndex';
import { LEGACY_CATEGORY_KEYWORDS } from '@/lib/need-intake/intent-parser';
import type { IntakeRule } from '@/intake/rules/types';

let cached: IntakeRule[] | null = null;

/** Convert legacy CATEGORY_KEYWORDS + CATEGORY_SYNONYMS to registry rules. */
export function buildLegacyIntakeRules(): IntakeRule[] {
  if (cached) return cached;

  const rules: IntakeRule[] = [];
  let seq = 0;

  for (const row of LEGACY_CATEGORY_KEYWORDS) {
    for (const word of row.words) {
      rules.push({
        id: `legacy-kw-${row.slug}-${seq++}`,
        kind: 'keyword',
        slug: row.slug,
        pattern: word,
        priority: row.priority,
        weight: 1,
      });
    }
  }

  const highPriorityPhrases: Array<{ slug: string; pattern: string; priority: number; weight?: number }> = [
    { slug: 'shop-sale', pattern: '\u0641\u0631\u0648\u0634 \u0645\u063A\u0627\u0632\u0647', priority: 20, weight: 5 },
    { slug: 'shop-sale', pattern: '\u0641\u0631\u0648\u0634 \u063A\u0631\u0641\u0647', priority: 20, weight: 5 },
    { slug: 'shop-rent', pattern: '\u0627\u062C\u0627\u0631\u0647 \u0645\u063A\u0627\u0632\u0647', priority: 18, weight: 4 },
    { slug: 'shop-rent', pattern: '\u0631\u0647\u0646 \u0645\u063A\u0627\u0632\u0647', priority: 18, weight: 4 },
    { slug: 'refrigerator', pattern: '\u0641\u0631\u0648\u0634 \u06CC\u062E\u0686\u0627\u0644', priority: 22, weight: 6 },
    { slug: 'washing-machine', pattern: '\u0646\u06CC\u0627\u0632 \u0628\u0647 \u0645\u0627\u0634\u06CC\u0646 \u0644\u0628\u0627\u0633\u0634\u0648\u06CC\u06CC', priority: 22, weight: 6 },
    { slug: 'washing-machine', pattern: '\u0641\u0631\u0648\u0634 \u0645\u0627\u0634\u06CC\u0646 \u0644\u0628\u0627\u0633\u0634\u0648\u06CC\u06CC', priority: 22, weight: 6 },
    { slug: 'washing-machine', pattern: '\u0645\u0627\u0634\u06CC\u0646 \u0644\u0628\u0627\u0633\u0634\u0648\u06CC\u06CC', priority: 15, weight: 3 },
    { slug: 'washing-machine', pattern: '\u0644\u0628\u0627\u0633\u0634\u0648\u06CC\u06CC', priority: 14, weight: 2 },
    { slug: 'office-rent', pattern: '\u062F\u0641\u062A\u0631', priority: 15, weight: 3 },
    { slug: 'industrial-rent', pattern: '\u0633\u0648\u0644\u0647', priority: 15, weight: 3 },
    { slug: 'spare-parts', pattern: '\u0642\u0637\u0639\u0647 \u06CC\u062F\u06A9\u06CC', priority: 15, weight: 3 },
    { slug: 'engineering', pattern: '\u0645\u0647\u0646\u062F\u0633 \u0639\u0645\u0631\u0627\u0646', priority: 15, weight: 3 },
    { slug: 'engineering', pattern: '\u0645\u0647\u0646\u062F\u0633', priority: 12, weight: 2 },
    { slug: 'clothing', pattern: '\u067E\u0627\u0644\u062A\u0648', priority: 15, weight: 3 },
    { slug: 'laptop', pattern: '\u0645\u0627\u06A9\u200C\u0628\u0648\u06A9', priority: 14, weight: 2 },
    { slug: 'refrigerator', pattern: '\u06CC\u062E\u0686\u0627\u0644 \u0633\u0627\u06CC\u062F', priority: 14, weight: 2 },
    { slug: 'pets', pattern: '\u06AF\u0631\u0628\u0647', priority: 14, weight: 2 },
    { slug: 'pets', pattern: '\u0627\u06A9\u0633\u0644\u0648\u062A\u0644', priority: 18, weight: 4 },
    { slug: 'pets', pattern: '\u0622\u06A9\u0633\u0644\u0648\u062A\u0644', priority: 18, weight: 4 },
    { slug: 'pets', pattern: 'axolotl', priority: 18, weight: 4 },
    { slug: 'pets', pattern: '\u062D\u06CC\u0648\u0627\u0646 \u062E\u0627\u0646\u06AF\u06CC', priority: 16, weight: 3 },
    { slug: 'sofa-chair', pattern: '\u0645\u0628\u0644', priority: 13, weight: 2 },
    { slug: 'camera', pattern: '\u062F\u0648\u0631\u0628\u06CC\u0646', priority: 14, weight: 2 },
    { slug: 'painting', pattern: '\u0646\u0642\u0627\u0634 \u0633\u0627\u062E\u062A\u0645\u0627\u0646', priority: 14, weight: 2 },
    { slug: 'suite-apartment-rent', pattern: '\u0633\u0648\u0626\u06CC\u062A', priority: 14, weight: 2 },
    { slug: 'game-console', pattern: '\u067E\u0644\u06CC\u200C\u0627\u0633\u062A\u06CC\u0634\u0646', priority: 14, weight: 2 },
    { slug: 'musical-instruments', pattern: '\u0648\u06CC\u0648\u0644\u0646', priority: 15, weight: 3 },
    { slug: 'musical-instruments', pattern: '\u0648\u06CC\u0648\u0644\u0648\u0646', priority: 15, weight: 3 },
    { slug: 'musical-instruments', pattern: '\u067E\u06CC\u0627\u0646\u0648', priority: 14, weight: 2 },
    { slug: 'musical-instruments', pattern: '\u06AF\u06CC\u062A\u0627\u0631', priority: 14, weight: 2 },
    { slug: 'vehicle-repair', pattern: '\u062A\u0639\u0645\u06CC\u0631\u06A9\u0627\u0631 \u062E\u0648\u062F\u0631\u0648', priority: 22, weight: 6 },
    { slug: 'vehicle-repair', pattern: '\u062A\u0639\u0645\u06CC\u0631\u06A9\u0627\u0631 \u0645\u0627\u0634\u06CC\u0646', priority: 22, weight: 6 },
    { slug: 'vehicle-repair', pattern: '\u0645\u06A9\u0627\u0646\u06CC\u06A9', priority: 18, weight: 4 },
    { slug: 'vehicle-repair', pattern: '\u062A\u0639\u0645\u06CC\u0631 \u062E\u0648\u062F\u0631\u0648', priority: 18, weight: 4 },
    { slug: 'refrigerator-repair', pattern: '\u062A\u0639\u0645\u06CC\u0631\u06A9\u0627\u0631 \u06CC\u062E\u0686\u0627\u0644', priority: 22, weight: 6 },
    { slug: 'laundry-dishwasher-repair', pattern: '\u062A\u0639\u0645\u06CC\u0631\u06A9\u0627\u0631 \u0644\u0628\u0627\u0633\u0634\u0648\u06CC\u06CC', priority: 22, weight: 6 },
  ];

  for (const hp of highPriorityPhrases) {
    rules.push({
      id: `legacy-hp-${hp.slug}-${seq++}`,
      kind: 'phrase',
      slug: hp.slug,
      pattern: hp.pattern,
      priority: hp.priority,
      weight: hp.weight ?? 2,
    });
  }

  for (const [slug, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
    for (const syn of synonyms) {
      rules.push({
        id: `legacy-syn-${slug}-${seq++}`,
        kind: 'phrase',
        slug,
        pattern: syn,
        priority: 8,
        weight: 1,
      });
    }
  }

  rules.push({
    id: 'neg-yamaha-piano-not-moto',
    kind: 'negative',
    slug: 'motorcycle',
    pattern: '\u06CC\u0627\u0645\u0627\u0647\u0627',
    priority: 12,
    unless: [
      '\u067E\u06CC\u0627\u0646\u0648',
      'piano',
      '\u06AF\u06CC\u062A\u0627\u0631',
      '\u0648\u06CC\u0648\u0644\u0646',
      '\u0648\u06CC\u0648\u0644\u0646',
      '\u0633\u0646\u062A\u0648\u0631',
    ],
  });

  rules.push({
    id: 'neg-mobile-not-piano',
    kind: 'negative',
    slug: 'mobile-phone',
    pattern: '\u067E\u06CC\u0627\u0646\u0648',
    priority: 12,
    unless: ['\u06AF\u0648\u0634\u06CC', '\u0645\u0648\u0628\u0627\u06CC\u0644', '\u0622\u06CC\u0641\u0648\u0646', 'iphone'],
  });

  const collisionNegatives: Array<{ slug: string; pattern: string; unless: string[] }> = [
    {
      slug: 'tours',
      pattern: '\u0645\u0648\u062A\u0648\u0631',
      unless: ['\u062A\u0648\u0631', '\u06AF\u0631\u062F\u0634\u06AF\u0631\u06CC'],
    },
    {
      slug: 'tickets',
      pattern: '\u0645\u0648\u062A\u0648\u0631',
      unless: ['\u0628\u0644\u06CC\u0637', '\u0628\u0644\u06CC\u062A'],
    },
    {
      slug: 'mobile-phone',
      pattern: '\u0644\u067E',
      unless: ['\u06AF\u0648\u0634\u06CC', '\u0645\u0648\u0628\u0627\u06CC\u0644', '\u0644\u067E \u062A\u0627\u067E', '\u0644\u067E\u200C\u062A\u0627\u067E'],
    },
    {
      slug: 'apartment-rent',
      pattern: '\u067E\u0698\u0648',
      unless: ['\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646', '\u0631\u0647\u0646', '\u0627\u062C\u0627\u0631\u0647'],
    },
    {
      slug: 'car',
      pattern: '\u0645\u0627\u0634\u06CC\u0646',
      unless: [
        '\u0644\u0628\u0627\u0633\u0634\u0648\u06CC\u06CC',
        '\u0645\u0627\u0634\u06CC\u0646 \u0644\u0628\u0627\u0633\u0634\u0648\u06CC\u06CC',
        '\u062E\u0648\u062F\u0631\u0648',
      ],
    },
    {
      slug: 'car-ride',
      pattern: '\u0645\u0627\u0634\u06CC\u0646',
      unless: [
        '\u0644\u0628\u0627\u0633\u0634\u0648\u06CC\u06CC',
        '\u0645\u0627\u0634\u06CC\u0646 \u0644\u0628\u0627\u0633\u0634\u0648\u06CC\u06CC',
      ],
    },
    {
      slug: 'car-ride',
      pattern: '\u067E\u0631\u0627\u06CC\u062F',
      unless: ['\u0642\u0637\u0639\u0647', '\u06CC\u062F\u06A9\u06CC'],
    },
    {
      slug: 'apartment-rent',
      pattern: '\u0631\u0647\u0646',
      unless: [
        '\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646',
        '\u062E\u0648\u0627\u0628',
        '\u0645\u063A\u0627\u0632\u0647',
        '\u062F\u0641\u062A\u0631',
        '\u0633\u0648\u0644\u0647',
      ],
    },
    {
      slug: 'apartment-rent',
      pattern: '\u0627\u062C\u0627\u0631\u0647',
      unless: [
        '\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646',
        '\u0645\u063A\u0627\u0632\u0647',
        '\u062F\u0641\u062A\u0631',
        '\u0633\u0648\u0644\u0647',
      ],
    },
    {
      slug: 'industrial-sale',
      pattern: '\u0633\u0648\u0644\u0647',
      unless: ['\u0641\u0631\u0648\u0634', '\u062E\u0631\u06CC\u062F'],
    },
    {
      slug: 'repairs',
      pattern: '\u0633\u0627\u062E\u062A\u0645\u0627\u0646',
      unless: ['\u062A\u0639\u0645\u06CC\u0631', '\u0644\u0648\u0644\u0647', '\u0646\u0642\u0627\u0634'],
    },
    {
      slug: 'apartment-rent',
      pattern: '\u0645\u063A\u0627\u0632\u0647',
      unless: ['\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646'],
    },
    {
      slug: 'apartment-rent',
      pattern: '\u062F\u0641\u062A\u0631',
      unless: ['\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646'],
    },
    {
      slug: 'shop-rent',
      pattern: '\u0645\u063A\u0627\u0632\u0647',
      unless: ['\u0641\u0631\u0648\u0634', '\u0645\u06CC\u0641\u0631\u0648\u0634', '\u062E\u0631\u06CC\u062F', '\u0645\u06CC\u062E\u0631'],
    },
    {
      slug: 'pre-sale-services',
      pattern: '\u067E\u0631\u0648\u0698\u0647',
      unless: [
        '\u067E\u06CC\u0634',
        '\u067E\u06CC\u0634\u200C\u0641\u0631\u0648\u0634',
        '\u0645\u0633\u06A9\u0646',
        '\u0645\u0644\u06A9',
        '\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646',
      ],
    },
    {
      slug: 'motorcycle',
      pattern: '\u0645\u0648\u062A\u0648\u0631',
      unless: [
        '\u0645\u0648\u062A\u0648\u0631\u0633\u06CC\u06A9\u0644\u062A',
        '\u062E\u0648\u062F\u0631\u0648',
        '\u0645\u0627\u0634\u06CC\u0646',
        '\u067E\u0698\u0648',
        '\u062A\u0639\u0645\u06CC\u0631',
        '\u0645\u06A9\u0627\u0646\u06CC\u06A9',
      ],
    },
    {
      slug: 'laundry-dishwasher-repair',
      pattern: '\u0644\u0628\u0627\u0633\u0634\u0648\u06CC\u06CC',
      unless: ['\u0641\u0631\u0648\u0634', '\u062E\u0631\u06CC\u062F', '\u0646\u06CC\u0627\u0632', '\u0645\u06CC\u062E\u0631'],
    },
    {
      slug: 'apartment-sale',
      pattern: '\u062E\u0648\u0646\u0647',
      unless: [
        '\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646',
        '\u0645\u0644\u06A9',
        '\u0631\u0647\u0646',
        '\u06AF\u0644\u062F\u0627\u0646',
        '\u06AF\u0644\u062F\u0648\u0646',
        '\u062F\u06A9\u0648\u0631',
        '\u0642\u0627\u0628',
      ],
    },
  ];

  for (const c of collisionNegatives) {
    rules.push({
      id: `neg-${c.slug}-${seq++}`,
      kind: 'negative',
      slug: c.slug,
      pattern: c.pattern,
      unless: c.unless,
      priority: 14,
    });
  }

  cached = rules;
  return rules;
}
