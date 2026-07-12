/**
 * Smart Field Extractor - سیستم هوشمند استخراج کامل فیلدها
 * ترکیب Rules و AI برای استخراج دقیق و سریع تمام فیلدهای نیاز
 */

import { normalizePersian } from '@/intake/normalizer/normalizePersian';
import { extractArea, extractBudget, extractRooms } from '@/intake/extractors/attributeExtractors';
import { extractTransactionType } from '@/intake/extractors/transactionExtractor';
import { applyAdvancedRules } from '@/intake/smart-extractor/rules/advanced-rules-engine';
import type {
  SmartExtractionOptions,
  SmartExtractionResult,
} from '@/intake/smart-extractor/types';
import {
  detectBusinessCommercialCategory,
  isBusinessCommercialPropertyIntent,
} from '@/lib/need-intake/business-commercial-property-intent';

export type { SmartExtractionOptions, SmartExtractionResult } from '@/intake/smart-extractor/types';

/**
 * استخراج هوشمند و کامل تمام فیلدها از متن نیاز
 */
export async function extractSmartFields(
  needText: string,
  detailsText: string = '',
  options: SmartExtractionOptions = {}
): Promise<SmartExtractionResult> {
  const startTime = Date.now();

  // ترکیب متن‌ها
  const fullText = composeFullText(needText, detailsText);
  const normalizedText = normalizePersian(fullText);

  // نتیجه نهایی
  const result: SmartExtractionResult = {
    category: { value: null, subcategory: null, confidence: 0 },
    location: { city: null, citySlug: null, neighborhood: null, neighborhoodSlug: null, confidence: 0 },
    transaction: { type: null, confidence: 0 },
    budget: { min: null, max: null, confidence: 0 },
    property: { area: null, rooms: null, confidence: 0 },
    metadata: {},
    validation: { isComplete: false, missingFields: [], warnings: [], suggestions: [] },
    trace: { rulesUsed: [], aiCalled: false, extractionTime: 0 }
  };

  // مرحله 1: استخراج با Rules (سریع)
  if (options.useRules !== false) {
    await extractWithRules(normalizedText, fullText, result, options);
  }

  // مرحله 2: تکمیل با AI (برای فیلدهای missing یا ambiguous)
  if (options.useAI !== false && shouldUseAI(result, options)) {
    await enhanceWithAI(fullText, result, options);
    result.trace!.aiCalled = true;
  }

  // مرحله 3: Location disambiguation (managed catalog + OSM) when neighborhood extracted
  // Preserve multi-mention neighborhoods (e.g. فردوسی + امام رضا + ابن سینا) across disambig overwrite.
  const priorMentions = [...(result.location.alternatives ?? [])];
  if (result.location.neighborhood && (options.preferredCity || options.preferredCitySlug)) {
    await disambiguateLocation(result, options, fullText);
  }
  if (priorMentions.length > 0) {
    const seen = new Set(
      (result.location.alternatives ?? []).map((a) => a.neighborhood)
    );
    if (result.location.neighborhood) seen.add(result.location.neighborhood);
    const merged = [...(result.location.alternatives ?? [])];
    for (const m of priorMentions) {
      if (!seen.has(m.neighborhood)) {
        merged.push(m);
        seen.add(m.neighborhood);
      }
    }
    result.location.alternatives = merged;
    if (merged.length > 1) result.location.disambiguationNeeded = true;
  }

  // مرحله 4: تشخیص نوع معامله از مبالغ
  inferTransactionFromBudget(result);
  syncCategoryWithTransaction(result);

  // مرحله 5: Generate title و description
  generateMetadata(result, fullText);

  // مرحله 6: Validation
  validateAndSuggest(result);

  result.trace!.extractionTime = Date.now() - startTime;

  return result;
}

/**
 * استخراج با Rules
 */
