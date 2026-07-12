import {
  type FilingDealType,
  type FilingPropertyKind,
  isFilingDealType,
  isFilingPropertyKind,
} from '@/lib/filing/schema/attribute-schema';
import type { ScrapedFilingRow } from '@/lib/filing/ingest/estate-scrape-filing-client';
import { normalizeDigits } from '@/lib/filing/ingest/normalize-listing';
import { legacyDealTypeFromTransactionType, transactionTypeFromSourceText } from '@/lib/need-intake/resolve-transaction-type';

const DEAL_MAP: Record<string, FilingDealType> = {
  sell: 'sell',
  sale: 'sell',
  فروش: 'sell',
  rent_rahn_ejare: 'rent_rahn_ejare',
  'رهن و اجاره': 'rent_rahn_ejare',
  rent_rahn_full: 'rent_rahn_full',
  'رهن کامل': 'rent_rahn_full',
  rent_short_term: 'rent_short_term',
};

const KIND_PATTERNS: Array<[RegExp, FilingPropertyKind]> = [
  [/آپارتمان|apartment/i, 'apartment'],
  [/ویلا|villa/i, 'villa'],
  [/زمین|land/i, 'land'],
  [/دفتر\s*کار|دفتر|office/i, 'office'],
  [/مغازه|shop/i, 'shop'],
  [/تجاری|commercial/i, 'commercial'],
];

export function canonicalizeDealType(raw: string | null | undefined): FilingDealType | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (DEAL_MAP[t]) return DEAL_MAP[t];
  const fromIntake = legacyDealTypeFromTransactionType(transactionTypeFromSourceText(t));
  if (fromIntake && isFilingDealType(fromIntake)) return fromIntake;
  if (/رهن\s*کامل/i.test(t)) return 'rent_rahn_full';
  if (/رهن\s*و\s*اجاره/i.test(t)) return 'rent_rahn_ejare';
  if (/فروش|sell/i.test(t)) return 'sell';
  if (/کوتاه/i.test(t)) return 'rent_short_term';
  return null;
}

export function canonicalizePropertyKind(raw: string | null | undefined): FilingPropertyKind | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (isFilingPropertyKind(t)) return t;
  for (const [re, kind] of KIND_PATTERNS) {
    if (re.test(t)) return kind;
  }
  return null;
}

function parseBoolFa(value: string | null | undefined): boolean | null {
  if (!value?.trim()) return null;
  if (/ندارد|خیر|نه\b/.test(value)) return false;
  if (/دارد|بله|آری/.test(value)) return true;
  return null;
}

function parseIntField(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const d = normalizeDigits(String(value));
  if (!d) return null;
  const n = parseInt(d, 10);
  return Number.isFinite(n) ? n : null;
}

