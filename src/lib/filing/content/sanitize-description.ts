import type { FilingSourceMeta } from '../types';

const CUT_MARKERS: RegExp[] = [
  /(?:^|\n|\s)دفتر\s*کارگزاری/i,
  /\s+آدرس\s*[:：]/i,
  /(?:^|\n)\s*شماره\s*تماس\s*[:：]/i,
  /(?:^|\n)\s*تماس\s*مالک\s*[:：]/i,
  /(?:^|\n)\s*در\s*صورتی\s*که\s*مشترک/i,
  /(?:^|\n)\s*ثبت\s*(?:رایگان|ملک)/i,
  /(?:^|\n)\s*×\s*(?:\n|$)/i,
  /(?:^|\n)\s*مسکن\s*یابان\s*(?:\n|$)/i,
  /(?:^|\n)\s*برای\s*دریافت\s*اطلاع/i,
  /(?:^|\n)\s*تایید\s*قوانین\s*سایت/i,
];

const AMENITY_WORD =
  'آسانسور|پارکینگ|انباری|کمد\\s*دیواری|گاز\\s*روکار|تراس|درب\\s*ضد\\s*سرقت';

/** Inline amenity run — cut before first occurrence (already shown in امکانات section). */
const AMENITY_BLOCK = new RegExp(
  `(?:\\s|^)(?:${AMENITY_WORD})(?:\\s+(?:${AMENITY_WORD}))*`,
  'i'
);

const TRAILING_AMENITIES = new RegExp(
  `\\s+(?:${AMENITY_WORD})(?:\\s+(?:${AMENITY_WORD})*)\\s*$`,
  'i'
);

/** Compact rent/deposit shorthand — ۱م، ۱م ۷۰ — never «متر». */
const PRICE_SHORTHAND_INLINE =
  /\s*[۰-۹0-9]{1,2}م(?:\s+[۰-۹0-9]{1,3})?/g;

const PRICE_ONLY_LINE =
  /^[۰-۹0-9\sیا.،]*م[۰-۹0-9\s]*$/;

const FILLER_PREFIX = /^(?:به\s*خدا[\s!،,.]*)?(?:سلام[\s!،,.]*)?/i;

function cutAtAmenityBlock(text: string): string {
  const match = AMENITY_BLOCK.exec(text);
  if (match?.index != null && match.index > 0) {
    return text.slice(0, match.index).trim();
  }
  return text;
}

function dropNoiseLines(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (/^یاعلی$/i.test(line)) return false;
      if (PRICE_ONLY_LINE.test(line) && !/متر/.test(line)) return false;
      return true;
    })
    .join('\n');
}

