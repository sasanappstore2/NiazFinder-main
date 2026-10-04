/**
 * Builds, per leaf category, a set of intent-aware Persian exemplar strings to
 * embed for semantic retrieval.
 *
 * The category's MEANING is defined by intent as much as by subject:
 *   - refrigerator (product, buy/sell)  vs  refrigerator-repair (service, fix)
 *   - apartment-sale (buy/sell)          vs  apartment-rent (rent/deposit)
 * A title alone ("یخچال", "آپارتمان") is ambiguous, so we weave in
 * intent phrasings ("تعمیر یخچال خراب", "اجاره آپارتمان") that match how users
 * actually phrase the need. Rule packs are NOT used — they are synthetic and
 * even mislabeled (repair packs contain buy-phrases), which would poison recall.
 */
import { CANONICAL_CATEGORIES, getCategoryPath } from '@/config/categories';
import {
  CURATED_CATEGORY_SEEDS,
  type CategorySeed,
} from '@/intake/rules/seeds/category-seeds';

export interface CategoryExemplars {
  slug: string;
  title: string;
  vertical: string;
  exemplars: string[];
}

type IntentKind =
  | 'estate-sale'
  | 'estate-rent'
  | 'estate-short-rent'
  | 'estate-service'
  | 'repair'
  | 'service'
  | 'job'
  | 'vehicle-buy'
  | 'vehicle-rent'
  | 'product'
  | 'event'
  | 'social';

const seedBySlug = new Map<string, CategorySeed>(
  CURATED_CATEGORY_SEEDS.map((s) => [s.slug, s])
);

/**
 * Hand-tuned exemplars for heterogeneous / hard categories where the generic
 * intent templates misfire (social mix, events, job fields, close real-estate).
 */
const SLUG_EXEMPLAR_OVERRIDES: Record<string, string[]> = {
  // social (mixed bag — generic templates fail badly here)
  'lost-found': ['گم شد', 'گمشده', 'مفقود شد', 'پیدا کردم', 'کیف پولم را گم کردم', 'سگم گم شده', 'مدارکم را پیدا کردم'],
  volunteering: ['کار داوطلبانه', 'جذب داوطلب', 'فعالیت داوطلبانه', 'کمک داوطلبانه به نیازمندان', 'گروه داوطلبان'],
  conference: ['همایش', 'کنفرانس', 'سمینار', 'برگزاری همایش', 'وبینار تخصصی', 'گردهمایی علمی'],
  sporting: ['رویداد ورزشی', 'مسابقه ورزشی', 'تورنمنت', 'لیگ و دوره ورزشی', 'همایش ورزشی'],
  'cultural-artistic': ['رویداد فرهنگی', 'برنامه هنری', 'نمایشگاه فرهنگی', 'جشنواره فرهنگی هنری', 'کارگاه هنری'],
  // entertainment events
  tickets: ['بلیط', 'خرید بلیط کنسرت', 'رزرو بلیط', 'بلیط مسابقه و تئاتر'],
  tours: ['تور مسافرتی', 'تور گردشگری', 'رزرو تور', 'تور تفریحی'],
  pets: ['حیوان خانگی', 'سگ و گربه', 'فروش توله سگ', 'خرید گربه', 'پرنده و ماهی'],
  books: ['کتاب', 'خرید کتاب', 'کتاب دست دوم', 'رمان و کتاب درسی'],
  bicycle: ['خرید دوچرخه', 'دوچرخه کوهستان', 'دوچرخه دست دوم', 'دوچرخه برقی', 'دوچرخه بچگانه'],
  scooter: ['اسکوتر برقی', 'خرید اسکوتر', 'اسکیت برد', 'اسکیت دست دوم'],
  'fitness-equipment': ['لوازم ورزشی', 'تجهیزات بدنسازی', 'تردمیل خانگی', 'دمبل و وزنه', 'دستگاه بدنسازی'],
  'camping-outdoor': ['لوازم کوهنوردی', 'چادر مسافرتی', 'کیسه خواب', 'لوازم کمپینگ و طبیعت‌گردی'],
  'musical-instruments': ['ساز و آلات موسیقی', 'خرید گیتار', 'پیانو', 'سنتور و ویولن'],
  // jobs (field of work, hiring or seeking)
  it: ['استخدام برنامه‌نویس', 'استخدام نیروی فناوری اطلاعات', 'کار در حوزه IT و نرم‌افزار', 'جذب توسعه‌دهنده'],
  'admin-management': ['استخدام نیروی اداری', 'منشی و کارمند اداری', 'مدیر دفتر', 'کارشناس اداری'],
  'finance-legal': ['استخدام حسابدار', 'کارشناس مالی و حقوقی', 'حسابدار و امور مالی', 'مشاور حقوقی شرکت'],
  'marketing-sales': ['استخدام کارشناس فروش', 'بازاریاب و فروشنده', 'کارشناس مارکتینگ', 'نیروی فروش'],
  engineering: ['استخدام مهندس', 'مهندس عمران و مکانیک', 'کارشناس فنی و مهندسی', 'نیروی مهندسی'],
  'art-media': ['استخدام در حوزه هنر و رسانه', 'گرافیست و تدوینگر', 'عکاس و تولید محتوا'],
  'health-beauty': ['استخدام در حوزه درمانی و زیبایی', 'پرستار و آرایشگر', 'کادر درمان و سالن زیبایی'],
};

