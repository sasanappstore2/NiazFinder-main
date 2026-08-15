/**
 * Data-driven estate property×deal lexicons + cross-leaf collision matrix.
 * Composes high-signal phrase/negative rules without cartesian pack bloat.
 */
import { normalizeIntakeText } from '@/lib/need-intake/normalize-intake-text';
import type { IntakeRule } from '@/intake/rules/types';

export type EstatePropertyKind =
  | 'apartment'
  | 'villa'
  | 'land'
  | 'shop'
  | 'office'
  | 'industrial'
  | 'suite'
  | 'workspace';

export type EstateDealFamily =
  | 'sale'
  | 'rent'
  | 'short'
  | 'partnership'
  | 'pre_sale';

export interface PropertyLexiconEntry {
  token: string;
  kind: EstatePropertyKind;
  /** Relative strength; ≥3 is a "strong" property noun for fast-path. */
  weight: number;
}

export interface DealLexiconEntry {
  token: string;
  family: EstateDealFamily;
  weight: number;
}

export interface CollisionRow {
  /** Slug whose score is penalized when `pattern` matches. */
  slug: string;
  pattern: string;
  unless: string[];
}

/** Canonical estate leaf slugs (depth-2 under real-estate). */
export const ESTATE_LEAF_SLUGS = [
  'apartment-sale',
  'villa-sale',
  'land-sale',
  'apartment-rent',
  'villa-rent',
  'land-rent',
  'office-sale',
  'shop-sale',
  'industrial-sale',
  'office-rent',
  'shop-rent',
  'industrial-rent',
  'suite-apartment-rent',
  'villa-short-rent',
  'workspace-short-rent',
  'agency-services',
  'construction-partnership',
  'pre-sale-services',
] as const;

export type EstateLeafSlug = (typeof ESTATE_LEAF_SLUGS)[number];

const ESTATE_LEAF_SET = new Set<string>(ESTATE_LEAF_SLUGS);

export function isEstateLeafSlug(slug: string): boolean {
  return ESTATE_LEAF_SET.has(slug);
}

export const PROPERTY_LEXICON: PropertyLexiconEntry[] = [
  { token: 'آپارتمان', kind: 'apartment', weight: 5 },
  { token: 'اپارتمان', kind: 'apartment', weight: 5 },
  { token: 'آپارت', kind: 'apartment', weight: 3 },
  { token: 'واحد', kind: 'apartment', weight: 2 },
  { token: 'پنت\u200cهاوس', kind: 'apartment', weight: 4 },
  { token: 'پنت هاوس', kind: 'apartment', weight: 4 },
  { token: 'برج', kind: 'apartment', weight: 2 },
  { token: 'ملک مسکونی', kind: 'apartment', weight: 4 },

  { token: 'ویلا', kind: 'villa', weight: 5 },
  { token: 'ویلای', kind: 'villa', weight: 5 },
  { token: 'ویلایی', kind: 'villa', weight: 4 },
  { token: 'باغ\u200cویلا', kind: 'villa', weight: 5 },
  { token: 'باغ ویلا', kind: 'villa', weight: 5 },
  { token: 'خانه ویلایی', kind: 'villa', weight: 5 },

  { token: 'زمین', kind: 'land', weight: 5 },
  { token: 'کلنگی', kind: 'land', weight: 4 },
  { token: 'زمین و کلنگی', kind: 'land', weight: 5 },
  { token: 'قطعه زمین', kind: 'land', weight: 5 },

  { token: 'مغازه', kind: 'shop', weight: 5 },
  { token: 'غرفه', kind: 'shop', weight: 4 },
  { token: 'تجاری', kind: 'shop', weight: 2 },

  { token: 'دفتر', kind: 'office', weight: 4 },
  { token: 'دفتر کار', kind: 'office', weight: 5 },
  { token: 'اداری', kind: 'office', weight: 3 },

  { token: 'سوله', kind: 'industrial', weight: 5 },
  { token: 'کارگاه', kind: 'industrial', weight: 4 },
  { token: 'سوله صنعتی', kind: 'industrial', weight: 6 },
  { token: 'انبار صنعتی', kind: 'industrial', weight: 5 },

  { token: 'سوئیت', kind: 'suite', weight: 5 },
  { token: 'سوییت', kind: 'suite', weight: 5 },

  { token: 'فضای کار', kind: 'workspace', weight: 5 },
  { token: 'فضای کار اشتراکی', kind: 'workspace', weight: 6 },
];