async function extractWithRules(
  normalizedText: string,
  originalText: string,
  result: SmartExtractionResult,
  options: SmartExtractionOptions
): Promise<void> {
  // Advanced rules (Claude Step 2) — deposit/rent, full deposit, neighborhood, area, rooms, floor, amenities
  const advanced = applyAdvancedRules(normalizedText);
  const { patch } = advanced;
  result.trace!.rulesUsed.push(...advanced.rulesUsed);

  if (patch.depositAmount != null) result.budget.depositAmount = patch.depositAmount;
  if (patch.rentAmount != null) result.budget.rentAmount = patch.rentAmount;
  if (patch.depositMin != null) result.budget.depositMin = patch.depositMin;
  if (patch.depositMax != null) result.budget.depositMax = patch.depositMax;
  if (patch.rentMin != null) result.budget.rentMin = patch.rentMin;
  if (patch.rentMax != null) result.budget.rentMax = patch.rentMax;
  if (patch.transactionType) {
    result.transaction.type = patch.transactionType;
    result.transaction.confidence = Math.max(
      result.transaction.confidence,
      advanced.confidenceByField.transaction ?? advanced.confidenceByField.budget ?? 0.9
    );
  }
  if (patch.categorySlug) {
    result.category.value = patch.categorySlug;
    result.category.subcategory = patch.categorySlug;
    result.category.confidence = Math.max(result.category.confidence, 0.9);
  }
  if (patch.neighborhood) {
    result.location.neighborhood = patch.neighborhood;
    result.location.disambiguationNeeded = patch.needsDisambiguation ?? true;
    result.location.confidence = Math.max(
      result.location.confidence,
      advanced.confidenceByField.location ?? 0.8
    );
  }
  if (patch.area != null) {
    result.property.area = patch.area;
    result.property.confidence = Math.max(
      result.property.confidence,
      advanced.confidenceByField.property ?? 0.9
    );
  }
  if (patch.rooms != null) {
    result.property.rooms = patch.rooms;
    result.property.confidence = Math.max(result.property.confidence, 0.9);
  }
  if (patch.floor != null) result.property.floor = patch.floor;
  if (patch.totalFloors != null) result.property.totalFloors = patch.totalFloors;
  if (patch.hasParking) result.property.hasParking = true;
  if (patch.hasElevator) result.property.hasElevator = true;
  if (patch.hasStorage) result.property.hasStorage = true;

  // Collect multiple mentioned neighborhoods (Batch2: فردوسی + امام رضا + ابن سینا)
  const MULTI_HOODS = [
    'سجاد',
    'احمدآباد',
    'وکیل آباد',
    'کوهسنگی',
    'قاسم آباد',
    'الهیه',
    'نیاوران',
    'ونک',
    'جردن',
    'زعفرانیه',
    'پاسداران',
    'فرمانیه',
    'تجریش',
    'سعادت آباد',
    'شهرک غرب',
    'فردوسی',
    'بنفشه',
    'خیام',
    'امامت',
    'امام رضا',
    'ابن سینا',
    'حرم',
  ];
  const mentioned = MULTI_HOODS.filter((h) => normalizedText.includes(h.replace(/\s+/g, ' ')));
  if (mentioned.length > 0) {
    if (!result.location.neighborhood) {
      result.location.neighborhood = mentioned[0]!;
      result.location.disambiguationNeeded = mentioned.length > 1;
      result.location.confidence = Math.max(result.location.confidence, 0.8);
    }
    const primary = result.location.neighborhood;
    const extras = mentioned.filter((h) => h !== primary);
    if (extras.length > 0) {
      result.location.disambiguationNeeded = true;
      const existing = new Set(
        (result.location.alternatives ?? []).map((a) => a.neighborhood)
      );
      result.location.alternatives = [
        ...(result.location.alternatives ?? []),
        ...extras
          .filter((h) => !existing.has(h))
          .map((h) => ({ neighborhood: h, neighborhoodSlug: h, landmarks: [] as string[] })),
      ];
    }
    result.trace!.rulesUsed.push('multi_neighborhood');
  }

  if (options.preferredCity && !result.location.city) {
    result.location.city = options.preferredCity;
    result.location.citySlug = options.preferredCitySlug ?? null;
    result.location.confidence = Math.max(result.location.confidence, 0.85);
  }

  // Legacy attribute extractors (fill gaps only)
  const areaResult = extractArea(normalizedText);
  if (areaResult.value && result.property.area == null) {
    result.property.area = areaResult.value;
    result.property.confidence = Math.max(result.property.confidence, areaResult.confidence);
    result.trace!.rulesUsed.push('area');
  }

  const roomsResult = extractRooms(normalizedText);
  if (roomsResult.value && result.property.rooms == null) {
    result.property.rooms = roomsResult.value;
    result.property.confidence = Math.max(result.property.confidence, roomsResult.confidence);
    result.trace!.rulesUsed.push('rooms');
  }

  const budgetResult = extractBudget(normalizedText);
  if (budgetResult.min !== null || budgetResult.max !== null) {
    if (result.budget.min == null) result.budget.min = budgetResult.min;
    if (result.budget.max == null) result.budget.max = budgetResult.max;
    result.budget.confidence = Math.max(result.budget.confidence, budgetResult.confidence);
    result.trace!.rulesUsed.push('budget');
  }

  const transactionResult = extractTransactionType(normalizedText);
  if (transactionResult && !result.transaction.type) {
    result.transaction.type = transactionResult.type;
    result.transaction.confidence = transactionResult.confidence;
    result.trace!.rulesUsed.push('transaction');
  }

  if (normalizedText.includes('پارکینگ') && !result.property.hasParking) {
    result.property.hasParking = true;
    result.trace!.rulesUsed.push('parking');
  }
  if (
    (normalizedText.includes('آسانسور') || normalizedText.includes('آسانسر')) &&
    !result.property.hasElevator
  ) {
    result.property.hasElevator = true;
    result.trace!.rulesUsed.push('elevator');
  }
  if (normalizedText.includes('انباری') && !result.property.hasStorage) {
    result.property.hasStorage = true;
    result.trace!.rulesUsed.push('storage');
  }

  const floorPattern = /طبقه\s*(\d+)/u;
  const floorMatch = normalizedText.match(floorPattern);
  if (floorMatch && result.property.floor == null) {
    result.property.floor = parseInt(floorMatch[1]!, 10);
    result.trace!.rulesUsed.push('floor');
  }

  const agePattern = /(\d+)\s*سال?\s*(?:ساخت|ساختمان|بنا)/u;
  const ageMatch = normalizedText.match(agePattern);
  if (ageMatch) {
    result.property.age = parseInt(ageMatch[1]!, 10);
    result.trace!.rulesUsed.push('age');
  }

  if (normalizedText.includes('فوری') || normalizedText.includes('عجله') || normalizedText.includes('فوریه')) {
    result.metadata.urgency = 'immediate';
    result.trace!.rulesUsed.push('urgency');
  } else if (normalizedText.includes('این هفته')) {
    result.metadata.urgency = 'this_week';
  } else if (
    normalizedText.includes('این ماه') ||
    normalizedText.includes('ماه جاری') ||
    /تا\s*آخر\s*تیر/u.test(normalizedText) ||
    /تا\s*آخر\s*(?:فروردین|اردیبهشت|خرداد|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند)/u.test(
      normalizedText
    )
  ) {
    result.metadata.urgency = 'this_month';
    result.trace!.rulesUsed.push('urgency_deadline_month');
  }

  // Category hints — services before real-estate (آپارتمانم در متن سرویس نباید املاک شود)
  // Business/commercial use beats residential apartment (آپارتمان برای کسب‌وکار → تجاری)
  if (!result.category.value) {
    const isServiceIntent =
      /نظافت|سرویس\s|تعمیر|لوله‌کش|برقکار|نقاش(?:ی)?|باغبانی|قالیشویی|سم‌پاشی|سمپاشی/u.test(
        normalizedText
      );
    if (isServiceIntent) {
      if (/نظافت/u.test(normalizedText)) {
        result.category.value = 'services';
        result.category.subcategory = 'cleaning';
        result.category.confidence = 0.88;
      } else if (/تعمیر|لوله‌کش|برقکار/u.test(normalizedText)) {
        result.category.value = 'services';
        result.category.subcategory = null;
        result.category.confidence = 0.8;
      } else {
        result.category.value = 'services';
        result.category.subcategory = null;
        result.category.confidence = 0.75;
      }
      result.trace!.rulesUsed.push('category_hint_service');
    } else if (isBusinessCommercialPropertyIntent(normalizedText)) {
      const leaf = detectBusinessCommercialCategory(normalizedText);
      const isBuy =
        result.transaction.type === 'BUY' || result.transaction.type === 'SELL';
      if (leaf) {
        result.category.value = leaf.includes('sale')
          ? 'commercial-sale'
          : 'commercial-rent';
        result.category.subcategory = leaf;
      } else {
        result.category.value = isBuy ? 'commercial-sale' : 'commercial-rent';
        result.category.subcategory = null;
      }
      result.category.confidence = 0.86;
      result.trace!.rulesUsed.push('category_hint_commercial_business');
    } else if (/مغازه|تجاری|دفتر|اداری/u.test(normalizedText)) {
      result.category.value = 'commercial-rent';
      result.category.subcategory = null;
      if (result.transaction.type === 'BUY' || result.transaction.type === 'SELL') {
        result.category.value = 'commercial-sale';
      }
      result.category.confidence = 0.78;
      result.trace!.rulesUsed.push('category_hint_commercial');
    } else if (/آپارتمان|واحد|سوئیت|خوابه|\d+\s*خواب/u.test(normalizedText)) {
      result.category.value = 'residential-rent';
      result.category.subcategory = 'apartment-rent';
      if (result.transaction.type === 'BUY' || result.transaction.type === 'SELL') {
        result.category.value = 'residential-sale';
        result.category.subcategory = 'apartment-sale';
      }
      result.category.confidence = 0.72;
      result.trace!.rulesUsed.push('category_hint');
    } else if (/ویلا|باغ ویلا/u.test(normalizedText)) {
      result.category.value = 'residential-rent';
      result.category.subcategory = 'villa-rent';
      result.category.confidence = 0.7;
      result.trace!.rulesUsed.push('category_hint');
    }
  }

  // City from text when not preferred
  if (!result.location.city) {
    const cityMatch = normalizedText.match(/\b(مشهد|تهران|اصفهان|شیراز|کرج|تبریز|اهواز)\b/u);
    if (cityMatch) {
      result.location.city = cityMatch[1]!;
      result.location.confidence = Math.max(result.location.confidence, 0.9);
      result.trace!.rulesUsed.push('city_from_text');
    }
  }

  void originalText;
}

