/**
 * Per-category seed data for rule pack generation.
 */
export interface CategorySeed {
  slug: string;
  keywords: string[];
  brands?: string[];
  models?: string[];
  intents?: string[];
  conditions?: string[];
  services?: string[];
  requiredFields?: string[];
  optionalFields?: string[];
  titleTemplates?: string[];
  exclusions?: Array<{ pattern: string; unless: string[] }>;
}

const INTENTS_BUY = [
  '\u0645\u06CC\u062E\u0648\u0627\u0645',
  '\u0645\u06CC\u200C\u062E\u0648\u0627\u0645',
  '\u062F\u0646\u0628\u0627\u0644',
  '\u0646\u06CC\u0627\u0632 \u062F\u0627\u0631\u0645',
  '\u062C\u0648\u06CC\u0627',
  '\u06AF\u0631\u062F',
  '\u062E\u0631\u06CC\u062F',
  '\u06CC\u06A9 \u062F\u0648\u0633\u062A',
];

const INTENTS_SELL = [
  '\u0645\u06CC\u0641\u0631\u0648\u0634\u0645',
  '\u0641\u0631\u0648\u0634',
  '\u0641\u0648\u0631\u06CC \u0645\u06CC\u0641\u0631\u0648\u0634\u0645',
  '\u0628\u0647 \u0641\u0631\u0648\u0634 \u0645\u06CC\u0631\u0633\u0645',
  '\u0641\u0631\u0648\u0634\u06CC',
];

const INTENTS_RENT = [
  '\u0627\u062C\u0627\u0631\u0647',
  '\u0631\u0647\u0646',
  '\u0627\u0633\u062A\u062C\u0627\u0631\u0647',
  '\u0631\u0647\u0646 \u0648 \u0627\u062C\u0627\u0631\u0647',
  '\u0645\u0627\u0647\u06CC\u0627\u0646\u0647 \u0627\u062C\u0627\u0631\u0647',
];

const CONDITIONS = [
  '\u0646\u0648',
  '\u062F\u0633\u062A \u062F\u0648\u0645',
  '\u062F\u0631 \u062D\u062F \u0646\u0648',
  '\u062F\u0633\u062A\u200C\u062F\u0648\u0645',
  '\u062A\u0645\u06CC\u0632',
];

const CITIES = [
  '\u062A\u0647\u0631\u0627\u0646',
  '\u0645\u0634\u0647\u062F',
  '\u0627\u0635\u0641\u0647\u0627\u0646',
  '\u0634\u06CC\u0631\u0627\u0632',
  '\u062A\u0628\u0631\u06CC\u0632',
  '\u06A9\u0631\u062C',
  '\u0627\u0647\u0648\u0627\u0632',
];