export const DEAL_LEXICON: DealLexiconEntry[] = [
  { token: 'خرید', family: 'sale', weight: 4 },
  { token: 'فروش', family: 'sale', weight: 4 },
  { token: 'بخرم', family: 'sale', weight: 4 },
  { token: 'می\u200cخرم', family: 'sale', weight: 3 },
  { token: 'می خرم', family: 'sale', weight: 3 },

  { token: 'اجاره', family: 'rent', weight: 4 },
  { token: 'رهن و اجاره', family: 'rent', weight: 5 },
  { token: 'رهن کامل', family: 'rent', weight: 5 },
  { token: 'ودیعه', family: 'rent', weight: 3 },
  // Bare «رهن» / «شبانه» are sticky (رهگیری، شبانه‌روزی); use longer tokens + ZWNJ-aware bounds.
  { token: 'اجاره ماهانه', family: 'rent', weight: 5 },
  { token: 'کوتاه مدت', family: 'short', weight: 5 },
  { token: 'کوتاه\u200cمدت', family: 'short', weight: 5 },
  { token: 'اجاره روزانه', family: 'short', weight: 4 },
  { token: 'اجاره شبانه', family: 'short', weight: 5 },

  { token: 'مشارکت در ساخت', family: 'partnership', weight: 6 },
  { token: 'مشارکت', family: 'partnership', weight: 3 },

  { token: 'پیش\u200cفروش', family: 'pre_sale', weight: 6 },
  { token: 'پیش فروش', family: 'pre_sale', weight: 6 },
];

const KIND_DEAL_TO_LEAF: Partial<Record<EstatePropertyKind, Partial<Record<EstateDealFamily, EstateLeafSlug>>>> =
  {
    apartment: {
      sale: 'apartment-sale',
      rent: 'apartment-rent',
      short: 'suite-apartment-rent',
    },
    villa: {
      sale: 'villa-sale',
      rent: 'villa-rent',
      short: 'villa-short-rent',
    },
    land: {
      sale: 'land-sale',
      rent: 'land-rent',
    },
    shop: {
      sale: 'shop-sale',
      rent: 'shop-rent',
    },
    office: {
      sale: 'office-sale',
      rent: 'office-rent',
    },
    industrial: {
      sale: 'industrial-sale',
      rent: 'industrial-rent',
    },
    suite: {
      rent: 'suite-apartment-rent',
      short: 'suite-apartment-rent',
    },
    workspace: {
      short: 'workspace-short-rent',
      rent: 'workspace-short-rent',
    },
  };

const RESIDENTIAL_RESCUE = ['آپارتمان', 'اپارتمان', 'ویلا', 'خانه ویلایی'];
const APARTMENT_RESCUE = ['آپارتمان', 'اپارتمان'];
const SALE_RESCUE = ['خرید', 'فروش', 'بخرم', 'قصد خرید'];
const RENT_RESCUE = ['اجاره', 'رهن و اجاره', 'رهن کامل', 'ودیعه', 'ماهانه'];
const REPAIR_RESCUE = ['تعمیر', 'سرویس', 'خراب'];

/**
 * Cross-leaf collision rows. `unless` = do NOT apply penalty when any token is present.
 */