/**
 * تکمیل با AI
 */
async function enhanceWithAI(
  text: string,
  result: SmartExtractionResult,
  options: SmartExtractionOptions
): Promise<void> {
  try {
    const { runIntakeIntelligence } = await import(
      '@/intake/intelligence-engine/orchestrator'
    );
    const aiResult = await runIntakeIntelligence(
      {
        text,
        citySlug: options.preferredCitySlug,
        cityName: options.preferredCity,
        formHints: options.formHints as never,
        forceAi: false,
      },
      {
        skipCache: options.realTime,
      }
    );

    if (aiResult.fields) {
      if (!result.category.value && aiResult.fields.categorySlug) {
        result.category.value = aiResult.fields.categorySlug.value;
        result.category.confidence = aiResult.fields.categorySlug.confidence || 0.8;

        if (aiResult.categoryOptions) {
          result.category.alternatives = aiResult.categoryOptions.map((opt) => ({
            slug: opt.slug,
            label: opt.label,
            confidence: opt.confidence || 0.5,
          }));
        }
      }

      if (aiResult.fields.city?.value && !result.location.city) {
        result.location.city = aiResult.fields.city.value;
        result.location.citySlug = aiResult.fields.citySlug?.value || null;
        result.location.confidence = aiResult.fields.city.confidence || 0.8;
      }

      if (aiResult.fields.neighborhood?.value) {
        result.location.neighborhood = aiResult.fields.neighborhood.value;
        result.location.neighborhoodSlug = aiResult.fields.neighborhoodSlug?.value || null;
      }
    }
  } catch (error) {
    console.error('AI enhancement failed:', error);
  }
}

