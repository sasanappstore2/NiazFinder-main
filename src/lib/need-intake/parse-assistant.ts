import type { FieldOption, ParsedIntent } from '@/contracts/need-intake';
import { getIntentDefinition } from '@/config/need-intents';
import { getRootCategorySlug } from '@/config/need-schemas/resolve-schema';
import { getClarifyingChipSet } from '@/lib/need-intake/clarifying-chips';
import { isCategoryVerticalCoherent } from '@/lib/need-intake/parse-coherence';
import {
  classifyVertical,
  isVerticalConfident,
  type VerticalClassification,
} from '@/lib/need-intake/vertical-classifier';

const VERTICAL_LABELS: Record<string, string> = {
  'real-estate': 'خانه / ملک',
  vehicles: 'خودرو',
  products: 'کالا',
  services: 'خدمات',
  jobs: 'استخدام / کار',
  social: 'درخواست اجتماعی',
};

function locationPhrase(parsed: ParsedIntent): string {
  const area = parsed.entities?.area;
  const city = parsed.city;
  if (area && city) return `${area}، ${city}`;
  if (area) return area;
  if (city) return city;
  return '';
}

function propertyKindFa(kind?: string): string {
  if (kind === 'apartment') return 'آپارتمان';
  if (kind === 'villa') return 'خانه ویلایی';
  if (kind === 'land') return 'زمین';
  if (kind === 'office') return 'دفتر کار';
  if (kind === 'shop') return 'مغازه';
  if (kind === 'industrial') return 'ملک صنعتی';
  return 'ملک';
}

function dealFa(deal?: string): string {
  if (deal === 'buy') return 'خرید';
  if (deal === 'sell') return 'فروش';
  if (deal === 'rent_monthly') return 'اجاره ماهانه';
  if (deal === 'rent_rahn_full') return 'رهن کامل';
  if (deal === 'rent_rahn_ejare') return 'رهن و اجاره';
  if (deal === 'rent_short_term') return 'اجاره کوتاه‌مدت';
  if (deal?.startsWith('rent')) return 'اجاره/رهن';
  return '';
}

function buildRecap(parsed: ParsedIntent, classification: VerticalClassification): string {
  const loc = locationPhrase(parsed);
  const vertical = classification.vertical;

  if (
    parsed.intentType === 'real_estate_service' ||
    parsed.categorySlug === 'construction-partnership' ||
    parsed.entities?.serviceKind === 'partnership'
  ) {
    const kind = propertyKindFa(parsed.entities?.propertyKind);
    const size = parsed.entities?.areaMin ?? parsed.entities?.areaMax;
    const width = parsed.entities?.plotWidth;
    let msg = `درخواست مشارکت در ساخت برای ${kind}`;
    if (size) msg += ` حدود ${size} متر`;
    if (width) msg += `، عرض ${width} متر`;
    if (loc) msg += ` در ${loc}`;
    return `${msg} — چند سؤال تکمیلی می‌پرسم.`;
  }

  if (parsed.intentType.startsWith('property') || vertical === 'real-estate') {
    const deal = parsed.entities?.dealType;
    const kind = propertyKindFa(parsed.entities?.propertyKind);
    const dealLabel = dealFa(deal);
    const areaMax = parsed.entities?.areaMax;
    const areaMin = parsed.entities?.areaMin;

    if (deal && parsed.entities?.propertyKind) {
      let msg = `${dealLabel} ${kind}`;
      if (loc) msg += ` در ${loc}`;
      if (areaMax && !areaMin) msg += ` (حداکثر ${areaMax} متر)`;
      else if (areaMin && areaMax) msg += ` (${areaMin} تا ${areaMax} متر)`;
      else if (areaMin) msg += ` (حداقل ${areaMin} متر)`;
      return `${msg} — چند سؤال تکمیلی می‌پرسم.`;
    }

    if (deal || parsed.entities?.propertyKind) {
      const parts: string[] = ['به نظر می‌رسد دنبال'];
      if (dealLabel) parts.push(dealLabel);
      if (parsed.entities?.propertyKind) parts.push(kind);
      if (loc) parts.push(`در ${loc}`);
      parts.push('هستید.');
      if (!deal) parts.push('نوع معامله (خرید، اجاره، رهن) را مشخص کنید یا ادامه دهید.');
      else if (!parsed.entities?.propertyKind) parts.push('نوع ملک را مشخص کنید یا ادامه دهید.');
      else parts.push('چند سؤال تکمیلی می‌پرسم.');
      return parts.join(' ');
    }

    const parts = [`به نظر می‌رسد دنبال ${kind} هستید`];
    if (loc) parts.push(`در ${loc}`);
    parts.push('نوع معامله و نوع ملک را مشخص کنید یا ادامه دهید.');
    return parts.join(' ');
  }

  if (parsed.intentType.startsWith('vehicle') || vertical === 'vehicles') {
    return loc
      ? `نیاز شما مربوط به خودرو در ${loc} است. چند سؤال کوتاه می‌پرسم.`
      : 'نیاز شما مربوط به خودرو است. چند سؤال کوتاه می‌پرسم.';
  }

  if (parsed.intentType.startsWith('product') || vertical === 'products') {
    return loc
      ? `نیاز شما مربوط به خرید/فروش کالا در ${loc} است.`
      : 'نیاز شما مربوط به خرید/فروش کالا است. چند سؤال کوتاه می‌پرسم.';
  }

  if (parsed.intentType === 'job_search' || vertical === 'jobs') {
    return 'نیاز شما مربوط به استخدام/کار است. چند سؤال کوتاه می‌پرسم.';
  }

  if (parsed.intentType === 'service_request' || vertical === 'services') {
    return loc
      ? `نیاز شما مربوط به خدمات در ${loc} است. دسته خدمات را مشخص کنید.`
      : 'نیاز شما مربوط به خدمات است. دسته را مشخص کنید.';
  }

  const def = getIntentDefinition(parsed.intentType);
  return loc
    ? `نیاز شما (${def.labelFa}) در ${loc} ثبت می‌شود. چند سؤال کوتاه می‌پرسم.`
    : `نیازتان را فهمیدم (${def.labelFa}). چند سؤال کوتاه می‌پرسم؛ بعد می‌توانید بیشتر توضیح دهید.`;
}