export const COLLISION_ROWS: CollisionRow[] = [
  // villa ↔ apartment
  { slug: 'apartment-sale', pattern: 'ویلا', unless: APARTMENT_RESCUE },
  { slug: 'apartment-rent', pattern: 'ویلا', unless: [...APARTMENT_RESCUE, 'اجاره'] },
  { slug: 'apartment-sale', pattern: 'ویلای', unless: APARTMENT_RESCUE },
  { slug: 'apartment-rent', pattern: 'ویلای', unless: [...APARTMENT_RESCUE, 'اجاره'] },
  { slug: 'apartment-sale', pattern: 'خانه ویلایی', unless: APARTMENT_RESCUE },
  { slug: 'real-estate', pattern: 'ویلا', unless: APARTMENT_RESCUE },

  // Location-token pollution: bare «ملک» (e.g. محله ملک‌شهر) must not beat stronger nouns
  { slug: 'apartment-sale', pattern: 'ملک', unless: [...APARTMENT_RESCUE, 'ملک مسکونی', 'واحد'] },
  { slug: 'apartment-rent', pattern: 'ملک', unless: [...APARTMENT_RESCUE, 'ملک مسکونی', 'رهن', 'اجاره'] },
  { slug: 'real-estate', pattern: 'ملک', unless: [...APARTMENT_RESCUE, 'ملک مسکونی', 'املاک'] },
  { slug: 'apartment-sale', pattern: 'ویلا', unless: APARTMENT_RESCUE },

  // land ↔ residential
  { slug: 'apartment-sale', pattern: 'زمین', unless: APARTMENT_RESCUE },
  { slug: 'apartment-rent', pattern: 'زمین', unless: APARTMENT_RESCUE },
  { slug: 'villa-sale', pattern: 'زمین و کلنگی', unless: ['ویلا'] },
  { slug: 'villa-rent', pattern: 'زمین و کلنگی', unless: ['ویلا'] },
  // Neighborhood «شهرک ویلایی» must not beat explicit land/کلنگی rent (colloquial-0567).
  { slug: 'villa-rent', pattern: 'زمین یا کلنگی', unless: [] },
  { slug: 'villa-sale', pattern: 'زمین یا کلنگی', unless: [] },
  { slug: 'villa-rent', pattern: 'کلنگی', unless: ['اجاره ویلا', 'ویلا اجاره', 'خانه ویلایی'] },
  { slug: 'villa-sale', pattern: 'کلنگی', unless: ['خرید ویلا', 'ویلا بخرم', 'خانه ویلایی'] },
  { slug: 'apartment-sale', pattern: 'کلنگی', unless: APARTMENT_RESCUE },
  { slug: 'apartment-rent', pattern: 'کلنگی', unless: APARTMENT_RESCUE },
  { slug: 'apartment-sale', pattern: 'زمین و کلنگی', unless: APARTMENT_RESCUE },
  { slug: 'apartment-rent', pattern: 'زمین و کلنگی', unless: APARTMENT_RESCUE },

  // shop/office ↔ residential
  { slug: 'apartment-sale', pattern: 'مغازه', unless: APARTMENT_RESCUE },
  { slug: 'apartment-rent', pattern: 'مغازه', unless: APARTMENT_RESCUE },
  { slug: 'apartment-sale', pattern: 'دفتر', unless: APARTMENT_RESCUE },
  { slug: 'apartment-rent', pattern: 'دفتر', unless: APARTMENT_RESCUE },
  { slug: 'villa-sale', pattern: 'مغازه', unless: ['ویلا'] },
  { slug: 'villa-rent', pattern: 'مغازه', unless: ['ویلا'] },
  { slug: 'villa-sale', pattern: 'دفتر', unless: ['ویلا'] },
  { slug: 'villa-rent', pattern: 'دفتر', unless: ['ویلا'] },

  // industrial ↔ residential — bare «صنعتی» in «شهر/شهرک صنعتی» must not beat آپارتمان
  { slug: 'apartment-sale', pattern: 'سوله', unless: APARTMENT_RESCUE },
  { slug: 'apartment-rent', pattern: 'سوله', unless: APARTMENT_RESCUE },
  { slug: 'apartment-sale', pattern: 'کارگاه', unless: APARTMENT_RESCUE },
  { slug: 'apartment-rent', pattern: 'کارگاه', unless: APARTMENT_RESCUE },
  { slug: 'villa-sale', pattern: 'سوله', unless: ['ویلا'] },
  { slug: 'villa-rent', pattern: 'سوله', unless: ['ویلا'] },
  { slug: 'villa-sale', pattern: 'کارگاه', unless: ['ویلا'] },
  { slug: 'villa-rent', pattern: 'کارگاه', unless: ['ویلا'] },
  { slug: 'industrial-sale', pattern: 'آپارتمان', unless: ['سوله', 'کارگاه', 'انبار صنعتی'] },
  { slug: 'industrial-rent', pattern: 'آپارتمان', unless: ['سوله', 'کارگاه', 'انبار صنعتی'] },
  { slug: 'industrial-sale', pattern: 'مسکونی', unless: ['سوله', 'کارگاه'] },
  { slug: 'industrial-rent', pattern: 'مسکونی', unless: ['سوله', 'کارگاه'] },
  { slug: 'industrial-sale', pattern: 'شهر صنعتی', unless: ['سوله', 'کارگاه', 'انبار'] },
  { slug: 'industrial-rent', pattern: 'شهر صنعتی', unless: ['سوله', 'کارگاه', 'انبار'] },
  { slug: 'industrial-sale', pattern: 'شهرک صنعتی', unless: ['سوله', 'کارگاه', 'انبار'] },
  { slug: 'industrial-rent', pattern: 'شهرک صنعتی', unless: ['سوله', 'کارگاه', 'انبار'] },

  // workspace ↔ residential sale
  { slug: 'apartment-sale', pattern: 'فضای کار', unless: APARTMENT_RESCUE },
  { slug: 'apartment-rent', pattern: 'فضای کار', unless: APARTMENT_RESCUE },
  { slug: 'residential-sale', pattern: 'فضای کار', unless: [] },
  { slug: 'residential-sale', pattern: 'کوتاه\u200cمدت', unless: [] },
  { slug: 'residential-sale', pattern: 'کوتاه مدت', unless: [] },

  // sale ↔ rent (same property family)
  { slug: 'apartment-rent', pattern: 'فروش', unless: RENT_RESCUE },
  { slug: 'apartment-sale', pattern: 'اجاره', unless: SALE_RESCUE },
  { slug: 'apartment-sale', pattern: 'رهن', unless: SALE_RESCUE },
  { slug: 'villa-rent', pattern: 'فروش', unless: RENT_RESCUE },
  { slug: 'villa-sale', pattern: 'اجاره', unless: SALE_RESCUE },
  { slug: 'villa-sale', pattern: 'رهن', unless: SALE_RESCUE },
  { slug: 'villa-rent', pattern: 'بخرم', unless: RENT_RESCUE },
  { slug: 'land-sale', pattern: 'اجاره', unless: SALE_RESCUE },
  { slug: 'land-sale', pattern: 'رهن', unless: SALE_RESCUE },
  { slug: 'land-rent', pattern: 'خرید', unless: RENT_RESCUE },
  { slug: 'land-rent', pattern: 'فروش', unless: RENT_RESCUE },
  { slug: 'shop-rent', pattern: 'فروش', unless: RENT_RESCUE },
  { slug: 'shop-sale', pattern: 'اجاره', unless: SALE_RESCUE },
  { slug: 'office-rent', pattern: 'فروش', unless: RENT_RESCUE },
  { slug: 'office-sale', pattern: 'اجاره', unless: SALE_RESCUE },
  { slug: 'industrial-rent', pattern: 'فروش', unless: RENT_RESCUE },
  { slug: 'industrial-sale', pattern: 'اجاره', unless: SALE_RESCUE },

  // short-term ↔ monthly rent / residential sale
  { slug: 'apartment-rent', pattern: 'کوتاه مدت', unless: [] },
  { slug: 'apartment-rent', pattern: 'کوتاه\u200cمدت', unless: [] },
  { slug: 'apartment-sale', pattern: 'کوتاه مدت', unless: [] },
  { slug: 'apartment-sale', pattern: 'کوتاه\u200cمدت', unless: [] },
  { slug: 'apartment-rent', pattern: 'روزانه', unless: ['ماهانه', 'رهن'] },
  { slug: 'apartment-rent', pattern: 'شبانه', unless: ['ماهانه', 'رهن'] },
  { slug: 'villa-rent', pattern: 'کوتاه مدت', unless: [] },
  { slug: 'villa-rent', pattern: 'کوتاه\u200cمدت', unless: [] },
  { slug: 'villa-short-rent', pattern: 'بلندمدت', unless: ['روزانه', 'کوتاه مدت', 'کوتاه\u200cمدت'] },
  { slug: 'villa-short-rent', pattern: 'برای زندگی', unless: ['روزانه', 'کوتاه مدت'] },

  // partnership ↔ land-sale
  { slug: 'land-sale', pattern: 'مشارکت', unless: SALE_RESCUE },
  { slug: 'land-sale', pattern: 'مشارکت در ساخت', unless: SALE_RESCUE },
  { slug: 'apartment-sale', pattern: 'مشارکت در ساخت', unless: SALE_RESCUE },
  { slug: 'villa-sale', pattern: 'مشارکت در ساخت', unless: SALE_RESCUE },

  // pre-sale ↔ raw sale
  { slug: 'apartment-sale', pattern: 'پیش\u200cفروش', unless: [] },
  { slug: 'apartment-sale', pattern: 'پیش فروش', unless: [] },
  { slug: 'villa-sale', pattern: 'پیش\u200cفروش', unless: [] },
  { slug: 'villa-sale', pattern: 'پیش فروش', unless: [] },
  {
    slug: 'pre-sale-services',
    pattern: 'پروژه',
    unless: ['پیش', 'پیش\u200cفروش', 'مسکن', 'ملک', 'آپارتمان'],
  },

  // shop-rent vs sale framing: prefer sale only when explicit sale words (do NOT
  // blanket-penalize shop-rent on bare مغازه — that wiped «اجاره/رهن مغازه»).
  { slug: 'shop-sale', pattern: 'اجاره', unless: SALE_RESCUE },
  { slug: 'shop-sale', pattern: 'رهن', unless: SALE_RESCUE },
  { slug: 'shop-rent', pattern: 'فروش', unless: RENT_RESCUE },
  { slug: 'shop-rent', pattern: 'خرید', unless: RENT_RESCUE },

  // land sale vs partnership — bare زمین must not beat مشارکت در ساخت
  { slug: 'land-sale', pattern: 'مشارکت', unless: ['خرید زمین', 'فروش زمین'] },
  { slug: 'land-rent', pattern: 'مشارکت', unless: ['اجاره زمین'] },
  { slug: 'construction-partnership', pattern: 'خرید', unless: ['مشارکت'] },

  // industrial-sale needs deal cue when only سوله fires; also penalize rent leaf on buy cues
  { slug: 'industrial-sale', pattern: 'سوله', unless: SALE_RESCUE },
  { slug: 'industrial-rent', pattern: 'خرید', unless: RENT_RESCUE },
  { slug: 'industrial-rent', pattern: 'بخرم', unless: RENT_RESCUE },
  { slug: 'industrial-rent', pattern: 'فروش', unless: RENT_RESCUE },
  { slug: 'industrial-rent', pattern: 'قصد خرید', unless: RENT_RESCUE },

  // خونه/خانه synonym matrix (decor vs real estate)
  ...(['apartment-sale', 'apartment-rent', 'villa-sale', 'villa-rent'] as const).flatMap((slug) =>
    (['خونه', 'خانه'] as const).map((pattern) => ({
      slug,
      pattern,
      unless: [
        'آپارتمان',
        'ملک',
        'رهن',
        'گلدان',
        'گلدون',
        'دکور',
        'قاب',
        'ویلا',
      ],
    }))
  ),

  // amenity traps → elevator-repair / repairs
  { slug: 'elevator-repair', pattern: 'آپارتمان', unless: REPAIR_RESCUE },
  { slug: 'elevator-repair', pattern: 'ویلا', unless: REPAIR_RESCUE },
  { slug: 'elevator-repair', pattern: 'خرید', unless: REPAIR_RESCUE },
  { slug: 'elevator-repair', pattern: 'رهن', unless: REPAIR_RESCUE },
  { slug: 'elevator-repair', pattern: 'اجاره', unless: REPAIR_RESCUE },
  { slug: 'elevator-repair', pattern: 'ودیعه', unless: REPAIR_RESCUE },
  { slug: 'elevator-repair', pattern: 'خانه', unless: REPAIR_RESCUE },
  { slug: 'elevator-repair', pattern: 'خونه', unless: REPAIR_RESCUE },
  { slug: 'elevator-repair', pattern: 'مسکونی', unless: REPAIR_RESCUE },
  { slug: 'repairs', pattern: 'رهن', unless: REPAIR_RESCUE },
  { slug: 'repairs', pattern: 'اجاره', unless: REPAIR_RESCUE },
  { slug: 'repairs', pattern: 'آپارتمان', unless: REPAIR_RESCUE },
  { slug: 'repairs', pattern: 'ساختمان', unless: ['تعمیر', 'لوله', 'نقاش'] },

  // apartment-rent weak deal words without property noun
  {
    slug: 'apartment-rent',
    pattern: 'رهن',
    unless: ['آپارتمان', 'خواب', 'مغازه', 'دفتر', 'سوله', 'ویلا'],
  },
  {
    slug: 'apartment-rent',
    pattern: 'اجاره',
    unless: ['آپارتمان', 'مغازه', 'دفتر', 'سوله', 'ویلا'],
  },
  { slug: 'apartment-rent', pattern: 'پژو', unless: [...APARTMENT_RESCUE, 'رهن', 'اجاره'] },
];