async function disambiguateLocation(
  result: SmartExtractionResult,
  options: SmartExtractionOptions,
  rawText: string
): Promise<void> {
  if (!result.location.neighborhood) return;

  try {
    const { disambiguateNeighborhoodWithCatalog } = await import(
      '@/intake/smart-extractor/disambiguation/neighborhood-disambiguator'
    );
    const disambig = await disambiguateNeighborhoodWithCatalog({
      phrase: result.location.neighborhood,
      rawText,
      cityName: options.preferredCity ?? result.location.city,
      citySlug: options.preferredCitySlug ?? result.location.citySlug,
    });

    result.trace!.rulesUsed.push('neighborhood_disambiguator');

    if (disambig.needsDisambiguation) {
      result.location.disambiguationNeeded = true;
      const phrase = result.location.neighborhood;
      result.location.alternatives = disambig.candidates
        .filter((c) => isRelatedNeighborhoodName(phrase, c.name))
        .map((c) => ({
          neighborhood: c.name,
          neighborhoodSlug: c.id,
          district: c.context,
          landmarks: [],
        }));
      return;
    }

    if (disambig.selectedName) {
      result.location.neighborhood = disambig.selectedName;
      result.location.neighborhoodSlug = disambig.selectedId ?? null;
      result.location.disambiguationNeeded = false;
      result.location.confidence = Math.max(result.location.confidence, 0.9);
      if (disambig.candidates.length > 1) {
        result.location.alternatives = disambig.candidates.map((c) => ({
          neighborhood: c.name,
          neighborhoodSlug: c.id,
          district: c.context,
          landmarks: [],
        }));
      }
      return;
    }

    // Fallback: previous LRE bridge when catalog path finds nothing
    if (options.useAI === false) return;
    const { resolveLocationViaLre } = await import(
      '@/intake/intelligence-engine/resolvers/location-lre-bridge'
    );
    const query = result.location.neighborhood;
    const locationResult = await resolveLocationViaLre(query, query, {
      text: query,
      citySlug: options.preferredCitySlug,
      cityName: options.preferredCity,
    });

    const candidates = locationResult.candidates ?? [];
    if (candidates.length > 1) {
      result.location.disambiguationNeeded = true;
      result.location.alternatives = candidates.map((n) => ({
        neighborhood: n.label,
        neighborhoodSlug: n.slug,
        district: n.city,
        landmarks: [],
      }));
    } else if (candidates.length === 1) {
      result.location.neighborhoodSlug = candidates[0]!.slug;
      result.location.neighborhood = candidates[0]!.label;
      result.location.confidence = 0.9;
      result.location.disambiguationNeeded = false;
    }
  } catch (error) {
    console.error('Location disambiguation failed:', error);
  }
}

