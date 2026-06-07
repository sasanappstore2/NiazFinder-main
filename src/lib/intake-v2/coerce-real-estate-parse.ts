import type { ParsedIntent } from '@/contracts/need-intake';
import { isRealEstateIntent } from '@/lib/intake-v2/real-estate-guard';

const REAL_ESTATE_SIGNAL =
  /ملک|واحد|آپارت|اپارت|خونه|خانه|رهن|ودیعه|اجاره|زمین|ویلا|مغازه|دفتر|مزون|غرفه|ویترین|پاساژ|سوئیت|کلنگی|مسکونی|تجاری|صنعتی|همکف|طبقه|انباری|انبار|سوله|پارکینگ/i;

export { REAL_ESTATE_SIGNAL };

export interface CoerceHints {
  propertyKind?: string;
  dealType?: string;
  floorMin?: number;
  location?: string;
}

function inferCategorySlug(text: string): string {
  const t = text.toLowerCase();
  if (/آپارت|اپارت|مسکونی|\d+\s*خواب/.test(t) && /دفتر|وکالت|اداری/.test(t)) {
    return /فروش|می‌فروش|میفروش|عرضه/.test(t) ? 'apartment-sale' : 'apartment-rent';
  }
  if (/واحد\s*اداری|دفتر|اداری|وکالت/.test(t) && !/مزون|مغازه|غرفه|ویترین/.test(t)) {
    return /فروش|می‌فروش|میفروش|عرضه/.test(t) ? 'office-sale' : 'office-rent';
  }
  if (/مزون|مغازه|غرفه|ویترین|پاساژ/.test(t)) {
    return /فروش|می‌فروش|میفروش|عرضه/.test(t) ? 'shop-sale' : 'shop-rent';
  }
  if (/انبار|سوله/.test(t)) {
    return /فروش|می‌فروش|میفروش|عرضه/.test(t) ? 'industrial-sale' : 'industrial-rent';
  }
  if (/انباری/.test(t)) {
    return /فروش|می‌فروش|میفروش|عرضه/.test(t) ? 'apartment-sale' : 'apartment-rent';
  }
  if (/دفتر|اداری|وکالت/.test(t)) {
    return /فروش|می‌فروش|میفروش|عرضه/.test(t) ? 'office-sale' : 'office-rent';
  }
  if (/خرید|می‌خو(?:ام|رم|ند)|می‌خر/.test(t)) {
    if (/زمین|کلنگی/.test(t)) return 'land-sale';
    if (/ویلا|خانه|خونه/.test(t)) return 'villa-sale';
    if (/مزون|مغازه|غرفه/.test(t)) return 'shop-sale';
    if (/دفتر|اداری/.test(t)) return 'office-sale';
    return 'apartment-sale';
  }
  if (/فروش|می‌فروش|میفروش|عرضه/.test(t)) {
    if (/زمین|کلنگی/.test(t)) return 'land-sale';
    if (/ویلا|خانه|خونه/.test(t)) return 'villa-sale';
    return 'apartment-sale';
  }
  if (/زمین|کلنگی/.test(t)) {
    if (/رهن|ودیعه|اجاره|مستاجر|رنت/.test(t)) return 'land-rent';
    return 'land-sale';
  }
  if (/رهن|ودیعه|اجاره|مستاجر|رنت/.test(t)) {
    if (/کوتاه|روزانه|هفتگی/.test(t)) return 'suite-apartment-rent';
    if (/ویلا|خانه|خونه/.test(t)) return 'villa-rent';
    if (/صنعتی/.test(t)) return 'industrial-rent';
    if (/آپارت|اپارت|مسکونی|\d+\s*خواب/.test(t)) return 'apartment-rent';
    return 'apartment-rent';
  }
  if (/لازم\s*دار|نیاز\s*دار|دنبال|می‌خو(?:ام|واه|رم)/.test(t)) {
    if (/ویلا|خانه|خونه/.test(t)) return 'villa-sale';
    if (/مزون|مغازه|غرفه/.test(t)) return 'shop-rent';
    if (/دفتر|اداری/.test(t)) return 'office-rent';
    if (/آپارت|اپارت|مسکونی|\d+\s*خواب/.test(t)) return 'apartment-rent';
    return 'apartment-rent';
  }
  if (/صنعتی/.test(t)) return 'industrial-rent';
  return 'residential-rent';
}