/** Curated high-value seeds ? generator fills generic seeds for remaining slugs. */
export const CURATED_CATEGORY_SEEDS: CategorySeed[] = [
  {
    slug: 'musical-instruments',
    keywords: [
      '\u067E\u06CC\u0627\u0646\u0648',
      'piano',
      '\u06AF\u06CC\u062A\u0627\u0631',
      '\u0633\u0627\u0632',
      '\u0648\u06CC\u0648\u0644\u0646',
      '\u0633\u0646\u062A\u0648\u0631',
      '\u0622\u0644\u062A \u0645\u0648\u0633\u06CC\u0642\u06CC',
      '\u062F\u0647\u0644',
      '\u062F\u0631\u0627\u0645',
    ],
    brands: [
      '\u06CC\u0627\u0645\u0627\u0647\u0627',
      'yamaha',
      '\u06A9\u0627\u0648\u0627\u06CC',
      'kawai',
      '\u0631\u0648\u0644\u0646\u062F',
      'roland',
      '\u0641\u0646\u062F\u0631',
      'fender',
      '\u06AF\u06CC\u0628\u0633\u0648\u0646',
      'gibson',
    ],
    models: ['U1', 'P-125', 'CLP', 'DGX', 'Stratocaster', 'Les Paul', 'CD-60'],
    intents: INTENTS_BUY,
    conditions: CONDITIONS,
    requiredFields: ['dealType', 'condition'],
    optionalFields: ['brand', 'budget'],
    titleTemplates: ['{product} {brand} {condition}'],
    exclusions: [
      {
        pattern: '\u06CC\u0627\u0645\u0627\u0647\u0627',
        unless: ['\u067E\u06CC\u0627\u0646\u0648', 'motorcycle', '\u0645\u0648\u062A\u0648\u0631\u0633\u06CC\u06A9\u0644\u062A'],
      },
    ],
  },
  {
    slug: 'mobile-phone',
    keywords: [
      '\u06AF\u0648\u0634\u06CC',
      '\u0645\u0648\u0628\u0627\u06CC\u0644',
      '\u0622\u06CC\u0641\u0648\u0646',
      'iphone',
      '\u0633\u0627\u0645\u0633\u0648\u0646\u06AF',
      '\u0634\u06CC\u0627\u0626\u0648\u0645\u06CC',
    ],
    brands: [
      '\u0622\u06CC\u0641\u0648\u0646',
      'iphone',
      '\u0633\u0627\u0645\u0633\u0648\u0646\u06AF',
      'samsung',
      '\u0634\u06CC\u0627\u0626\u0648\u0645\u06CC',
      'xiaomi',
      '\u0647\u0648\u0627\u0648\u06CC',
      'huawei',
    ],
    models: ['13 Pro', '14', 'S24', 'A54', 'Redmi Note 13', 'P60'],
    intents: INTENTS_BUY,
    conditions: CONDITIONS,
    requiredFields: ['dealType', 'condition'],
    optionalFields: ['brand', 'budget'],
  },
  {
    slug: 'car-ride',
    keywords: [
      '\u0645\u0627\u0634\u06CC\u0646',
      '\u062E\u0648\u062F\u0631\u0648',
      '\u067E\u0698\u0648',
      '\u067E\u0631\u0627\u06CC\u062F',
      '\u067E\u0631\u0627\u06CC\u062F',
      '\u067E\u0698\u0648',
      '\u067E\u0631\u0627\u06CC\u062F',
      '\u067E\u0698\u0648',
    ],
    brands: [
      '\u067E\u0698\u0648',
      '\u067E\u0631\u0627\u06CC\u062F',
      '\u0633\u0645\u0646\u062F',
      '\u0647\u06CC\u0648\u0646\u062F\u0627',
      '\u062A\u0648\u06CC\u0648\u062A\u0627',
      '\u06A9\u06CC\u0627 \u0633\u0631\u0627\u062A',
      '\u0628\u06CC\u200C\u0627\u0645\u200C\u0648',
      '\u0631\u0646\u0648',
      '\u0628\u0646\u0632',
    ],
    models: ['206', '207', '405', 'Pars', 'Soren', 'Tiba 2', 'Dena Plus'],
    intents: [...INTENTS_BUY, ...INTENTS_SELL],
    conditions: CONDITIONS,
    requiredFields: ['dealType', 'budget'],
    optionalFields: ['brand', 'yearMin'],
  },
  {
    slug: 'apartment-rent',
    keywords: [
      '\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u0627\u062C\u0627\u0631\u0647\u06CC',
      '\u0631\u0647\u0646',
      '\u0627\u062C\u0627\u0631\u0647',
      '\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u0628\u0647 \u0627\u062C\u0627\u0631\u0647',
      '\u0627\u067E\u0627\u0631\u062A\u0645\u0627\u0646',
    ],
    intents: INTENTS_RENT,
    requiredFields: ['dealType', 'city', 'mapPin'],
    optionalFields: ['rooms', 'area', 'budget'],
  },
  {
    slug: 'apartment-sale',
    keywords: [
      '\u0641\u0631\u0648\u0634 \u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646',
      '\u062E\u0631\u06CC\u062F \u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646',
      '\u0627\u067E\u0627\u0631\u062A\u0645\u0627\u0646',
    ],
    intents: [...INTENTS_BUY, ...INTENTS_SELL],
    requiredFields: ['dealType', 'city', 'mapPin'],
  },
  {
    slug: 'plumbing',
    keywords: [
      '\u0644\u0648\u0644\u0647',
      '\u0644\u0648\u0644\u0647\u200C\u06A9\u0634\u06CC',
      '\u0644\u0648\u0644\u0647\u200C\u06A9\u0627\u0631',
      '\u0644\u0648\u0644\u0647\u200C\u06A9\u0634\u06CC',
      '\u0644\u0648\u0644\u0647 \u06A9\u0627\u0631',
    ],
    services: [
      '\u0644\u0648\u0644\u0647\u200C\u06A9\u0634\u06CC',
      '\u0631\u0641\u0639 \u06AF\u0644\u0633\u062A\u06AF\u06CC',
      '\u062A\u0645\u0628\u0633 \u0622\u0628',
    ],
    intents: [
      '\u0646\u06CC\u0627\u0632 \u062F\u0627\u0631\u0645',
      '\u06CC\u06A9 \u0644\u0648\u0644\u0647',
      '\u0644\u0648\u0644\u0647',
      '\u0644\u0648\u0644\u0647\u200C\u06A9\u0627\u0631',
    ],
    requiredFields: ['city'],
  },
  {
    slug: 'motorcycle',
    keywords: [
      '\u0645\u0648\u062A\u0648\u0631',
      '\u0645\u0648\u062A\u0648\u0631\u0633\u06CC\u06A9\u0644\u062A',
      '\u0647\u0648\u0646\u062F\u0627',
      '\u0645\u0648\u062A\u0648\u0631 \u0647\u0648\u0646\u062F\u0627',
      '\u06CC\u0627\u0645\u0627\u0647\u0627',
    ],
    brands: [
      '\u0647\u0648\u0646\u062F\u0627',
      '\u06CC\u0627\u0645\u0627\u0647\u0627',
      '\u0628\u0627\u062C\u0627\u062C',
      '\u06A9\u0648\u06CC\u0627\u0633\u0627\u06A9\u06CC',
      '\u067E\u06CC\u0627\u062C',
    ],
    models: ['CG', 'CDI 125', 'AX100', 'GTO'],
    intents: [...INTENTS_BUY, ...INTENTS_SELL],
    exclusions: [
      {
        pattern: '\u06CC\u0627\u0645\u0627\u0647\u0627',
        unless: ['\u0645\u0648\u062A\u0648\u0631', '\u0645\u0648\u062A\u0648\u0631\u0633\u06CC\u06A9\u0644\u062A'],
      },
    ],
  },
  {
    slug: 'game-console',
    keywords: [
      '\u067E\u0644\u06CC\u200C\u0627\u0633\u062A\u06CC\u0634\u0646',
      'ps5',
      'ps4',
      'xbox',
      '\u06A9\u0646\u0633\u0648\u0644',
      '\u0628\u0627\u0632\u06CC',
    ],
    brands: ['sony', 'microsoft', 'nintendo'],
    models: ['5', '4', 'Series X', 'Switch'],
    intents: INTENTS_BUY,
    conditions: CONDITIONS,
    requiredFields: ['dealType', 'condition'],
    optionalFields: ['brand', 'budget'],
  },
  {
    slug: 'lost-found',
    keywords: [
      '\u06AF\u0645 \u06A9\u0631\u062F\u0645',
      '\u06AF\u0645 \u0634\u062F',
      '\u06AF\u0645 \u06A9\u0631\u062F\u0647',
      '\u06AF\u0645 \u0634\u062F\u0647',
      '\u06A9\u0627\u0631\u062A \u0628\u0627\u0646\u06A9\u06CC',
      '\u06A9\u06CC\u0641',
      '\u06AF\u0648\u0634\u06CC',
    ],
    intents: ['\u06AF\u0645 \u06A9\u0631\u062F\u0645', '\u06AF\u0645 \u0634\u062F', '\u067E\u06CC\u062F\u0627 \u06A9\u0631\u062F\u0645'],
    requiredFields: ['city'],
  },
];

export function genericSeedForSlug(slug: string, title: string): CategorySeed {
  const t = title.trim() || slug;
  return {
    slug,
    keywords: [t, slug.replace(/-/g, ' ')],
    intents: INTENTS_BUY,
    conditions: CONDITIONS,
    requiredFields: ['dealType'],
    optionalFields: ['city', 'budget'],
  };
}

export { INTENTS_BUY, INTENTS_SELL, INTENTS_RENT, CONDITIONS, CITIES };
