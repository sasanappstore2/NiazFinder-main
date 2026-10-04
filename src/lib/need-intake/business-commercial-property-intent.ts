import { normalizeIntakeText } from '@/lib/need-intake/normalize-intake-text';

const BUSINESS_WORDS = [
  'سالن',
  'آرایشگاه',
  'مزون',
  'بوتیک',
  'کافه',
  'رستوران',
  'فست فود',
  'فست‌فود',
  'نانوایی',
  'فروشگاه',
  'پاساژ',
  'شیرینی',
  'قنادی',
  'گل فروشی',
  // Generic business / commercial use (not residential living)
  'کسب و کار',
  'کسب‌وکار',
  'کسب وکار',
  'کسبوکار',
  'بیزینس',
  'بیزنس',
  'تجاری',
  'فعالیت تجاری',
  'کار تجاری',
] as const;

const OPEN_BUSINESS_PHRASES = [
  'میخوام بزنم',
  'می‌خوام بزنم',
  'میخواهم بزنم',
  'راه بندازم',
  'راه‌اندازی',
  'راه اندازی',
  'اجاره میخوام',
  'جا میخوام',
  'محل میخوام',
  'برای کسب',
  'بخاطر کسب',
  'به‌خاطر کسب',
  'جهت کسب',
  'برای کارم',
  'برای شغلم',
  'دفتر کار',
] as const;

const PROPERTY_SIGNALS = [
  'اجاره',
  'رهن',
  'ودیعه',
  'ملک',
  'مورد',
  'فضا',
  'غرفه',
  'مغازه',
  'معرفی کنید',
  'منطقه',
  'محله',
  'متری',
  'متر',
  'آپارتمان',
  'واحد',
  'سوئیت',
  'پلاک',
] as const;

const SHOP_EXPLICIT = [
  '\u0645\u063A\u0627\u0632\u0647',
  '\u063A\u0631\u0641\u0647',
  '\u0641\u0631\u0648\u0634\u06AF\u0627\u0647',
  '\u067E\u0627\u0633\u0627\u0698',
  '\u06A9\u06CC\u0648\u0633\u06A9',
] as const;
const SHOP_BUSINESS = [
  '\u0633\u0627\u0644\u0646',
  '\u0622\u0631\u0627\u06CC\u0634\u06AF\u0627\u0647',
  '\u0645\u0632\u0648\u0646',
  '\u0628\u0648\u062A\u06CC\u06A9',
  '\u06A9\u0627\u0641\u0647',
  '\u0631\u0633\u062A\u0648\u0631\u0627\u0646',
  '\u0641\u0633\u062A',
  '\u0646\u0627\u0646\u0648\u0627\u06CC\u06CC',
  '\u0634\u06CC\u0631\u06CC\u0646\u06CC',
  '\u0642\u0646\u0627\u062F\u06CC',
] as const;
// These businesses describe a retail/customer-facing premises, not merely an
// occupation that could equally operate from an office. A generic salon or
// unspecified business space remains ambiguous between shop and office.
const SHOP_PREMISES = [
  'مزون', 'بوتیک', 'کافه', 'رستوران', 'فست فود', 'فست‌فود',
  'نانوایی', 'شیرینی فروشی', 'قنادی', 'گل فروشی',
] as const;
const OFFICE_EXPLICIT = [
  '\u062F\u0641\u062A\u0631',
  '\u0627\u062F\u0627\u0631\u06CC',
  '\u0645\u0637\u0628',
  '\u06A9\u0644\u06CC\u0646\u06CC\u06A9',
  '\u0627\u062A\u0627\u0642 \u0627\u062F\u0627\u0631\u06CC',
] as const;

/** Business words that are common name substrings (e.g. «سالندان») need a
 *  Persian word boundary so a place name never reads as the business noun. */
const WORD_BOUNDED_TERMS = new Set(['سالن']);

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function includesAny(text: string, words: readonly string[]): boolean {
  return words.some((w) => {
    const normalized = normalizeIntakeText(w);
    if (WORD_BOUNDED_TERMS.has(w)) {
      return new RegExp(`(?:^|[\\s،,؛(])${escapeRegExp(normalized)}(?:ها(?:ی)?)?(?=$|[\\s،,؛.)])`, 'u').test(text);
    }
    return text.includes(normalized);
  });
}

/** Beauty service without property cues ? keep beauty-health. */
export function isBeautyServiceOnlyIntent(text: string): boolean {
  const t = normalizeIntakeText(text);
  if (!t.includes('\u0622\u0631\u0627\u06CC\u0634\u06AF\u0631') && !t.includes('\u0639\u0631\u0648\u0633')) {
    return false;
  }
  return !includesAny(t, PROPERTY_SIGNALS) && !includesAny(t, OPEN_BUSINESS_PHRASES);
}

