import type { FieldOption, ParsedIntent } from '@/contracts/need-intake';
import { getIntentDefinition } from '@/config/need-intents';
import { getRootCategorySlug } from '@/config/need-schemas/resolve-schema';
import { getClarifyingChipSet } from '@/lib/need-intake/clarifying-chips';
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

function buildRecap(parsed: ParsedIntent, classification: VerticalClassification): string {
  const loc = locationPhrase(parsed);
  const vertical = classification.vertical;

  if (parsed.intentType.startsWith('property') || vertical === 'real-estate') {
    const kind =
      parsed.entities?.propertyKind === 'apartment'
        ? 'آپارتمان/خانه'
        : parsed.entities?.propertyKind === 'villa'
          ? 'خانه/ویلا'
          : 'ملک';
    const deal = parsed.entities?.dealType;
    let dealFa = '';
    if (deal === 'buy') dealFa = 'خرید';
    else if (deal === 'sell') dealFa = 'فروش';
    else if (deal?.startsWith('rent')) dealFa = 'اجاره/رهن';
    const parts = [`به نظر می‌رسد دنبال ${dealFa ? `${dealFa} ` : ''}${kind} هستید`];
    if (loc) parts.push(`در ${loc}`);
    parts.push('نوع معامله را مشخص کنید یا ادامه دهید.');
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
  if (shouldSkipClarifying(parsed, classification)) {
    return buildRecap(parsed, classification);
  }
  if (isVerticalConfident(classification) && parsed.confidence >= 0.55) {
    return buildRecap(parsed, classification);
  }
  const label = VERTICAL_LABELS[classification.vertical] ?? getIntentDefinition(parsed.intentType).labelFa;
  const loc = locationPhrase(parsed);
  if (loc) {
    return `فکر می‌کنم منظورتان «${label}» در ${loc} است. درست است؟`;
  }
  return `فکر می‌کنم منظورتان «${label}» است. درست است؟`;
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
