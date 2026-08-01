/**
 * Smart Field Extractor - سیستم هوشمند استخراج کامل فیلدها
 * ترکیب Rules و AI برای استخراج دقیق و سریع تمام فیلدهای نیاز
 */

import type { NeedDraft, ParsedIntent } from '@/contracts/need-intake';
import { normalizePersian } from '@/intake/normalizer/normalizePersian';
import { extractArea, extractBudget, extractRooms } from '@/intake/extractors/attributeExtractors';
import { extractTransactionType } from '@/intake/extractors/transactionExtractor';
import { runIntakeIntelligence } from '@/intake/intelligence-engine/orchestrator';
import { resolveLocationViaLre } from '@/intake/intelligence-engine/resolvers/location-lre-bridge';
import { runCategoryIntentEngine } from '@/intake/intelligence-engine/category/category-intent-engine';

export interface SmartExtractionResult {
  // فیلدهای اصلی
  category: {
    value: string | null;
    subcategory: string | null;
    confidence: number;
    alternatives?: Array<{ slug: string; label: string; confidence: number }>;
  };

  location: {
    city: string | null;
    citySlug: string | null;
    neighborhood: string | null;
    neighborhoodSlug: string | null;
    confidence: number;
    // برای محله‌های مشابه
    disambiguationNeeded?: boolean;
    alternatives?: Array<{
      neighborhood: string;
      neighborhoodSlug: string;
      district?: string;
      landmarks?: string[];
    }>;
  };

  transaction: {
    type: 'BUY' | 'SELL' | 'RENT' | 'DEPOSIT_AND_RENT' | 'FULL_DEPOSIT' | 'DAILY_RENT' | 'HOURLY_RENT' | null;
    dealType?: 'sale' | 'rent' | 'full-mortgage';
    confidence: number;
  };

  budget: {
    min: number | null;
    max: number | null;
    depositAmount?: number | null;  // برای رهن
    rentAmount?: number | null;     // برای اجاره ماهانه
    confidence: number;
  };

  property: {
    area: number | null;        // متراژ
    rooms: number | null;       // تعداد خواب
    hasParking?: boolean;
    hasElevator?: boolean;
    hasStorage?: boolean;
    floor?: number | null;
    totalFloors?: number | null;
    age?: number | null;        // سن بنا
    confidence: number;
  };

  // متادیتا
  metadata: {
    needTitle?: string;         // عنوان پیشنهادی برای آگهی
    needDescription?: string;   // توضیحات کامل‌تر
    urgency?: 'immediate' | 'this_week' | 'this_month' | 'flexible';
    contactPreference?: 'phone' | 'chat' | 'both';
  };

  // وضعیت و اعتبارسنجی
  validation: {
    isComplete: boolean;
    missingFields: string[];
    warnings: string[];
    suggestions: string[];
  };

  // Trace برای debugging
  trace?: {
    rulesUsed: string[];
    aiCalled: boolean;
    extractionTime: number;
  };
}

export interface SmartExtractionOptions {
  // Context
  preferredCity?: string;      // شهر انتخابی کاربر
  preferredCitySlug?: string;
  sessionHistory?: string[];   // تاریخچه جستجوهای قبلی کاربر

  // Feature flags
  useAI?: boolean;             // استفاده از AI (default: true)
  useRules?: boolean;          // استفاده از Rules (default: true)
  realTime?: boolean;          // برای real-time extraction (سریع‌تر اما کمتر دقیق)