/** Whether to skip generic clarifying and go straight to schema questions. */
export function shouldSkipClarifying(
  parsed: ParsedIntent,
  classification: VerticalClassification
): boolean {
  if (!isCategoryVerticalCoherent(parsed.categorySlug, classification.vertical)) {
    return false;
  }
  if (parsed.confidence >= 0.72 && isVerticalConfident(classification)) return true;
  if (parsed.confidence >= 0.65 && classification.vertical === 'real-estate') {
    return Boolean(parsed.entities?.dealType || parsed.entities?.propertyKind || parsed.entities?.area);
  }
  return false;
}

export function buildParseAssistantMessage(
  parsed: ParsedIntent,
  rawText: string
): string {
  const classification = classifyVertical(rawText);
  let msg: string;
  if (shouldSkipClarifying(parsed, classification)) {
    msg = buildRecap(parsed, classification);
  } else if (isVerticalConfident(classification) && parsed.confidence >= 0.55) {
    msg = buildRecap(parsed, classification);
  } else {
    const label =
      VERTICAL_LABELS[classification.vertical] ?? getIntentDefinition(parsed.intentType).labelFa;
    const loc = locationPhrase(parsed);
    if (loc) {
      msg = `فکر می‌کنم منظورتان «${label}» در ${loc} است. درست است؟`;
    } else {
      msg = `فکر می‌کنم منظورتان «${label}» است. درست است؟`;
    }
  }

  if (parsed.locationAmbiguous === true && parsed.neighborhoodCandidates?.length) {
    const names = parsed.neighborhoodCandidates.map((c) => c.label).join('، ');
    msg = `برای محله چند گزینه نزدیک با این نام وجود دارد (${names}). لطفاً در قدم بعد محلهٔ دقیق را انتخاب کنید؛ ${msg}`;
  }

  return msg;
}

export function buildParseSuggestedChips(
  parsed: ParsedIntent,
  answers: Record<string, unknown>,
  rawText: string
): FieldOption[] {
  const classification = classifyVertical(rawText);
  const clarifying = getClarifyingChipSet(parsed, answers, classification);
  if (clarifying?.options.length) {
    return clarifying.options;
  }

  if (!shouldSkipClarifying(parsed, classification) && !isVerticalConfident(classification)) {
    return [
      { value: 'vertical:real-estate', label: 'خانه / ملک' },
      { value: 'vertical:vehicles', label: 'خودرو' },
      { value: 'vertical:products', label: 'کالا' },
      { value: 'vertical:services', label: 'خدمات' },
      { value: 'vertical:jobs', label: 'استخدام' },
      { value: 'confirm', label: 'بله، ادامه بده' },
    ];
  }

  const def = getIntentDefinition(parsed.intentType);
  return [
    { value: 'confirm', label: `بله، ${def.labelFa}` },
    { value: 'change', label: 'نه، اصلاح می‌کنم' },
  ];
}

export function applyVerticalChipSelection(
  parsed: ParsedIntent,
  chipValue: string
): ParsedIntent {
  if (!chipValue.startsWith('vertical:')) return parsed;
  const vertical = chipValue.replace('vertical:', '');
  const root = getRootCategorySlug(parsed.categorySlug);

  if (vertical === 'real-estate' && root !== 'real-estate') {
    return {
      ...parsed,
      intentType: 'property_search',
      categorySlug: 'apartment-sale',
      confidence: Math.max(parsed.confidence, 0.8),
      entities: {
        ...parsed.entities,
        dealType: parsed.entities?.dealType ?? 'buy',
        propertyKind: parsed.entities?.propertyKind ?? 'apartment',
      },
    };
  }
  if (vertical === 'vehicles') {
    return {
      ...parsed,
      intentType: 'vehicle_search',
      categorySlug: 'car',
      confidence: Math.max(parsed.confidence, 0.8),
    };
  }
  if (vertical === 'products') {
    return {
      ...parsed,
      intentType: 'product_search',
      categorySlug: 'electronics',
      confidence: Math.max(parsed.confidence, 0.8),
    };
  }
  if (vertical === 'services') {
    return {
      ...parsed,
      intentType: 'service_request',
      categorySlug: 'services',
      confidence: Math.max(parsed.confidence, 0.75),
    };
  }
  if (vertical === 'jobs') {
    return {
      ...parsed,
      intentType: 'job_search',
      categorySlug: 'jobs',
      confidence: Math.max(parsed.confidence, 0.8),
    };
  }
  return parsed;
}
