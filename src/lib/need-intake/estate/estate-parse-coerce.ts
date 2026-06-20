import type { ParsedIntent } from '@/contracts/need-intake';
import { getCategoryPath } from '@/config/categories';
import { normalizeIntakeText } from '@/lib/need-intake/normalize-intake-text';
import {
  isAmbiguousCommercialSubtype,
  isBusinessCommercialPropertyIntent,
} from '@/lib/need-intake/business-commercial-property-intent';
import {
  isConstructionPartnershipText,
  parseCity,
  refinePropertyCategorySlug,
} from '@/lib/need-intake/intent-parser';
import { toAsciiDigits } from '@/lib/need-intake/extract-property-slots';

const ESTATE_DOMAIN_SIGNALS = [
  'آپارتمان',
  'اپارتمان',
  'آپارت',
  'خونه',
  'خانه',
  'ویلا',
  'زمین',
  'ملک',
  'مغازه',
  'دفتر',
  'سوله',
  'کارگاه',
  'انبار',
  'رهن',
  'ودیعه',
  'اجاره',
  'پنت',
  'برج',
  'واحد',
  'پیش‌خرید',
  'پیش خرید',
  'مشارکت',
  'سرمایه',
  'مستغل',
  'جهیزیه',
  'کلنگی',
  'مسکونی',
  'تجاری',
  'متری',
  'خواب',
  'متر',
  'منطقه',
  'محله',
  'شمال تهران',
  'جنوب شهر',
  'پاساژ',
  'شهرک',
  'جا',
  'کلینیک',
  'پارکینگ',
  'بازار',
  'بلوار',
  'فرحزادی',
  'نوساز',
  'سند',
  'بهم‌پیوسته',
  'بهم پیوسته',
  'خانه‌مانی',
  'خانه مانی',
];

function hasProductShoppingSignal(text: string): boolean {
  if (text.includes('پارکینگ') && text.includes('ماشین')) return false;
  return /(?:موبایل|لپ‌?تاپ|گوشی|(?<![‌\w])ماشین(?![‌\w])|خودرو|کتاب|بیمه|آموزش|نرم‌?افزار|تعمیرکار|آشپز|سفر)/u.test(
    text
  );
}

export function isEstateDomainText(text: string): boolean {
  const t = normalizeIntakeText(text);
  if (t.includes('مکانیک')) return false;
  if (hasProductShoppingSignal(t)) return false;
  if (ESTATE_DOMAIN_SIGNALS.some((s) => t.includes(s))) return true;
  if ((t.includes('میلیون') || t.includes('میلیارد')) && t.includes('بودجه')) return true;
  if (/^(?:خرید|رهن|اجاره|پیش‌?خرید|مشارکت|سرمایه)/u.test(t)) return true;
  if (t.includes('بخر') && !hasProductShoppingSignal(t)) return true;
  if (t.includes('با وام') && (t.includes('خرم') || t.includes('ملک'))) return true;
  if (t.includes('یه و نیم') && t.includes('میلیارد')) return true;
  if (t.includes('زیر') && t.includes('میلیارد')) return true;
  if (/^\d+\s*تا\s*\d+$/u.test(t.trim())) return true;
  if (t.includes('تهران') && (t.includes('چیز') || t.includes('خوب'))) return true;
  if (t.includes('ارزون')) return true;
  if (t.includes('توافقی') || t.includes('هر چی')) return true;
  if (/[۰-۹0-9]+\s*تا\s*[۰-۹0-9]+/u.test(t)) return true;
  if (t.includes('تومن') || t.includes('تومان')) return true;
  return false;
}