function leafCategorySlugs(): string[] {
  const hasChild = new Set<string>();
  for (const c of CANONICAL_CATEGORIES) if (c.parentSlug) hasChild.add(c.parentSlug);
  return CANONICAL_CATEGORIES.filter(
    (c) => c.depth === 2 || (c.depth === 1 && !hasChild.has(c.slug))
  ).map((c) => c.slug);
}

function classify(slug: string, vertical: string, parentTitle: string): IntentKind {
  if (vertical === 'services') {
    return parentTitle.includes('تعمیر') ? 'repair' : 'service';
  }
  if (vertical === 'jobs') return 'job';
  if (vertical === 'social') return 'social';
  if (vertical === 'entertainment') {
    if (slug === 'tickets' || slug === 'tours') return 'event';
    return 'product';
  }
  if (vertical === 'vehicles') {
    return slug.includes('rental') ? 'vehicle-rent' : 'vehicle-buy';
  }
  if (vertical === 'real-estate') {
    if (parentTitle.includes('کوتاه')) return 'estate-short-rent';
    if (parentTitle.includes('فروش')) return 'estate-sale';
    if (parentTitle.includes('اجاره')) return 'estate-rent';
    return 'estate-service';
  }
  // electronics, home-appliances, personal-items
  return 'product';
}

function intentExemplars(kind: IntentKind, t: string): string[] {
  switch (kind) {
    case 'repair':
      return [`تعمیر ${t}`, `${t} خراب شده`, `${t} کار نمی‌کند`, `تعمیرکار ${t}`, `سرویس و تعمیر ${t}`];
    case 'service':
      return [`${t}`, `نیاز به ${t} دارم`, `درخواست خدمات ${t}`, `${t} حرفه‌ای می‌خواهم`];
    case 'job':
      return [`استخدام ${t}`, `نیرو برای ${t} استخدام می‌کنیم`, `دنبال کار در حوزه ${t}`, `جذب ${t}`];
    case 'estate-sale':
      return [`خرید ${t}`, `فروش ${t}`, `${t} برای فروش`, `${t} می‌خرم`];
    case 'estate-rent':
      return [`اجاره ${t}`, `رهن و اجاره ${t}`, `رهن ${t}`, `${t} اجاره‌ای می‌خواهم`];
    case 'estate-short-rent':
      return [`اجاره روزانه ${t}`, `اجاره کوتاه‌مدت ${t}`, `${t} برای چند روز`, `سوئیت روزانه ${t}`];
    case 'estate-service':
      return [`${t}`, `خدمات املاک ${t}`, `${t} ملکی`];
    case 'vehicle-buy':
      return [`خرید ${t}`, `فروش ${t}`, `${t} دست دوم`, `${t} صفر`];
    case 'vehicle-rent':
      return [`اجاره ${t}`, `کرایه ${t}`, `${t} اجاره‌ای`];
    case 'event':
      return [`${t}`, `خرید ${t}`, `رزرو ${t}`];
    case 'social':
      return [`${t}`, `${t}`];
    case 'product':
    default:
      return [`خرید ${t}`, `فروش ${t}`, `${t} نو`, `${t} دست دوم`, `${t} می‌خواهم`];
  }
}

function uniqueTrimmed(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const t = v.replace(/\s+/g, ' ').trim();
    if (t.length < 2 || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

const MAX_EXEMPLARS = 14;

export function buildCategoryExemplars(): CategoryExemplars[] {
  const out: CategoryExemplars[] = [];

  for (const slug of leafCategorySlugs()) {
    const path = getCategoryPath(slug);
    if (!path.length) continue;
    const vertical = path[0]?.slug ?? '';
    const leaf = path[path.length - 1]!;
    const parentTitle = path.length >= 2 ? path[path.length - 2]!.title : '';
    const sectionTitle = path[0]?.title ?? '';
    const leafTitle = leaf.title;

    const kind = classify(slug, vertical, parentTitle);
    const exemplars: string[] = [];

    // Hand-tuned overrides take precedence for hard/heterogeneous categories.
    const override = SLUG_EXEMPLAR_OVERRIDES[slug];
    if (override) exemplars.push(...override);

    // Intent-aware phrasings on the leaf subject (the strongest signal).
    exemplars.push(...intentExemplars(kind, leafTitle));

    // Context phrase so vague leaves (سواری، صنعتی) carry their section/parent.
    exemplars.push([sectionTitle, parentTitle, leafTitle].filter(Boolean).join(' '));
    if (leaf.englishTitle) exemplars.push(leaf.englishTitle);

    // Curated seed keywords (real user words) — combined with intent for clarity.
    const seed = seedBySlug.get(slug);
    if (seed) {
      const intentWord =
        kind === 'repair'
          ? 'تعمیر'
          : kind === 'estate-rent' || kind === 'vehicle-rent' || kind === 'estate-short-rent'
            ? 'اجاره'
            : kind === 'estate-sale' || kind === 'vehicle-buy' || kind === 'product'
              ? 'خرید'
              : '';
      for (const kw of seed.keywords.slice(0, 5)) {
        exemplars.push(intentWord ? `${intentWord} ${kw}` : kw);
      }
      for (const svc of (seed.services ?? []).slice(0, 3)) exemplars.push(svc);
    }

    out.push({
      slug,
      title: leafTitle,
      vertical,
      exemplars: uniqueTrimmed(exemplars).slice(0, MAX_EXEMPLARS),
    });
  }

  return out;
}