/** User seeks commercial property to open or run a business (not a beauty service job). */
export function isBusinessCommercialPropertyIntent(text: string): boolean {
  const t = normalizeIntakeText(text);
  if (!t || isBeautyServiceOnlyIntent(t)) return false;

  const hasBusiness =
    includesAny(t, BUSINESS_WORDS) ||
    includesAny(t, OPEN_BUSINESS_PHRASES) ||
    includesAny(t, SHOP_EXPLICIT) ||
    includesAny(t, OFFICE_EXPLICIT) ||
    (t.includes('\u0633\u0627\u0644\u0646') &&
      (t.includes('\u0622\u0631\u0627\u06CC\u0634') || t.includes('\u0639\u0631\u0648\u0633\u06CC')));

  const hasProperty = includesAny(t, PROPERTY_SIGNALS);

  return hasBusiness && hasProperty;
}

function isSaleDeal(text: string): boolean {
  const t = normalizeIntakeText(text);
  const hasBuy =
    t.includes('\u062E\u0631\u06CC\u062F') ||
    t.includes('\u0628\u062E\u0631') ||
    t.includes('\u0645\u06CC\u062E\u0631\u0645') ||
    t.includes('\u0645\u06CC\u200C\u062E\u0631\u0645');
  const hasSell =
    /فروش(?!گاه|ی)/u.test(t) ||
    t.includes('\u0645\u06CC\u0641\u0631\u0648\u0634\u0645') ||
    t.includes('\u0645\u06CC\u200C\u0641\u0631\u0648\u0634\u0645');
  return (hasBuy || hasSell) && !t.includes('\u0627\u062C\u0627\u0631\u0647');
}

function isRentDeal(text: string): boolean {
  const t = normalizeIntakeText(text);
  return (
    t.includes('\u0627\u062C\u0627\u0631\u0647') ||
    t.includes('\u0631\u0647\u0646') ||
    t.includes('\u0648\u062F\u06CC\u0639\u0647')
  );
}

/** Leaf category slugs for commercial property search (shop/office/industrial). */
export function getBusinessCommercialPropertyCandidates(text: string): string[] {
  if (!isBusinessCommercialPropertyIntent(text)) return [];

  const t = normalizeIntakeText(text);
  const sale = isSaleDeal(t);
  const rent = isRentDeal(t);
  const dealSuffixes = sale ? ['sale'] : rent ? ['rent'] : ['rent', 'sale'];
  const forKind = (kind: 'shop' | 'office' | 'industrial') =>
    dealSuffixes.map((suffix) => `${kind}-${suffix}`);

  const hasShopExplicit = includesAny(t, SHOP_EXPLICIT);
  const hasShopPremises = includesAny(t, SHOP_PREMISES);
  const hasShopBusiness = includesAny(t, SHOP_BUSINESS);
  const hasOfficeExplicit = includesAny(t, OFFICE_EXPLICIT);
  // Word-bounded like «انبار»: «سوله» inside «ماسوله» (a city/hood name) or
  // «صنعتی» inside a compound place name is not the user's property noun.
  const hasIndustrial =
    /(?:^|[\s،,؛(])سوله(?:ها(?:ی)?)?(?=$|[\s،,؛.)])/u.test(t) ||
    /(?:^|[\s،,؛(])انبار(?:ها(?:ی)?)?(?=$|[\s،,؛.)])/u.test(t) ||
    /(?:^|[\s،,؛(])صنعتی(?:ها(?:ی)?)?(?=$|[\s،,؛.)])/u.test(t);

  // An explicit office/shop noun is what the user asked for even when the
  // location name contains an industrial keyword (e.g. «دفتر … شهرک صنعتی»).
  if (hasShopExplicit && hasOfficeExplicit) return [...forKind('shop'), ...forKind('office')];
  if (hasOfficeExplicit && !hasShopExplicit && !hasShopBusiness) return forKind('office');
  if (hasShopExplicit && !hasOfficeExplicit) return forKind('shop');
  if (hasShopPremises && !hasOfficeExplicit) return forKind('shop');
  if (hasIndustrial) return forKind('industrial');
  if (hasShopBusiness && !hasShopExplicit && !hasOfficeExplicit) {
    return [...forKind('shop'), ...forKind('office')];
  }

  return [...forKind('shop'), ...forKind('office')];
}

export function isAmbiguousCommercialSubtype(text: string): boolean {
  return getBusinessCommercialPropertyCandidates(text).length >= 2;
}

/** Single leaf slug when subtype is unambiguous; null when user must pick a chip. */
export function detectBusinessCommercialCategory(text: string): string | null {
  const candidates = getBusinessCommercialPropertyCandidates(text);
  if (candidates.length === 1) return candidates[0]!;
  return null;
}
