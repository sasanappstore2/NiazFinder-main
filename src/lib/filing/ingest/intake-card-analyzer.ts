import { parseIntentFromText } from '@/lib/need-intake/intent-parser';
import { extractPropertySlotsFromText } from '@/lib/need-intake/extract-property-slots';
import {
  legacyDealTypeFromTransactionType,
  transactionTypeFromSourceText,
} from '@/lib/need-intake/resolve-transaction-type';
import { PROPERTY_KIND_LABELS } from '@/config/need-schemas/labels';
import type { CrawlBlueprint, FilingFieldKey } from '@/lib/filing/ingest/crawl-blueprint';
import {
  confidenceLevel,
  type FieldExtractorGuess,
  type FieldGuess,
} from '@/lib/filing/ingest/portal-families/types';
import { parseNeighborhoodFromLocation } from '@/lib/filing/ingest/infer-listing-from-text';

const DEAL_PERSIAN: Record<string, string> = {
  sell: 'فروش',
  buy: 'خرید',
  rent_monthly: 'اجاره',
  rent_rahn_full: 'رهن کامل',
  rent_rahn_ejare: 'رهن و اجاره',
  rent_short_term: 'اجاره کوتاه‌مدت',
};

const FILE_CODE_PATTERNS = [
  /کد\s*فایل\s*[:：]?\s*(\d+)/i,
  /کد\s*[:：]\s*(\d{4,})/i,
  /#(\d{5,})/,
];

function extractFileCode(text: string): { value: string; confidence: number } | null {
  for (const re of FILE_CODE_PATTERNS) {
    const m = text.match(re);
    if (m?.[1]) return { value: m[1], confidence: 0.9 };
  }
  return null;
}

function propertyKindLabel(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const slug = raw.toLowerCase();
  return PROPERTY_KIND_LABELS[slug as keyof typeof PROPERTY_KIND_LABELS] ?? raw;
}

function regexExtractor(
  key: FilingFieldKey,
  pattern: string,
  group = 1,
  transform?: FieldExtractorGuess['transform']
): FieldExtractorGuess {
  return { regex: pattern, regexGroup: group, attr: 'textContent', transform };
}