/** Parse Persian attribute block (detail page text). */
export function parseListingAttributes(
  text: string,
  hints?: { dealType?: string | null; propertyKind?: string | null }
): Partial<ScrapedFilingRow> {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return {};

  const out: Partial<ScrapedFilingRow> = {};

  if (/رهن\s*کامل\s*[:：]/i.test(compact)) {
    out.dealType = 'rent_rahn_full';
  } else if (hints?.dealType) {
    out.dealType = canonicalizeDealType(hints.dealType);
  } else {
    const m = compact.match(/(رهن\s*و\s*اجاره|رهن\s*کامل|فروش|اجاره)/i);
    if (m) out.dealType = canonicalizeDealType(m[1]);
  }

  if (hints?.propertyKind) {
    out.propertyKind = canonicalizePropertyKind(hints.propertyKind);
  } else {
    const m = compact.match(/(آپارتمان|ویلا|ویلایی|زمین|دفتر\s*کار|دفتر|مغازه|تجاری)/i);
    if (m) out.propertyKind = canonicalizePropertyKind(m[0]);
  }

  const patterns: Array<[keyof ScrapedFilingRow, RegExp]> = [
    ['fileCode', /کد\s*فایل\s*[:：]?\s*(\d+)/i],
    ['price', /(?:مبلغ\s*کل|قیمت)\s*[:：]?\s*([\d,]+)/i],
    ['pricePerMeter', /متری\s*[:：]?\s*([\d,]+)/i],
    ['deposit', /(?:مبلغ\s*رهن|رهن\s*کامل)\s*[:：]?\s*([\d,]+)/i],
    ['monthlyRent', /مبلغ\s*اجاره\s*[:：]?\s*([\d,]+)/i],
    ['area', /(\d+)\s*متری/i],
    ['floor', /طبقه\s*[:：]?\s*(\d+)/i],
    ['totalFloors', /تعداد\s*طبقات\s*[:：]?\s*(\d+)/i],
    ['unitsCount', /تعداد\s*واحد(?:ها)?\s*[:：]?\s*(\d+)/i],
    ['rooms', /تعداد\s*خواب\s*[:：]?\s*(\d+)/i],
    ['buildingAge', /سن\s*بنا\s*[:：]?\s*(\d+)/i],
    ['documentType', /نوع\s*سند\s*[:：]?\s*([^\n]+?)(?:\s+کابینت|\s+کفپوش|$)/i],
    ['cabinet', /کابینت\s*[:：]?\s*([^\n]+?)(?:\s+کفپوش|\s+دیوارپوش|$)/i],
    ['flooring', /کفپوش\s*[:：]?\s*([^\n]+?)(?:\s+دیوارپوش|\s+نما|$)/i],
    ['wallCover', /دیوارپوش\s*[:：]?\s*([^\n]+?)(?:\s+نما|\s+جهت|$)/i],
    ['facade', /نما\s*[:：]?\s*([^\n]+?)(?:\s+جهت|$)/i],
    ['orientation', /جهت\s*ملک\s*[:：]?\s*([^\n]+?)(?:\s+گرمایش|$)/i],
    ['heating', /گرمایش\s*[:：]?\s*([^\n]+?)(?:\s+سرمایش|$)/i],
    ['cooling', /سرمایش\s*[:：]?\s*([^\n]+?)(?:\s+قابلیت|$)/i],
  ];

  const metaPatterns: Array<[keyof NonNullable<ScrapedFilingRow['sourceMeta']>, RegExp]> = [
    ['landUse', /کاربری\s*[:：]?\s*([^\n]+?)(?:\s+نوع\s+سند|\s+جهت|$)/i],
    ['plotWidth', /عرض\s*زمین\s*[:：]?\s*([۰-۹0-9]+)/i],
    ['frontage', /طول\s*بر\s*[:：]?\s*([۰-۹0-9]+)/i],
    ['commercialUse', /نوع\s*کاربری\s*[:：]?\s*([^\n]+?)(?:\s+طول\s+بر|\s+جهت|$)/i],
  ];

  for (const [key, re] of patterns) {
    const m = compact.match(re);
    if (!m?.[1]) continue;
    const val = m[1].trim();
    if (['price', 'deposit', 'monthlyRent', 'pricePerMeter'].includes(key)) {
      (out as Record<string, string>)[key] = normalizeDigits(val) || val;
    } else if (['floor', 'totalFloors', 'unitsCount', 'rooms', 'buildingAge'].includes(key)) {
      (out as Record<string, number | null>)[key] = parseIntField(val);
    } else if (key === 'area') {
      out.area = val;
    } else {
      (out as Record<string, string>)[key] = val;
    }
  }

  const sourceMeta: Record<string, string> = {};
  for (const [key, re] of metaPatterns) {
    const m = compact.match(re);
    if (m?.[1]?.trim()) sourceMeta[key] = m[1].trim();
  }
  if (Object.keys(sourceMeta).length) out.sourceMeta = sourceMeta;

  const exch = compact.match(/قابلیت\s*معاوضه\s*[:：]?\s*([^\n]+)/i);
  if (exch) out.exchangeable = parseBoolFa(exch[1]);

  const loc = compact.match(/^([\u0600-\u06FF\u200c\s]+?)\s*[-–،,]\s*([\u0600-\u06FF\u200c\s\d/\.]+)/);
  if (loc) {
    out.city = loc[1]?.trim();
    out.neighborhood = loc[2]?.trim();
    out.location = `${out.city} - ${out.neighborhood}`;
  }

  const desc = text.match(/توضیحات\s*ملک\s*[:：]?\s*([\s\S]+)$/i);
  if (desc) out.description = desc[1]?.trim();

  if (/\bپارکینگ\b/.test(compact)) out.hasParking = true;
  if (/\bانباری\b/.test(compact)) out.hasStorage = true;
  if (/آسانسور/.test(compact)) out.hasElevator = true;
  if (/درب\s*ضد\s*سرقت/.test(compact)) out.hasSecurityDoor = true;

  const dateM = compact.match(
    /(?:شنبه|یکشنبه|دوشنبه|سه\s*شنبه|چهارشنبه|پنج\s*شنبه|جمعه)\s+(\d{1,2})\s+([\u0600-\u06FF]+)\s+(\d{4})/
  );
  if (dateM) out.postedAt = dateM[0].trim();

  if (out.dealType === 'rent_rahn_full') {
    out.monthlyRent = null;
    out.price = null;
  } else if (out.dealType === 'sell') {
    out.deposit = null;
    out.monthlyRent = null;
  }

  return out;
}

export function mergeListingRows(
  base: Partial<ScrapedFilingRow>,
  extra: Partial<ScrapedFilingRow>
): Partial<ScrapedFilingRow> {
  const merged = { ...base };
  for (const [key, val] of Object.entries(extra)) {
    if (val == null || val === '') continue;
    if (key === 'sourceMeta' && typeof val === 'object') {
      merged.sourceMeta = { ...(merged.sourceMeta ?? {}), ...(val as Record<string, unknown>) };
      continue;
    }
    const k = key as keyof ScrapedFilingRow;
    if (merged[k] == null || merged[k] === '') {
      (merged as Record<string, unknown>)[k] = val;
    }
  }
  return merged;
}