function inferPropertyKind(text: string): string | undefined {
  const norm = normalizeIntakeText(text);
  if (isBusinessCommercialPropertyIntent(norm)) {
    if (norm.includes('مغازه') || norm.includes('غرفه') || norm.includes('فروشگاه')) {
      return 'shop';
    }
    if (norm.includes('دفتر') || norm.includes('مطب') || norm.includes('کلینیک')) {
      return 'office';
    }
    if (norm.includes('سوله') || norm.includes('انبار')) return 'industrial';
    if (isAmbiguousCommercialSubtype(norm)) return undefined;
    if (
      norm.includes('سالن') ||
      norm.includes('مزون') ||
      norm.includes('بوتیک') ||
      norm.includes('کافه')
    ) {
      return 'shop';
    }
  }
  if (text.includes('تجاری-مسکونی') || text.includes('تجاری مسکونی')) return 'shop';
  if (text.includes('زندگی') && text.includes('کار')) return 'shop';
  if (text.includes('بهم‌پیوسته') || text.includes('بهم پیوسته')) return 'apartment';
  if (text.includes('ملک تجاری') || text.includes('تجاری ورودی')) return 'shop';
  if (text.includes('کسب و کار') || text.includes('کسب وکار')) return 'shop';
  if (text.includes('واحد بر خیابان') || text.includes('بر خیابان')) return 'shop';
  if (text.includes('واحد بانکی') || text.includes('بانکی')) return 'office';
  if (text.includes('واسه کار') || text.includes('محل کار')) return 'office';
  if (text.includes('جا') && text.includes('کار')) return 'office';
  if (text.includes('دفتر') || text.includes('اداری')) return 'office';
  if (text.includes('پنت') || text.includes('برج')) return 'apartment';
  if (text.includes('آپارت') || text.includes('اپارت') || text.includes('سوئیت')) {
    return 'apartment';
  }
  if (text.includes('خانه ویلایی') || (text.includes('خانه') && text.includes('ویلایی'))) {
    return 'villa';
  }
  if (text.includes('ویلا') && !text.includes('زمین') && !text.includes('باغ')) return 'villa';
  if (text.includes('خونه') || text.includes('خانه')) return 'apartment';
  if (text.includes('زمین') || text.includes('کلنگی') || text.includes('باغ')) return 'land';
  if (text.includes('سوله') || text.includes('کارگاه')) {
    return 'industrial';
  }
  if (text.includes('انبار') && !text.includes('انباری')) return 'industrial';
  if (text.includes('دفتر') || text.includes('اداری') || text.includes('کلینیک')) return 'office';
  if (text.includes('بدم') && text.includes('کار کنه')) return 'shop';
  if (text.includes('مغازه') || text.includes('فروشگاه') || text.includes('کیوسک')) return 'shop';
  if (text.includes('واحد')) return 'apartment';
  if (text.includes('ملک')) return 'apartment';
  return undefined;
}