/** Curated high-priority property×deal phrases (beyond cartesian compose). */
const CURATED_HIGH_PRIORITY: Array<{
  slug: EstateLeafSlug | string;
  pattern: string;
  priority: number;
  weight?: number;
}> = [
  { slug: 'villa-sale', pattern: 'ویلای مسکونی', priority: 24, weight: 7 },
  { slug: 'villa-sale', pattern: 'خرید ویلا', priority: 22, weight: 6 },
  { slug: 'villa-sale', pattern: 'ویلای مسکونی بخرم', priority: 26, weight: 8 },
  { slug: 'villa-sale', pattern: 'می خواهم ویلای مسکونی', priority: 26, weight: 8 },
  { slug: 'villa-sale', pattern: 'می\u200cخواهم ویلای مسکونی', priority: 26, weight: 8 },
  { slug: 'apartment-sale', pattern: 'آپارتمان مسکونی', priority: 20, weight: 5 },
  { slug: 'apartment-sale', pattern: 'خرید آپارتمان مسکونی', priority: 22, weight: 6 },
  { slug: 'apartment-sale', pattern: 'خرید آپارتمان', priority: 20, weight: 5 },
  { slug: 'apartment-rent', pattern: 'رهن آپارتمان', priority: 20, weight: 5 },
  { slug: 'apartment-rent', pattern: 'اجاره آپارتمان', priority: 20, weight: 5 },
  { slug: 'shop-sale', pattern: 'فروش مغازه', priority: 20, weight: 5 },
  { slug: 'shop-sale', pattern: 'فروش غرفه', priority: 20, weight: 5 },
  { slug: 'shop-sale', pattern: 'مغازه تجاری', priority: 22, weight: 6 },
  { slug: 'shop-sale', pattern: 'خرید مغازه', priority: 22, weight: 6 },
  { slug: 'shop-rent', pattern: 'اجاره مغازه', priority: 18, weight: 4 },
  { slug: 'shop-rent', pattern: 'رهن مغازه', priority: 18, weight: 4 },
  { slug: 'office-sale', pattern: 'دفتر کار اداری', priority: 22, weight: 6 },
  { slug: 'office-sale', pattern: 'خرید دفتر', priority: 22, weight: 6 },
  { slug: 'office-sale', pattern: 'واحد اداری', priority: 24, weight: 7 },
  { slug: 'office-sale', pattern: 'دفتر کار می خوام بخرم', priority: 24, weight: 7 },
  { slug: 'office-sale', pattern: 'دفتر کار می\u200cخوام بخرم', priority: 24, weight: 7 },
  { slug: 'office-rent', pattern: 'دفتر', priority: 15, weight: 3 },
  { slug: 'industrial-sale', pattern: 'سوله صنعتی', priority: 22, weight: 6 },
  { slug: 'industrial-sale', pattern: 'خرید سوله', priority: 22, weight: 6 },
  { slug: 'industrial-sale', pattern: 'قصد خرید سوله', priority: 24, weight: 7 },
  { slug: 'industrial-sale', pattern: 'سوله یا کارگاه', priority: 22, weight: 6 },
  { slug: 'industrial-sale', pattern: 'خرید کارگاه', priority: 20, weight: 5 },
  { slug: 'industrial-sale', pattern: 'کارگاه صنعتی بخرم', priority: 24, weight: 7 },
  { slug: 'industrial-rent', pattern: 'سوله', priority: 15, weight: 3 },
  { slug: 'industrial-rent', pattern: 'اجاره سوله', priority: 22, weight: 6 },
  { slug: 'industrial-rent', pattern: 'کارگاه صنعتی', priority: 20, weight: 5 },
  { slug: 'land-sale', pattern: 'خرید زمین', priority: 22, weight: 6 },
  { slug: 'land-sale', pattern: 'زمین بخرم', priority: 20, weight: 5 },
  { slug: 'land-sale', pattern: 'خرید زمین و کلنگی', priority: 24, weight: 7 },
  { slug: 'land-rent', pattern: 'اجاره زمین', priority: 22, weight: 6 },
  { slug: 'land-rent', pattern: 'زمین اجاره', priority: 22, weight: 6 },
  { slug: 'land-rent', pattern: 'اجاره ماهانه زمین', priority: 24, weight: 7 },
  { slug: 'land-rent', pattern: 'اجاره ماهانهٔ زمین', priority: 24, weight: 7 },
  { slug: 'land-rent', pattern: 'اجاره زمین و کلنگی', priority: 26, weight: 8 },
  { slug: 'land-rent', pattern: 'زمین و کلنگی اجاره', priority: 26, weight: 8 },
  { slug: 'land-rent', pattern: 'اجاره ماهانهٔ زمین یا کلنگی', priority: 28, weight: 9 },
  { slug: 'land-rent', pattern: 'اجاره ماهانه زمین یا کلنگی', priority: 28, weight: 9 },
  { slug: 'land-sale', pattern: 'خرید زمین یا کلنگی', priority: 28, weight: 9 },
  { slug: 'land-sale', pattern: 'دنبال خرید زمین', priority: 26, weight: 8 },
  { slug: 'land-sale', pattern: 'زمین یا کلنگی', priority: 18, weight: 4 },
  { slug: 'agency-services', pattern: 'مشاور املاک', priority: 24, weight: 7 },
  { slug: 'agency-services', pattern: 'آژانس املاک', priority: 22, weight: 6 },
  { slug: 'agency-services', pattern: 'بنگاه املاک', priority: 22, weight: 6 },
  { slug: 'construction-partnership', pattern: 'مشارکت در ساخت', priority: 24, weight: 7 },
  { slug: 'pre-sale-services', pattern: 'پیش\u200cفروش', priority: 22, weight: 6 },
  { slug: 'pre-sale-services', pattern: 'پیش فروش', priority: 22, weight: 6 },
  { slug: 'workspace-short-rent', pattern: 'فضای کار اشتراکی', priority: 24, weight: 7 },
  { slug: 'workspace-short-rent', pattern: 'اجاره کوتاه\u200cمدت فضای کار', priority: 24, weight: 7 },
  { slug: 'workspace-short-rent', pattern: 'اجاره کوتاه مدت فضای کار', priority: 24, weight: 7 },
  { slug: 'workspace-short-rent', pattern: 'اجاره کوتاه\u200cمدت فضای کار اشتراکی', priority: 26, weight: 8 },
  { slug: 'workspace-short-rent', pattern: 'اجاره کوتاه مدت فضای کار اشتراکی', priority: 26, weight: 8 },
  { slug: 'suite-apartment-rent', pattern: 'سوئیت', priority: 14, weight: 2 },
  { slug: 'suite-apartment-rent', pattern: 'سوییت', priority: 14, weight: 2 },
  { slug: 'suite-apartment-rent', pattern: 'سوییت اقامتی', priority: 22, weight: 6 },
  { slug: 'suite-apartment-rent', pattern: 'سوئیت اقامتی', priority: 22, weight: 6 },
  { slug: 'suite-apartment-rent', pattern: 'اجاره کوتاه مدت', priority: 24, weight: 7 },
  { slug: 'suite-apartment-rent', pattern: 'اجاره کوتاه\u200cمدت', priority: 24, weight: 7 },
  { slug: 'suite-apartment-rent', pattern: 'آپارتمان اجاره کوتاه مدت', priority: 26, weight: 8 },
  { slug: 'suite-apartment-rent', pattern: 'آپارتمان اجاره کوتاه\u200cمدت', priority: 26, weight: 8 },
  { slug: 'shop-rent', pattern: 'اجاره مغازه', priority: 22, weight: 6 },
  { slug: 'shop-rent', pattern: 'رهن مغازه', priority: 22, weight: 6 },
  { slug: 'villa-short-rent', pattern: 'اجاره روزانه ویلا', priority: 22, weight: 6 },
  { slug: 'villa-rent', pattern: 'اجاره ویلا', priority: 20, weight: 5 },
  { slug: 'villa-rent', pattern: 'قرارداد بلندمدت', priority: 22, weight: 6 },
];