/** Analyze listing card text using intake rules + filing-specific fileCode. */
export function analyzeCardText(text: string, userCity: string): FieldGuess[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length < 12) return [];

  const guesses: FieldGuess[] = [];
  const push = (
    key: FilingFieldKey,
    value: string | undefined,
    confidence: number,
    evidence?: string,
    extractor?: FieldExtractorGuess
  ) => {
    if (!value?.trim()) return;
    guesses.push({
      key,
      value: value.trim(),
      confidence,
      level: confidenceLevel(confidence),
      evidence,
      extractor,
    });
  };

  const intent = parseIntentFromText(normalized);
  const tx = transactionTypeFromSourceText(normalized);
  const legacyDeal = legacyDealTypeFromTransactionType(tx);
  const dealPersian = legacyDeal ? DEAL_PERSIAN[legacyDeal] : intent.entities?.dealType;
  push('dealType', dealPersian, dealPersian ? 0.88 : 0, 'intake:dealType', regexExtractor('dealType', '(رهن و اجاره|رهن کامل|فروش|اجاره)', 1));

  const kindRaw = intent.entities?.propertyKind ?? intent.entities?.propertyType;
  push('propertyKind', propertyKindLabel(kindRaw), kindRaw ? 0.85 : 0, 'intake:propertyKind', regexExtractor('propertyKind', '(آپارتمان|ویلا|زمین|مغازه|دفتر|تجاری)', 1));

  const slots = extractPropertySlotsFromText(normalized);
  const area = slots.areaMin ?? slots.areaMax;
  push('area', area, area ? 0.82 : 0, 'intake:area', regexExtractor('area', '(\\d+)\\s*متری', 1));
  push('rooms', slots.rooms, slots.rooms ? 0.75 : 0, 'intake:rooms', regexExtractor('rooms', '(\\d+)\\s*خواب', 1));
  push('floor', slots.floorMin ?? slots.floorMax, slots.floorMin || slots.floorMax ? 0.78 : 0, 'intake:floor', regexExtractor('floor', 'طبقه\\s*[:：]?\\s*(\\d+)', 1, 'digits'));
  push('totalFloors', undefined, 0, 'intake:totalFloors', regexExtractor('totalFloors', 'تعداد\\s*طبقات\\s*[:：]?\\s*(\\d+)', 1, 'digits'));
  push('buildingAge', undefined, 0, 'intake:buildingAge', regexExtractor('buildingAge', 'سن\\s*بنا\\s*[:：]?\\s*(\\d+)', 1, 'digits'));
  push('documentType', undefined, 0, 'intake:documentType', regexExtractor('documentType', 'نوع\\s*سند\\s*[:：]?\\s*([^\\n]+)', 1, 'trim'));
  push('pricePerMeter', undefined, 0, 'intake:pricePerMeter', regexExtractor('pricePerMeter', 'متری\\s*[:：]?\\s*([\\d,]+)', 1, 'toman'));
  push('deposit', slots.deposit ?? slots.rahnAmount, slots.deposit || slots.rahnAmount ? 0.8 : 0, 'intake:deposit', regexExtractor('deposit', 'مبلغ\\s*رهن\\s*[:：]?\\s*([\\d,]+)', 1, 'toman'));
  push('monthlyRent', slots.monthlyRent, slots.monthlyRent ? 0.8 : 0, 'intake:rent', regexExtractor('monthlyRent', 'مبلغ\\s*اجاره\\s*[:：]?\\s*([\\d,]+)', 1, 'toman'));

  const priceM = normalized.match(/(?:قیمت|مبلغ\s*فروش)\s*[:：]?\s*([\d۰-۹,]+)/i);
  if (priceM?.[1]) {
    push('price', priceM[1].replace(/[^\d۰-۹]/g, ''), 0.8, 'regex:price', regexExtractor('price', '(?:قیمت|مبلغ\\s*فروش)\\s*[:：]?\\s*([\\d,]+)', 1, 'toman'));
  }

  const fileCode = extractFileCode(normalized);
  if (fileCode) {
    push('fileCode', fileCode.value, fileCode.confidence, 'filing:fileCode', regexExtractor('fileCode', 'کد\\s*فایل\\s*[:：]?\\s*(\\d+)', 1));
  }

  const city = userCity.trim();
  const locM = city
    ? normalized.match(new RegExp(`${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\n]{5,120}`, 'i'))
    : null;
  const locationLine = locM?.[0]?.trim();
  if (locationLine) {
    const { neighborhood, location } = parseNeighborhoodFromLocation(locationLine, city);
    push('location', location, 0.72, 'intake:location', regexExtractor('location', '([^\\n]{8,100})', 1, 'trim'));
    push('neighborhood', neighborhood, neighborhood ? 0.7 : 0.35, 'intake:neighborhood');
  }

  const titleParts = [dealPersian, propertyKindLabel(kindRaw), area ? `${area} متری` : ''].filter(Boolean);
  push('title', titleParts.join(' ').trim(), titleParts.length >= 2 ? 0.75 : 0.4, 'composed:title');

  return guesses;
}

export function guessesToFieldMap(guesses: FieldGuess[]): NonNullable<CrawlBlueprint['fieldMap']> {
  const map: NonNullable<CrawlBlueprint['fieldMap']> = {};
  for (const g of guesses) {
    if (!g.extractor) continue;
    map[g.key] = {
      scope: 'item',
      attr: g.extractor.attr ?? 'textContent',
      ...(g.extractor.selector ? { selector: g.extractor.selector } : {}),
      ...(g.extractor.regex ? { regex: g.extractor.regex, regexGroup: g.extractor.regexGroup ?? 1 } : {}),
      ...(g.extractor.transform ? { transform: g.extractor.transform } : {}),
    };
  }
  return map;
}

export function guessesToConfidenceMap(guesses: FieldGuess[]): Partial<Record<FilingFieldKey, number>> {
  const out: Partial<Record<FilingFieldKey, number>> = {};
  for (const g of guesses) {
    out[g.key] = g.confidence;
  }
  return out;
}

/** Backward-compatible flat record for LiveBrowserPane / infer-listing consumers. */
export function analyzeCardTextFlat(text: string, userCity: string): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const g of analyzeCardText(text, userCity)) {
    if (g.value) flat[g.key] = g.value;
  }
  return flat;
}