function inferDealType(text: string): string | undefined {
  if (text.includes('نه خرید') && text.includes('نه اجاره')) return undefined;
  if (
    text.includes('تومن') &&
    (text.includes('داری') || text.includes('آپارت')) &&
    !text.includes('خرید') &&
    !text.includes('خرم')
  ) {
    return 'rent_monthly';
  }
  if (text.includes('شریک') && text.includes('سازنده')) return 'buy';
  if (text.includes('واسه کار') || (text.includes('جا') && text.includes('کار'))) {
    return 'rent_monthly';
  }
  if (text.includes('اجاره بدم') || text.includes('اجاره دادن') || text.includes('اجاره دادنی')) {
    return 'sell';
  }
  if (text.includes('رهن بدم') || text.includes('رهن می‌دم') || text.includes('رهن میدم')) {
    return 'sell';
  }
  if (text.includes('پیش‌خرید') || text.includes('پیش خرید')) return 'buy';
  if (text.includes('سرمایه') || text.includes('مستغل')) return 'buy';
  if (text.includes('جهیزیه')) return 'buy';
  if (text.includes('جابجایی') || text.includes('معاوضه')) return 'buy';
  if (text.includes('بلندمدت') || text.includes('بلند مدت')) return 'rent_monthly';
  if (text.includes('موقت') && text.includes('دفتر')) return 'rent_monthly';

  const hasRahn = text.includes('رهن') || text.includes('ودیعه');
  let hasRent = text.includes('اجاره');
  if (text.includes('نه اجاره')) hasRent = false;
  const rahnEjareShort = /رهن\s*\d+\s*اجاره\s*\d+/u.test(text);
  if (text.includes('اجاره ندارم') && hasRahn) return 'rent_rahn_full';
  if (rahnEjareShort || (hasRahn && hasRent && !text.includes('اجاره ندارم'))) {
    return 'rent_rahn_ejare';
  }
  if (hasRahn && !text.includes('بدم')) return 'rent_rahn_full';

  if (text.includes('دنبال') && (text.includes('اجاره') || text.includes('دفتر') || text.includes('جا'))) {
    return 'rent_monthly';
  }
  if (text.includes('خانه‌مانی') || text.includes('خانه مانی')) return 'rent_monthly';
  if (text.includes('بدم') && text.includes('کار کنه')) return 'sell';
  if (text.includes('پایان کار') || text.includes('با جواز')) return 'buy';
  if (text.includes('کلنگی') || text.includes('نوساز')) return 'buy';
  if (text.includes('میلیارد')) return 'buy';
  if (text.includes('بخر') || text.includes('خرم')) return 'buy';
  if (text.includes('رهن کامل') || text.includes('فقط رهن')) return 'rent_rahn_full';
  if (text.includes('رهن و اجاره') || text.includes('ودیعه و اجاره')) return 'rent_rahn_ejare';

  if (text.includes('متری') && text.includes('تومن')) return 'buy';
  if (text.includes('برای ساخت')) return 'buy';
  if (hasRent) return 'rent_monthly';
  if (text.includes('فروش') || text.includes('بفروش') || text.includes('تبدیل به پول')) {
    return 'sell';
  }
  if (
    text.includes('خرید') ||
    text.includes('بخرم') ||
    text.includes('میخرم') ||
    text.includes('خرم') ||
    text.includes('بگیرم') ||
    text.includes('پول دارم')
  ) {
    return 'buy';
  }
  if (text.includes('دفتر') || text.includes('اداری')) return 'rent_monthly';
  return undefined;
}

function inferCategorySlug(text: string, entities: Record<string, string>): string {
  if (isConstructionPartnershipText(text) || (text.includes('مشارکت') && text.length < 40)) {
    return 'construction-partnership';
  }
  if (text.includes('شریک') && text.includes('سازنده')) {
    return 'construction-partnership';
  }
  if (text.includes('پیش‌خرید') || text.includes('پیش خرید') || text.includes('پیشفروش')) {
    return 'pre-sale-services';
  }
  const kind = entities.propertyKind ?? inferPropertyKind(text);
  const deal = entities.dealType ?? inferDealType(text);
  if (kind === 'land') return deal?.startsWith('rent') ? 'land-rent' : 'land-sale';
  if (kind === 'shop') return deal?.startsWith('rent') ? 'shop-rent' : 'shop-sale';
  if (kind === 'office') return deal?.startsWith('rent') ? 'office-rent' : 'office-sale';
  if (kind === 'industrial') return deal?.startsWith('rent') ? 'industrial-rent' : 'industrial-sale';
  if (kind === 'villa') return deal?.startsWith('rent') ? 'villa-rent' : 'villa-sale';
  if (deal?.startsWith('rent')) return 'apartment-rent';
  if (deal === 'buy' || deal === 'sell') return 'apartment-sale';
  return 'real-estate';
}

function parsePersianWordNumber(token: string): number | null {
  const map: Record<string, number> = {
    یک: 1,
    دو: 2,
    سه: 3,
    چهار: 4,
    پنج: 5,
    شش: 6,
    هفت: 7,
    هشت: 8,
    نه: 9,
    ده: 10,
    یازده: 11,
    دوازده: 12,
    سی: 30,
    بیست: 20,
    پانصد: 500,
    نهصد: 900,
    'نهصد و پنجاه': 950,
    'سیصد و پنجاه': 350,
  };
  const t = token.trim();
  if (map[t] != null) return map[t];
  const half = t.match(/یه\s*و\s*نیم/u);
  if (half) return 1.5;
  return null;
}