  // Hints
  formHints?: Record<string, any>;
}

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

  // مرحله 3: Location disambiguation با توجه به context
  if (result.location.neighborhood && options.preferredCity) {
    await disambiguateLocation(result, options);
  }

  // مرحله 4: تشخیص نوع معامله از مبالغ
  inferTransactionFromBudget(result);

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
  // استخراج متراژ
  const areaResult = extractArea(normalizedText);
  if (areaResult.value) {
    result.property.area = areaResult.value;
    result.property.confidence = Math.max(result.property.confidence, areaResult.confidence);
    result.trace!.rulesUsed.push('area');
  }

  // استخراج تعداد خواب
  const roomsResult = extractRooms(normalizedText);
  if (roomsResult.value) {
    result.property.rooms = roomsResult.value;
    result.property.confidence = Math.max(result.property.confidence, roomsResult.confidence);
    result.trace!.rulesUsed.push('rooms');
  }

  // استخراج بودجه
  const budgetResult = extractBudget(normalizedText);
  if (budgetResult.min !== null || budgetResult.max !== null) {
    result.budget.min = budgetResult.min;
    result.budget.max = budgetResult.max;
    result.budget.confidence = budgetResult.confidence;
    result.trace!.rulesUsed.push('budget');

    // تشخیص رهن و اجاره از pattern
    const depositRentPattern = /(\d+(?:\.\d+)?)\s*(?:میلیون|میلیارد)\s*رهن.*?(\d+(?:\.\d+)?)\s*(?:میلیون|تومان|تومن)\s*اجاره/u;
    const match = normalizedText.match(depositRentPattern);
    if (match) {
      const deposit = parseAmount(match[1], normalizedText.includes('میلیارد') ? 'billion' : 'million');
      const rent = parseAmount(match[2], 'million');
      result.budget.depositAmount = deposit;
      result.budget.rentAmount = rent;
      result.transaction.type = 'DEPOSIT_AND_RENT';
      result.transaction.confidence = 0.95;
      result.trace!.rulesUsed.push('deposit_rent_pattern');
    }
  }

  // استخراج نوع معامله
  const transactionResult = extractTransactionType(normalizedText);
  if (transactionResult && !result.transaction.type) {
    result.transaction.type = transactionResult.type;
    result.transaction.confidence = transactionResult.confidence;
    result.trace!.rulesUsed.push('transaction');
  }

  // استخراج features
  if (normalizedText.includes('پارکینگ')) {
    result.property.hasParking = true;
    result.trace!.rulesUsed.push('parking');
  }
  if (normalizedText.includes('آسانسور') || normalizedText.includes('آسانسر')) {
    result.property.hasElevator = true;
    result.trace!.rulesUsed.push('elevator');
  }
  if (normalizedText.includes('انباری')) {
    result.property.hasStorage = true;
    result.trace!.rulesUsed.push('storage');
  }

  // استخراج طبقه
  const floorPattern = /طبقه\s*(\d+)/u;
  const floorMatch = normalizedText.match(floorPattern);
  if (floorMatch) {
    result.property.floor = parseInt(floorMatch[1]);
    result.trace!.rulesUsed.push('floor');
  }

  // استخراج سن بنا
  const agePattern = /(\d+)\s*سال?\s*(?:ساخت|ساختمان|بنا)/u;
  const ageMatch = normalizedText.match(agePattern);
  if (ageMatch) {
    result.property.age = parseInt(ageMatch[1]);
    result.trace!.rulesUsed.push('age');
  }

  // استخراج فوریت
  if (normalizedText.includes('فوری') || normalizedText.includes('عجله')) {
    result.metadata.urgency = 'immediate';
    result.trace!.rulesUsed.push('urgency');
  } else if (normalizedText.includes('این هفته')) {
    result.metadata.urgency = 'this_week';
  } else if (normalizedText.includes('این ماه') || normalizedText.includes('ماه جاری')) {
    result.metadata.urgency = 'this_month';
  }
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
    // استفاده از Intelligence Engine
    const aiResult = await runIntakeIntelligence({
      text,
      citySlug: options.preferredCitySlug,
      cityName: options.preferredCity,
      formHints: options.formHints,
      forceAi: false
    }, {
      skipCache: options.realTime
    });

    // ادغام نتایج AI
    if (aiResult.fields) {
      // Category
      if (!result.category.value && aiResult.fields.categorySlug) {
        result.category.value = aiResult.fields.categorySlug.value;
        result.category.confidence = aiResult.fields.categorySlug.confidence || 0.8;

        // افزودن alternatives
        if (aiResult.categoryOptions) {
          result.category.alternatives = aiResult.categoryOptions.map(opt => ({
            slug: opt.slug,
            label: opt.label,
            confidence: opt.confidence || 0.5
          }));
        }
      }

      // Location
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
    // در صورت خطا، با نتایج Rules ادامه می‌دیم
  }
}

/**
 * تشخیص محله با توجه به context شهر
 */
async function disambiguateLocation(
  result: SmartExtractionResult,
  options: SmartExtractionOptions
): Promise<void> {
  if (!result.location.neighborhood || !options.preferredCity) return;

  try {
    // استفاده از LRE resolver با city hint
    const locationResult = await resolveLocationViaLre(
      result.location.neighborhood,
      {
        preferredCityId: options.preferredCitySlug,
        includeNeighborhoodAlternatives: true
      }
    );

    if (locationResult.neighborhoods && locationResult.neighborhoods.length > 1) {
      // محله‌های مشابه پیدا شد
      result.location.disambiguationNeeded = true;
      result.location.alternatives = locationResult.neighborhoods.map(n => ({
        neighborhood: n.name,
        neighborhoodSlug: n.slug,
        district: n.district,
        landmarks: n.landmarks || []
      }));
    } else if (locationResult.neighborhoods && locationResult.neighborhoods.length === 1) {
      // فقط یک محله پیدا شد
      result.location.neighborhoodSlug = locationResult.neighborhoods[0].slug;
      result.location.confidence = 0.9;
    }
  } catch (error) {
    console.error('Location disambiguation failed:', error);
  }
}

/**
 * تشخیص نوع معامله از مبالغ
 */
function inferTransactionFromBudget(result: SmartExtractionResult): void {
  // اگر هم رهن و هم اجاره داریم
  if (result.budget.depositAmount && result.budget.rentAmount) {
    result.transaction.type = 'DEPOSIT_AND_RENT';
    result.transaction.dealType = 'rent';
    result.transaction.confidence = 0.95;
    return;
  }

  // اگر فقط رهن داریم و مبلغ بالاست (بیش از 500 میلیون)
  if (result.budget.depositAmount && !result.budget.rentAmount) {
    if (result.budget.depositAmount > 500_000_000) {
      result.transaction.type = 'FULL_DEPOSIT';
      result.transaction.dealType = 'full-mortgage';
      result.transaction.confidence = 0.9;
    }
    return;
  }

  // اگر نوع معامله مشخص نیست اما بودجه داریم
  if (!result.transaction.type && result.budget.max) {
    // اگر بودجه کمتر از 100 میلیون است، احتمالا اجاره است
    if (result.budget.max < 100_000_000) {
      result.transaction.type = 'RENT';
      result.transaction.dealType = 'rent';
      result.transaction.confidence = 0.7;
    } else {
      // بودجه بالا، احتمالا خرید است
      result.transaction.type = 'BUY';
      result.transaction.dealType = 'sale';
      result.transaction.confidence = 0.7;
    }
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

function parseAmount(value: string, unit: 'million' | 'billion'): number {
  const num = parseFloat(value);
  return unit === 'billion' ? num * 1_000_000_000 : num * 1_000_000;
}

function getCategoryLabel(slug: string): string {
  // این باید از config خوانده شود
  const labels: Record<string, string> = {
    'apartment-sale': 'آپارتمان',
    'apartment-rent': 'آپارتمان',
    'villa': 'ویلا',
    'land': 'زمین',
    'shop': 'مغازه',
    'office': 'دفتر',
    'warehouse': 'انبار',
    // ...
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