function isRelatedNeighborhoodName(phrase: string, name: string): boolean {
  const p = phrase.replace(/[\s‌\-]/gu, '');
  const n = name.replace(/[\s‌\-]/gu, '');
  if (!p || !n) return false;
  if (n === p) return true;
  if (n.startsWith(p) || p.startsWith(n)) return true;
  // «ده‌ونک» for «ونک» — short known prefix only (not «پونک»)
  if (n.endsWith(p)) {
    const prefix = n.slice(0, n.length - p.length);
    if (/^(ده|شهرک|بلوار|میدان|خیابان)$/u.test(prefix)) return true;
  }
  return false;
}

function isRealEstateCategory(result: SmartExtractionResult): boolean {
  const v = `${result.category.value ?? ''}|${result.category.subcategory ?? ''}`;
  return /rent|sale|apartment|villa|land|commercial|real-estate/i.test(v);
}

function isServiceCategory(result: SmartExtractionResult): boolean {
  const v = `${result.category.value ?? ''}|${result.category.subcategory ?? ''}`;
  // pre-sale-services / agency-services are estate leaves, not cleaning-style SERVICE
  if (/pre-sale|presale|agency-services|construction/i.test(v)) return false;
  return /service|cleaning|repair/i.test(v);
}

/**
 * تشخیص نوع معامله از مبالغ
 */
function isBuyOrSell(type: string | null | undefined): boolean {
  return type === 'BUY' || type === 'SELL';
}