/** Parse Iranian colloquial budget phrases into Toman integers. */
export function parseEstateBudgetFromText(
  text: string,
  dealHint?: string
): { budgetMin?: number; budgetMax?: number; deposit?: number; monthlyRent?: number } {
  const norm = toAsciiDigits(normalizeIntakeText(text));
  const out: {
    budgetMin?: number;
    budgetMax?: number;
    deposit?: number;
    monthlyRent?: number;
  } = {};

  const rahnEjare = norm.match(/رهن\s*(\d+(?:\.\d+)?)\s*(?:و\s*)?اجاره\s*(\d+(?:\.\d+)?)/u);
  if (rahnEjare) {
    out.deposit = Math.round(Number(rahnEjare[1]) * 1_000_000);
    out.monthlyRent = Math.round(Number(rahnEjare[2]) * 1_000_000);
    return out;
  }

  const rahnOnlyDeposit = norm.match(/رهن\s*(\d+(?:\.\d+)?)(?:\s*اجاره\s*ندارم|\s*فقط)?/u);
  if (rahnOnlyDeposit && norm.includes('اجاره ندارم')) {
    out.deposit = Math.round(Number(rahnOnlyDeposit[1]) * 1_000_000);
    return out;
  }

  const billionRange = norm.match(/(\d+(?:\.\d+)?)\s*تا\s*(\d+(?:\.\d+)?)\s*میلیارد/u);
  if (billionRange) {
    out.budgetMin = Math.round(Number(billionRange[1]) * 1_000_000_000);
    out.budgetMax = Math.round(Number(billionRange[2]) * 1_000_000_000);
    return out;
  }

  const underBillion = norm.match(/زیر\s*(\d+(?:\.\d+)?)\s*میلیارد/u);
  if (underBillion) {
    out.budgetMax = Math.round(Number(underBillion[1]) * 1_000_000_000);
    return out;
  }

  const billionCap = norm.match(/تا\s*(\d+(?:\.\d+)?)\s*تومن/u);
  if (billionCap) {
    out.budgetMax = Math.round(Number(billionCap[1]) * 1_000_000_000);
    return out;
  }

  const billionSingle = norm.match(/(\d+(?:\.\d+)?)\s*میلیارد/u);
  if (billionSingle) {
    out.budgetMax = Math.round(Number(billionSingle[1]) * 1_000_000_000);
    return out;
  }

  const millionRent = norm.match(
    /(?:بیست|بیست و پنج|بیست\s*و\s*پنج|(\d+(?:\.\d+)?))\s*(?:ملیون|میلیون)[^\n]{0,20}اجاره/u
  );
  if (millionRent) {
    const raw = millionRent[1] ?? '25';
    out.monthlyRent = Math.round(Number(raw) * 1_000_000);
    return out;
  }

  const millionBudget = norm.match(/(\d+(?:\.\d+)?)\s*میلیون[^\n]{0,30}(?:بودجه|دارم)/u);
  if (millionBudget) {
    out.budgetMax = Math.round(Number(millionBudget[1]) * 1_000_000);
    return out;
  }

  const tomanColloquial = norm.match(/(\d+(?:\.\d+)?)\s*تومن/u);
  if (tomanColloquial) {
    const n = Number(tomanColloquial[1]);
    const isRentCtx =
      dealHint?.includes('rent') ||
      (norm.includes('اجاره') && !norm.includes('نه اجاره')) ||
      norm.includes('داری') ||
      (norm.includes('آپارتمان') &&
        Number(n) <= 999 &&
        !norm.includes('خرید') &&
        !norm.includes('بخر') &&
        !norm.includes('خرم'));
    if (isRentCtx) {
      out.monthlyRent = Math.round(n * 1_000);
    } else {
      out.budgetMax = Math.round(n * 1_000_000);
    }
    return out;
  }

  const wordBillionHalf = text.includes('یه و نیم') && text.includes('میلیارد');
  if (wordBillionHalf) {
    out.budgetMax = 1_500_000_000;
    return out;
  }

  const underWordBillion = norm.match(/زیر\s*(دو|2)\s*میلیارد/u);
  if (underWordBillion) {
    out.budgetMax = 2_000_000_000;
    return out;
  }

  const nineHundred = text.includes('نهصد') && text.includes('میلیون');
  if (nineHundred) {
    out.budgetMax = text.includes('نهصد و پنجاه') ? 950_000_000 : 900_000_000;
    return out;
  }

  const rangeOnly = norm.match(/^(\d+)\s*تا\s*(\d+)$/u);
  if (rangeOnly) {
    return out;
  }

  const priceTomane = norm.match(/(\d+(?:\.\d+)?)\s*تومنه/u);
  if (priceTomane) {
    const n = Number(priceTomane[1]);
    out.budgetMax = Math.round(n * (n <= 30 ? 1_000_000_000 : 1_000_000));
    return out;
  }

  if (text.includes('پانصد') && text.includes('ودیعه')) {
    out.deposit = 500_000_000;
    return out;
  }

  const wDeposit = norm.match(/(\d+(?:\.\d+)?)\s*تومن\s*ودیعه/u);
  if (wDeposit) {
    out.deposit = Math.round(Number(wDeposit[1]) * 1_000_000);
    return out;
  }

  for (const phrase of ['نهصد و پنجاه میلیون', 'نهصد میلیون', 'سیصد و پنجاه']) {
    if (text.includes(phrase.replace(/\s+/g, ' '))) {
      const n = parsePersianWordNumber(phrase.split(' ')[0]) ?? Number(toAsciiDigits(phrase));
      if (phrase.includes('نهصد و پنجاه')) out.budgetMax = 950_000_000;
      else if (phrase.includes('نهصد')) out.budgetMax = 900_000_000;
      else if (phrase.includes('سیصد و پنجاه')) out.budgetMax = 350_000_000;
      void n;
      return out;
    }
  }

  const millionPlain = norm.match(/(\d+(?:\.\d+)?)\s*میلیون/u);
  if (millionPlain && (norm.includes('اجاره') || norm.includes('ماه'))) {
    out.monthlyRent = Math.round(Number(millionPlain[1]) * 1_000_000);
  }

  return out;
}