function leafFor(kind: EstatePropertyKind, family: EstateDealFamily): EstateLeafSlug | null {
  return KIND_DEAL_TO_LEAF[kind]?.[family] ?? null;
}

function composePropertyDealPhrases(): Array<{
  slug: string;
  pattern: string;
  priority: number;
  weight: number;
}> {
  const out: Array<{ slug: string; pattern: string; priority: number; weight: number }> = [];
  const seen = new Set<string>();

  for (const prop of PROPERTY_LEXICON) {
    if (prop.weight < 3) continue;
    for (const deal of DEAL_LEXICON) {
      if (deal.weight < 3) continue;
      const slug =
        deal.family === 'partnership'
          ? 'construction-partnership'
          : deal.family === 'pre_sale'
            ? 'pre-sale-services'
            : leafFor(prop.kind, deal.family);
      if (!slug) continue;

      const patterns = [`${deal.token} ${prop.token}`, `${prop.token} ${deal.token}`];
      for (const pattern of patterns) {
        const key = `${slug}|${pattern}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const priority = 16 + Math.min(8, prop.weight + deal.weight - 4);
        const weight = 3 + Math.min(4, Math.floor((prop.weight + deal.weight) / 3));
        out.push({ slug, pattern, priority, weight });
      }
    }
  }

  return out;
}

export function hasStrongEstatePropertySignal(text: string): boolean {
  const normalized = normalizeIntakeText(text);
  if (!normalized) return false;
  return PROPERTY_LEXICON.some((p) => {
    if (p.weight < 3) return false;
    const token = normalizeIntakeText(p.token);
    if (!token) return false;
    return includesBounded(normalized, token);
  });
}

function includesBounded(text: string, pattern: string): boolean {
  let idx = 0;
  while ((idx = text.indexOf(pattern, idx)) !== -1) {
    const before = idx > 0 ? text[idx - 1]! : ' ';
    const after = idx + pattern.length < text.length ? text[idx + pattern.length]! : ' ';
    const isLetter = (c: string) => /[\u0600-\u06FFa-zA-Z0-9\u200c]/.test(c);
    if (!isLetter(before) && !isLetter(after)) return true;
    idx += 1;
  }
  return false;
}

/** Compile estate collision + composed phrases into IntakeRule[]. */
export function compileEstateCollisionRules(): IntakeRule[] {
  const rules: IntakeRule[] = [];
  let seq = 0;

  const phrases = [...CURATED_HIGH_PRIORITY, ...composePropertyDealPhrases()];
  const phraseSeen = new Set<string>();
  for (const hp of phrases) {
    const key = `${hp.slug}|${normalizeIntakeText(hp.pattern)}`;
    if (phraseSeen.has(key)) continue;
    phraseSeen.add(key);
    rules.push({
      id: `estate-hp-${hp.slug}-${seq++}`,
      kind: 'phrase',
      slug: hp.slug,
      pattern: hp.pattern,
      priority: hp.priority,
      weight: hp.weight ?? 2,
    });
  }

  const collisionSeen = new Set<string>();
  for (const c of COLLISION_ROWS) {
    const key = `${c.slug}|${normalizeIntakeText(c.pattern)}|${c.unless.join(',')}`;
    if (collisionSeen.has(key)) continue;
    collisionSeen.add(key);
    rules.push({
      id: `estate-neg-${c.slug}-${seq++}`,
      kind: 'negative',
      slug: c.slug,
      pattern: c.pattern,
      unless: c.unless,
      priority: 14,
    });
  }

  void RESIDENTIAL_RESCUE;
  return rules;
}