function normalizeDescriptionBody(text: string): string {
  let result = dropNoiseLines(text);
  result = result
    .split('\n')
    .map((line) => line.replace(FILLER_PREFIX, '').trim())
    .filter(Boolean)
    .join('\n');
  result = result
    .replace(PRICE_SHORTHAND_INLINE, ' ')
    .replace(/\s*یاعلی\s*/gi, ' ')
    .replace(TRAILING_AMENITIES, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return result;
}

/** Strip broker box, modals, footer junk, amenity duplicates, and price shorthand. */
export function sanitizeFilingDescription(text: string | null | undefined): string | null {
  if (!text?.trim()) return null;
  let cleaned = text.replace(/\r\n?/g, '\n').trim();
  cleaned = cleaned.replace(/^توضیحات\s*ملک\s*[:：]?\s*/i, '').trim();

  for (const marker of CUT_MARKERS) {
    const match = marker.exec(cleaned);
    if (match?.index != null) {
      cleaned = cleaned.slice(0, match.index).trim();
    }
  }

  cleaned = cutAtAmenityBlock(cleaned);
  cleaned = normalizeDescriptionBody(cleaned);

  return cleaned || null;
}

/** Recover broker panel fields when sourceMetaJson was empty but description was polluted. */
export function extractBrokerMetaFromDescription(
  rawDescription: string | null | undefined
): Partial<FilingSourceMeta> {
  if (!rawDescription?.trim()) return {};
  const meta: Partial<FilingSourceMeta> = {};
  const office = rawDescription.match(
    /دفتر\s*کارگزاری\s*([^\n]+?)(?=\s*آدرس\s*[:：]|\n|$)/i
  )?.[1]?.trim();
  const address = rawDescription.match(/آدرس\s*[:：]\s*([^\n]+)/i)?.[1]?.trim();
  const phone = rawDescription.match(/شماره\s*تماس\s*[:：]\s*([\d\s-]+)/i)?.[1]?.replace(/\D/g, '');
  if (office) meta.brokerOffice = office;
  if (address) meta.brokerAddress = address;
  if (phone) meta.brokerPhone = phone;
  return meta;
}

export function mergeSourceMetaWithDescriptionFallback(
  sourceMeta: FilingSourceMeta,
  rawDescription: string | null | undefined
): FilingSourceMeta {
  const hasBroker =
    sourceMeta.brokerOffice || sourceMeta.brokerPhone || sourceMeta.brokerAddress;
  if (hasBroker) return sourceMeta;
  const recovered = extractBrokerMetaFromDescription(rawDescription);
  if (!Object.keys(recovered).length) return sourceMeta;
  return { ...sourceMeta, ...recovered };
}

export function inferAmenitiesFromDescription(text: string | null | undefined): {
  parking?: boolean;
  storage?: boolean;
  elevator?: boolean;
  builtInWardrobe?: boolean;
  securityDoor?: boolean;
  builtInGas?: boolean;
} {
  if (!text) return {};
  return {
    parking: /\bپارکینگ\b/.test(text) || undefined,
    storage: /\bانباری\b/.test(text) || undefined,
    elevator: /آسانسور/.test(text) || undefined,
    builtInWardrobe: /کمد/.test(text) || undefined,
    securityDoor: /درب\s*ضد\s*سرقت/.test(text) || undefined,
    builtInGas: /گاز\s*روکار/.test(text) || undefined,
  };
}

/** Recover land / commercial spec lines when sourceMetaJson lacks them. */
export function inferExtendedSpecsFromDescription(
  text: string | null | undefined
): Partial<Pick<FilingSourceMeta, 'plotWidth' | 'landUse' | 'frontage' | 'commercialUse'>> {
  if (!text?.trim()) return {};
  const out: Partial<Pick<FilingSourceMeta, 'plotWidth' | 'landUse' | 'frontage' | 'commercialUse'>> =
    {};
  const plotWidth = text.match(/عرض\s*زمین\s*[:：]?\s*([۰-۹0-9]+)/i)?.[1];
  const landUse = text.match(/کاربری\s*[:：]?\s*([^\n]+?)(?:\s+نوع\s+سند|\s+جهت|$)/i)?.[1]?.trim();
  const frontage = text.match(/طول\s*بر\s*[:：]?\s*([۰-۹0-9]+)/i)?.[1];
  const commercialUse = text.match(/نوع\s*کاربری\s*[:：]?\s*([^\n]+?)(?:\s+طول\s+بر|\s+جهت|$)/i)?.[1]?.trim();
  if (plotWidth) out.plotWidth = plotWidth;
  if (landUse) out.landUse = landUse;
  if (frontage) out.frontage = frontage;
  if (commercialUse) out.commercialUse = commercialUse;
  return out;
}

export function mergeExtendedSpecsWithDescriptionFallback(
  sourceMeta: FilingSourceMeta,
  rawDescription: string | null | undefined
): FilingSourceMeta {
  const inferred = inferExtendedSpecsFromDescription(rawDescription);
  if (!Object.keys(inferred).length) return sourceMeta;
  return {
    ...sourceMeta,
    plotWidth: sourceMeta.plotWidth ?? inferred.plotWidth ?? null,
    landUse: sourceMeta.landUse ?? inferred.landUse ?? null,
    frontage: sourceMeta.frontage ?? inferred.frontage ?? null,
    commercialUse: sourceMeta.commercialUse ?? inferred.commercialUse ?? null,
  };
}