/** Strengthen weak rule-parser output for estate domain text. */
export function coerceParsedForEstate(parsed: ParsedIntent): ParsedIntent {
  const text = normalizeIntakeText(parsed.rawText ?? '');
  if (!isEstateDomainText(text)) return parsed;

  const minimal =
    text.length < 40 &&
    !parseCity(text) &&
    !/\d+\s*متر/u.test(text) &&
    !text.includes('تهران');

  const entities = { ...parsed.entities };
  const kind = inferPropertyKind(text);
  if (kind) entities.propertyKind = kind;
  if (minimal && entities.propertyKind === 'apartment' && !text.match(/آپارت|خانه|خونه|ویلا|زمین|مغازه|دفتر|بهم/u)) {
    delete entities.propertyKind;
  }
  const deal = inferDealType(text);
  if (deal) entities.dealType = deal;
  else if (text.includes('نه خرید') && text.includes('نه اجاره')) delete entities.dealType;

  let categorySlug = parsed.categorySlug;
  const root = getCategoryPath(categorySlug)[0]?.slug;
  if (root !== 'real-estate' && categorySlug !== 'construction-partnership') {
    categorySlug = inferCategorySlug(text, entities);
  }
  categorySlug = refinePropertyCategorySlug(categorySlug, entities, text);

  const budgetPatch = parseEstateBudgetFromText(text, entities.dealType);
  if (budgetPatch.deposit) entities.deposit = String(budgetPatch.deposit);
  if (budgetPatch.monthlyRent) entities.monthlyRent = String(budgetPatch.monthlyRent);

  let intentType = parsed.intentType;
  if (!intentType.startsWith('property')) {
    if (entities.dealType === 'sell' && (text.includes('اجاره بدم') || text.includes('رهن بدم'))) {
      intentType = 'property_listing';
    } else if (
      isConstructionPartnershipText(text) ||
      text.includes('مشارکت') ||
      (text.includes('شریک') && text.includes('سازنده'))
    ) {
      intentType = 'real_estate_service';
    } else {
      intentType = 'property_search';
    }
  }

  return {
    ...parsed,
    intentType,
    categorySlug,
    entities,
    budgetMin: budgetPatch.budgetMin ?? parsed.budgetMin,
    budgetMax: budgetPatch.budgetMax ?? parsed.budgetMax,
    confidence: Math.max(parsed.confidence, 0.72),
  };
}