/** Remap apartment/villa category after final transaction type (Batch 8 rent→buy). */
function syncCategoryWithTransaction(result: SmartExtractionResult): void {
  const sub = result.category.subcategory ?? '';
  const val = result.category.value ?? '';
  if (!val && !sub) return;

  // Explicit service leaves (پیش‌فروش) must not collapse to apartment-sale (Batch 9).
  if (/pre-sale|presale|agency-services|construction/i.test(`${val}|${sub}`)) {
    return;
  }

  if (result.transaction.type === 'BUY' || result.transaction.type === 'SELL') {
    if (/rent/i.test(val) || /rent/i.test(sub)) {
      result.category.value = val.replace(/rent/gi, 'sale') || 'residential-sale';
      if (sub) {
        result.category.subcategory = sub.replace(/rent/gi, 'sale');
      }
      result.trace?.rulesUsed.push('category_sync_buy');
    }
  } else if (
    result.transaction.type === 'RENT' ||
    result.transaction.type === 'DEPOSIT_AND_RENT' ||
    result.transaction.type === 'FULL_DEPOSIT'
  ) {
    if (/sale/i.test(val) || /sale/i.test(sub)) {
      result.category.value = val.replace(/sale/gi, 'rent') || 'residential-rent';
      if (sub) {
        result.category.subcategory = sub.replace(/sale/gi, 'rent');
      }
      result.trace?.rulesUsed.push('category_sync_rent');
    }
  }
}

function inferTransactionFromBudget(result: SmartExtractionResult): void {
  if (isServiceCategory(result)) {
    if (!result.transaction.type) {
      result.transaction.type = 'SERVICE';
      result.transaction.confidence = Math.max(result.transaction.confidence, 0.85);
    }
    return;
  }

  // Buy/sell override: keep BUY even if earlier رهن+اجاره amounts remain in text.
  if (isBuyOrSell(result.transaction.type)) {
    result.budget.depositAmount = null;
    result.budget.rentAmount = null;
    if (result.transaction.type === 'BUY') {
      result.transaction.dealType = 'sale';
    }
    return;
  }

  // اگر هم رهن و هم اجاره داریم
  if (result.budget.depositAmount && result.budget.rentAmount) {
    result.transaction.type = 'DEPOSIT_AND_RENT';
    result.transaction.dealType = 'rent';
    result.transaction.confidence = 0.95;
    return;
  }

  // رهن بدون اجاره — اگر rules قبلاً FULL_DEPOSIT نگذاشته، از مبلغ استنتاج کن
  if (result.budget.depositAmount && !result.budget.rentAmount) {
    if (!result.transaction.type || result.transaction.type === 'RENT') {
      result.transaction.type = 'FULL_DEPOSIT';
      result.transaction.dealType = 'full-mortgage';
      result.transaction.confidence = Math.max(result.transaction.confidence, 0.85);
    }
    return;
  }

  // FULL_DEPOSIT از transaction extractor بدون depositAmount (مثلاً «رهن کامل حدود …»)
  if (
    result.transaction.type === 'FULL_DEPOSIT' &&
    result.budget.depositAmount == null &&
    (result.budget.max != null || result.budget.min != null)
  ) {
    result.budget.depositAmount = result.budget.max ?? result.budget.min ?? null;
  }

  // Magnitude → BUY/RENT فقط برای املاک (وگرنه سرویس/کالا اشتباه می‌شود)
  if (!result.transaction.type && result.budget.max && isRealEstateCategory(result)) {
    if (result.budget.max < 100_000_000) {
      result.transaction.type = 'RENT';
      result.transaction.dealType = 'rent';
      result.transaction.confidence = 0.7;
    } else {
      result.transaction.type = 'BUY';
      result.transaction.dealType = 'sale';
      result.transaction.confidence = 0.7;
    }
  }

  // اجاره ماهانه: اگر RENT است و deposit نداریم، max بودجه = rentAmount
  if (
    result.transaction.type === 'RENT' &&
    result.budget.rentAmount == null &&
    result.budget.max != null &&
    result.budget.depositAmount == null
  ) {
    result.budget.rentAmount = result.budget.max;
  }
}

/**
 * تولید متادیتا
 */