function inferPropertyKind(text: string, categorySlug: string): string | undefined {
  if (/آپارت|اپارت|مسکونی|\d+\s*خواب/.test(text) && /دفتر|وکالت|اداری/.test(text)) {
    return 'apartment';
  }
  if (/واحد\s*اداری|دفتر|اداری|وکالت/.test(text) && !/مزون|مغازه|غرفه|ویترین/.test(text)) {
    return 'office';
  }
  if (/مزون|مغازه|غرفه|ویترین|پاساژ/.test(text)) return 'shop';
  if (/انباری/.test(text)) return 'apartment';
  if (/انبار|سوله|صنعتی/.test(text)) return 'industrial';
  if (/دفتر|اداری/.test(text)) return 'office';
  if (/ویلا|خانه|خونه/.test(text)) return 'villa';
  if (/زمین|کلنگی/.test(text)) return 'land';
  if (/صنعتی/.test(text)) return 'industrial';
  if (categorySlug.includes('shop')) return 'shop';
  if (categorySlug.includes('office')) return 'office';
  if (/آپارت|اپارت|واحد|مسکونی|خواب/.test(text)) return 'apartment';
  return undefined;
}

function inferLocationHint(text: string): string | undefined {
  const cityMatch = text.match(
    /(?:در|تو|توی)\s+([\u0600-\u06FF\s]+?(?:مشهد|تهران|اصفهان|شیراز|تبریز|کرج|اهواز))/i
  );
  const parts: string[] = [];
  const neighborhoods = text.match(
    /(?:فردوس|سعادت|ولنجک|نیاوران|ریس|آباد|محله|منطقه|خیابان|خیابون)\s*[\u0600-\u06FF\s]*/gi
  );
  if (neighborhoods?.length) {
    for (const n of neighborhoods) {
      const p = n.trim();
      if (p.length > 2) parts.push(p);
    }
  }
  if (/مشهد/.test(text)) parts.push('مشهد');
  if (/تهران/.test(text)) parts.push('تهران');
  if (parts.length >= 2) return [...new Set(parts)].join('، ');
  if (parts.length === 1 && /مشهد|تهران/.test(text)) {
    return `${parts[0]}، ${text.includes('مشهد') ? 'مشهد' : 'تهران'}`;
  }
  if (cityMatch) return cityMatch[1].trim();
  return undefined;
}

function slugSpecificity(slug: string): number {
  if (/^(shop|office)-(rent|sale)$/.test(slug)) return 4;
  if (/^(apartment|villa|land|industrial|suite|workspace)-/.test(slug)) return 3;
  if (slug === 'residential-rent' || slug === 'residential-sale') return 1;
  if (slug === 'general') return 0;
  return 2;
}

/** Nudge parser output toward real-estate when v2 chat signals property need. */
export function coerceRealEstateParse(
  parsed: ParsedIntent,
  rawText: string
): ParsedIntent {
  if (!REAL_ESTATE_SIGNAL.test(rawText) && !isRealEstateIntent(parsed)) {
    return parsed;
  }

  const inferred = inferCategorySlug(rawText);
  const parsedSlug =
    isRealEstateIntent(parsed) && parsed.categorySlug !== 'general'
      ? parsed.categorySlug
      : null;
  const categorySlug =
    slugSpecificity(inferred) >= slugSpecificity(parsedSlug ?? '')
      ? inferred
      : (parsedSlug ?? inferred);

  const propertyKind = inferPropertyKind(rawText, categorySlug);
  const entities = { ...parsed.entities };
  if (propertyKind) entities.propertyKind = propertyKind;

  if (categorySlug.endsWith('-rent') && !entities.dealType) {
    entities.dealType = 'rent_monthly';
  }
  if (categorySlug.endsWith('-sale') && !entities.dealType) {
    entities.dealType = /فروش|می‌فروش/.test(rawText) ? 'sell' : 'buy';
  }

  return {
    ...parsed,
    intentType: 'property_search',
    categorySlug,
    confidence: Math.max(parsed.confidence, 0.72),
    entities,
  };
}

/** Extra answer hints from coerce (floor, location). */
export function extractCoerceHints(rawText: string): CoerceHints {
  const hints: CoerceHints = {};
  const categorySlug = inferCategorySlug(rawText);
  const kind = inferPropertyKind(rawText, categorySlug);
  if (kind) hints.propertyKind = kind;

  if (categorySlug.endsWith('-rent')) {
    if (/رهن\s*و\s*اجاره|ودیعه\s*و\s*اجاره/.test(rawText)) {
      hints.dealType = 'rent_rahn_ejare';
    } else if (/رهن\s*کامل/.test(rawText)) {
      hints.dealType = 'rent_rahn_full';
    } else if (/اجاره|مستاجر|رنت/.test(rawText)) {
      hints.dealType = 'rent_monthly';
    } else if (/برای\s*دانشجو|دانشجویی|سکونت\s*دانشجو/.test(rawText)) {
      hints.dealType = 'rent_monthly';
    }
  }
  if (categorySlug.endsWith('-sale')) {
    hints.dealType = /فروش|می‌فروش|میفروش|عرضه/.test(rawText) ? 'sell' : 'buy';
  }
  if (/همکف|هم\s*کف|طبقه\s*۰|طبقه\s*0|زیرین/.test(rawText)) {
    hints.floorMin = 0;
  }

  const loc = inferLocationHint(rawText);
  if (loc) hints.location = loc;

  return hints;
}
