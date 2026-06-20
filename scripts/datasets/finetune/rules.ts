import type { CatInfo } from './catalog-index';
import { normMatch } from './catalog-index';

export type SyntheticStatus = 'resolved' | 'ambiguous_location' | 'missing_location';

export interface SyntheticLocation {
  province: string | null;
  city: string | null;
  neighborhood: string | null;
  cityId: string | null;
  neighborhoodId: string | null;
}

export interface SyntheticCategory {
  slug: string;
  pathFa: string;
  nameFa: string;
  nameEn: string;
}

export interface SyntheticOption {
  city: string;
  province: string;
  cityId: string;
}

export interface SyntheticPayload {
  location: SyntheticLocation;
  categories: SyntheticCategory[];
  categorySlugs: string[];
  status: SyntheticStatus;
  options: SyntheticOption[];
}

const REMOVE_EXACT = new Set([
  'هوای شیخه چطوره؟',
  'آدرس کوی دکتر صدر رو میشناسم.',
  'آدرس وشاره رو میشناسم.',
  'الان تو چگارمان غلامحسین هستم.',
  'به حلاف 2 رسیدم.',
  'گفتن تو ابومحله یه جا هست.',
  'تو کارخانه سایپا کاشان جای پارک هست؟',
  'از چپک ناظمی محله تا مرکز شهر چقدره؟',
  'دنبال یه جا تو میخک میگردم.',
  'تو فارسبان کسی رو میشناسم.',
  'چطوری از وامکوه تا مرکز شهر چقدره؟',
  'سلام، تو دیچان چهکار میشه کرد؟',
  'از زلیخامرده تا مرکز شهر چقدره؟؟؟',
  'خونه دوستم تو ورودی 21 هست.',
  'من رسیدم تو خیابون دویلات.',
  'محله نهار رو پیدا کردم.',
  'گفتن تو میدان شاهچراغی یه جا هست.',
  'تو بابا شیخ علی جای پارک هست؟',
  'از کاردگر محله تا مرکز شهر چقدره؟',
  'از درزآب تا مرکز شهر چقدره؟',
  'قراره تو رودک یه قرار بدیم.',
  'سلام قراره تو میان رز یه قرار بدیم.',
  'تو تازۀ آباد عزیزی کسی رو میشناسم.',
  'قراره تو چهارراه خروا یه قرار بدیم.',
  'چطوری تو خواجه ولی سفلی کسی رو میشناسم.',
  'یه سوالی درباره گلزارمحمد داشتم...',
  'میخوام برم شهرک صنعتی سمنان.',
  'تو محله کاغذکنان کی هست؟',
]);

const REMOVE_PATTERNS: RegExp[] = [
  /^هوای\s+.+\s+چطور/,
  /تا مرکز شهر چقدره/,
  /جای پارک هست/,
  /کسی رو میشناسم/,
  /قرار بدیم/,
  /^من رسیدم تو/,
  /^الان تو .+ هستم/,
  /رو پیدا کردم/,
  /^میخوام برم /,
  /سوالی درباره/,
  /^آدرس .+ رو میشناسم/,
  /^گفتن تو .+ یه جا هست/,
];

const MOTORCYCLE_BRANDS = [
  'آپریلیا',
  'ویکتور',
  'وسپا',
  'پیشرو',
  'تریومف',
  'کویر',
  'هوندا',
  'یاماها',
  'کاوازاکی',
  'سوزوکی',
  'بنلی',
];

function catMeta(slug: string, catIndex: Map<string, CatInfo>): SyntheticCategory {
  const info = catIndex.get(slug);
  if (!info) {
    return { slug, pathFa: slug, nameFa: slug, nameEn: slug };
  }
  return {
    slug: info.slug,
    pathFa: info.pathFa,
    nameFa: info.nameFa,
    nameEn: info.nameEn,
  };
}

export function shouldRemoveRecord(user: string, status: string): string | null {
  if (status === 'missing_intent') {
    if (REMOVE_EXACT.has(user)) return 'missing_intent_exact';
    for (const pat of REMOVE_PATTERNS) {
      if (pat.test(user)) return 'missing_intent_pattern';
    }
    return 'missing_intent_other';
  }
  if (user.length < 12) return 'user_too_short';
  return null;
}

export function applyCategoryRules(
  user: string,
  slugs: string[],
  catIndex: Map<string, CatInfo>
): string[] {
  let out = [...slugs];

  if (out.includes('ac-repair') && /گری گاز/.test(user)) {
    out = out.map((s) => (s === 'ac-repair' ? 'water-heater-boiler-repair' : s));
  }

  if (out.includes('plumbing') && /شوفاژ/.test(user)) {
    out = out.map((s) => (s === 'plumbing' ? 'water-heater-boiler-repair' : s));
  }

  if (out.includes('water-pump-repair')) {
    const isMotoBrand = MOTORCYCLE_BRANDS.some((b) => user.includes(b));
    const motoCtx = /موتورسیکلت|موتور(?! آب)|یاتاقان|زنجیر/.test(user);
    if (isMotoBrand || (user.startsWith('آپریلیا') && motoCtx)) {
      out = out.map((s) => (s === 'water-pump-repair' ? 'motorcycle-repair' : s));
    }
  }

  if (out.includes('refrigerator-repair') && /اینورتر/.test(user) && /یخ زده|گاز داده|آب چکه/.test(user)) {
    out = out.map((s) => (s === 'refrigerator-repair' ? 'ac-repair' : s));
  }

  if (out.includes('generator-ups-repair') && /موتورسیکلت|یاتاقان|زنجیر/.test(user)) {
    out = out.map((s) => (s === 'generator-ups-repair' ? 'motorcycle-repair' : s));
  }

  return [...new Set(out)];
}

export function rebuildCategories(
  slugs: string[],
  catIndex: Map<string, CatInfo>
): SyntheticCategory[] {
  return slugs.map((s) => catMeta(s, catIndex));
}

export function splitPayloadByCategory(
  payload: SyntheticPayload
): SyntheticPayload[] {
  const slugs = payload.categorySlugs;
  if (slugs.length <= 1) return [payload];
  return slugs.map((slug) => ({
    ...payload,
    categorySlugs: [slug],
    categories: payload.categories.filter((c) => c.slug === slug),
  }));
}

export function userMentionsCity(user: string, city: string): boolean {
  const nUser = normMatch(user);
  const nCity = normMatch(city);
  return nUser.includes(nCity) || user.includes(city);
}