function generateMetadata(result: SmartExtractionResult, originalText: string): void {
  // تولید عنوان
  const titleParts = [];

  if (result.transaction.type === 'BUY') titleParts.push('خرید');
  else if (result.transaction.type === 'SELL') titleParts.push('فروش');
  else if (result.transaction.type === 'RENT' || result.transaction.type === 'DEPOSIT_AND_RENT') titleParts.push('اجاره');
  else if (result.transaction.type === 'FULL_DEPOSIT') titleParts.push('رهن کامل');
  else if (result.transaction.type === 'SERVICE') titleParts.push('درخواست خدمت');

  if (result.category.subcategory) {
    titleParts.push(getCategoryLabel(result.category.subcategory));
  } else if (result.category.value) {
    titleParts.push(getCategoryLabel(result.category.value));
  }

  if (result.property.rooms) {
    titleParts.push(`${result.property.rooms} خواب`);
  }

  if (result.property.area) {
    titleParts.push(`${result.property.area} متر`);
  }

  if (result.location.neighborhood) {
    titleParts.push(`در ${result.location.neighborhood}`);
  } else if (result.location.city) {
    titleParts.push(`در ${result.location.city}`);
  }

  if (titleParts.length > 0) {
    result.metadata.needTitle = titleParts.join(' ');
  }

  // کپی توضیحات اصلی
  result.metadata.needDescription = originalText;
}

/**
 * اعتبارسنجی و پیشنهادات
 */
function validateAndSuggest(result: SmartExtractionResult): void {
  const missingFields = [];
  const warnings = [];
  const suggestions = [];

  // بررسی فیلدهای ضروری
  if (!result.category.value) {
    missingFields.push('دسته‌بندی');
    suggestions.push('لطفا نوع ملک را مشخص کنید (آپارتمان، ویلا، مغازه، ...)');
  }

  if (!result.location.city) {
    missingFields.push('شهر');
    suggestions.push('لطفا شهر مورد نظر را انتخاب کنید');
  }

  if (!result.transaction.type) {
    missingFields.push('نوع معامله');
    suggestions.push('آیا قصد خرید، فروش یا اجاره دارید؟');
  }

  // هشدارها
  if (result.location.disambiguationNeeded) {
    warnings.push('چند محله با این نام پیدا شد، لطفا محله دقیق را انتخاب کنید');
  }

  if (result.budget.confidence < 0.7 && result.budget.max) {
    warnings.push('بودجه تشخیص داده شده ممکن است دقیق نباشد');
  }

  // پیشنهادات بهبود
  if (!result.property.area && isPropertyCategory(result.category.value)) {
    suggestions.push('ذکر متراژ به یافتن نتایج بهتر کمک می‌کند');
  }

  if (!result.budget.max) {
    suggestions.push('ذکر بودجه به یافتن گزینه‌های مناسب کمک می‌کند');
  }

  result.validation = {
    isComplete: missingFields.length === 0,
    missingFields,
    warnings,
    suggestions
  };
}

// Helper functions

function composeFullText(needText: string, detailsText: string): string {
  const need = needText.trim();
  const details = detailsText.trim();
  if (!details) return need;
  if (!need) return details;
  return `${need}\n${details}`;
}

function shouldUseAI(result: SmartExtractionResult, options: SmartExtractionOptions): boolean {
  // اگر real-time است و فیلدهای اصلی پر شده، AI نمی‌خواهیم
  if (options.realTime && result.category.value && result.location.city) {
    return false;
  }

  // اگر فیلدهای مهم missing هستند، AI لازم است
  return !result.category.value || !result.location.city || result.location.disambiguationNeeded;
}

function getCategoryLabel(slug: string): string {
  // این باید از config خوانده شود
  const labels: Record<string, string> = {
    'apartment-sale': 'آپارتمان',
    'apartment-rent': 'آپارتمان',
    villa: 'ویلا',
    land: 'زمین',
    shop: 'مغازه',
    office: 'دفتر',
    warehouse: 'انبار',
    cleaning: 'نظافت',
    services: 'خدمات',
  };
  return labels[slug] || slug;
}

function isPropertyCategory(category: string | null): boolean {
  if (!category) return false;
  const propertyCategories = ['apartment-sale', 'apartment-rent', 'villa', 'land', 'shop', 'office'];
  return propertyCategories.includes(category);
}

// Export for testing
export const __testing = {
  extractWithRules,
  enhanceWithAI,
  disambiguateLocation,
  inferTransactionFromBudget,
  generateMetadata,
  validateAndSuggest
};