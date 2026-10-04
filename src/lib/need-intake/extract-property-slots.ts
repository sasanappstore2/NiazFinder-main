import { normalizeIntakeText } from '@/lib/need-intake/normalize-intake-text';
import {
  extractPropertyMoneyFromText,
  normalizeColloquialAmountWords,
} from '@/lib/need-intake/parse-persian-amount';

export interface PropertySlotsFromText {
  areaMin?: string;
  areaMax?: string;
  rooms?: string;
  plotWidth?: string;
  floorMin?: string;
  floorMax?: string;
  pricePerMeterMin?: string;
  pricePerMeterMax?: string;
  deposit?: string;
  monthlyRent?: string;
  rahnAmount?: string;
  nightlyRent?: string;
  guestCount?: string;
}

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** Normalize Persian/Arabic digits to ASCII for regex parsing. */
export function toAsciiDigits(text: string): string {
  let out = text;
  for (let i = 0; i < 10; i++) {
    out = out.replaceAll(PERSIAN_DIGITS[i], String(i));
    out = out.replaceAll(ARABIC_DIGITS[i], String(i));
  }
  return out;
}

function parseFirstNumber(text: string, pattern: RegExp): number | undefined {
  const m = text.match(pattern);
  if (!m?.[1]) return undefined;
  const n = Number(m[1].replace(/,/g, ''));
  if (!Number.isFinite(n) || n <= 0 || n > 50_000_000_000) return undefined;
  return n;
}

function parseThousandToman(text: string, pattern: RegExp): number | undefined {
  const n = parseFirstNumber(text, pattern);
  if (n == null || n > 500_000) return undefined;
  return n * 1_000;
}

const MIN_NIGHTLY_RENT_TOMAN = 10_000;

/** Nightly price — ignore bare duration phrases like "2 شب" without a price amount. */
function parseNightlyRentAmount(norm: string): number | undefined {
  const pricePatterns = [
    /(\d[\d,]*)\s*(?:تومان\s*)?(?:\/\s*)?شب/u,
    /(\d[\d,]*)\s*تومان[^\n]{0,28}شب/u,
    /شب\s*(\d[\d,]*)\s*تومان/u,
    /روزانه\s*(\d[\d,]*)/u,
    /قیمت\s*(?:از\s*)?(\d[\d,]*)\s*تومان[^\n]{0,20}(?:شب|روز)/u,
  ];
  for (const pattern of pricePatterns) {
    const n = parseFirstNumber(norm, pattern);
    if (n != null && n >= MIN_NIGHTLY_RENT_TOMAN) return n;
  }
  const thousand =
    parseThousandToman(norm, /(\d{1,5})\s*هزار\s*توم(?:ان(?:ه)?|نه|ن)/) ??
    parseThousandToman(norm, /قیمت[^\n]{0,24}(\d{1,5})\s*هزار\s*توم(?:ان(?:ه)?|نه|ن)/);
  if (thousand != null && thousand >= MIN_NIGHTLY_RENT_TOMAN) return thousand;
  return undefined;
}

const ROOM_WORDS: Record<string, string> = {
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  یک: '1',
  دو: '2',
  سه: '3',
  چهار: '4',
  تک: '1',
  '۴+': '4+',
  '4+': '4+',
};

const GUEST_WORDS: Record<string, string> = {
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5+',
  یک: '1',
  دو: '2',
  سه: '3',
  چهار: '4',
  پنج: '5+',
};

/** Keep words; normalize colloquial amounts + Persian/Arabic digits for regex `\d` matching. */
function normalizeForSlotMatch(text: string): string {
  const colloquial = normalizeColloquialAmountWords(text);
  return normalizeIntakeText(colloquial).replace(/[۰-۹٠-٩0-9]+/g, (run) => toAsciiDigits(run));
}

/** Extract area min/max and bedroom count from free-form property text. */
export function extractPropertySlotsFromText(rawText: string): PropertySlotsFromText {
  const norm = normalizeForSlotMatch(rawText);
  const slots: PropertySlotsFromText = {};

  const areaMax =
    parseFirstNumber(norm, /حداکثر\s*(\d{1,5})\s*متر/) ??
    parseFirstNumber(norm, /(\d{1,5})\s*متر\s*حداکثر/) ??
    parseFirstNumber(norm, /(?<!حدود(?:اً|ا)\s*)تا\s*(\d{1,5})\s*متر(?!\s*مربع)/) ??
    parseFirstNumber(norm, /حداکثر\s*(\d{1,5})\s*متری/);

  const areaApprox =
    parseFirstNumber(norm, /حدود(?:اً|ا)\s*(\d{1,5})\s*متر/) ??
    parseFirstNumber(norm, /حدود(?:اً|ا)\s*(\d{1,5})\s*متری/) ??
    parseFirstNumber(norm, /(?:^|[\s،])(\d{1,5})\s*متر\s*مربع/u);
  const areaWord100 = /(?:^|[\s،])صد\s*متر/u.test(norm) ? 100 : undefined;

  const areaMin =
    areaApprox ??
    areaWord100 ??
    parseFirstNumber(norm, /حداقل\s*(\d{1,5})\s*متر/) ??
    parseFirstNumber(norm, /(\d{1,5})\s*متر\s*حداقل/) ??
    parseFirstNumber(norm, /از\s*(\d{1,5})\s*متر/) ??
    parseFirstNumber(norm, /حداقل\s*(\d{1,5})\s*متری/);

  if (areaMax != null) slots.areaMax = String(areaMax);
  if (areaMin != null) slots.areaMin = String(areaMin);

  const areaRange = norm.match(/(\d{1,5})\s*تا\s*(\d{1,5})\s*متر/u);
  if (areaRange?.[1] && areaRange[2]) {
    slots.areaMin = areaRange[1];
    slots.areaMax = areaRange[2];
  }

  const metriRe = /(\d{1,5})\s*متری(?:\s|$|،|\.|\/)/gu;
  for (const m of norm.matchAll(metriRe)) {
    const idx = m.index ?? 0;
    const before = norm.slice(Math.max(0, idx - 3), idx);
    if (/در\s+$/.test(before)) continue;
    if (m[1]) {
      slots.areaMin = m[1];
      break;
    }
  }

  if (!slots.areaMax && !slots.areaMin) {
    const plainMeter = parseFirstNumber(norm, /(\d{1,5})\s*متر(?:\s|$|،|\.|\/)/);
    if (plainMeter != null) {
      if (norm.includes('حدوداً') || norm.includes('حدودا')) {
        slots.areaMin = String(plainMeter);
      } else if (norm.includes('حداکثر') || norm.includes('تا ')) {
        slots.areaMax = String(plainMeter);
      } else if (norm.includes('حداقل')) {
        slots.areaMin = String(plainMeter);
      } else {
        slots.areaMin = String(plainMeter);
      }
    }
  }

  if (!slots.areaMax && !slots.areaMin) {
    const latinMeter = parseFirstNumber(norm, /(\d{1,5})\s*m(?:\s|$|،|\.|\/)/i);
    if (latinMeter != null) slots.areaMin = String(latinMeter);
  }

  const plotWidth =
    parseFirstNumber(norm, /عرض\s*(\d{1,3})\s*متر/) ??
    parseFirstNumber(norm, /عرض\s*(\d{1,3})(?:\s|$|،)/);
  if (plotWidth != null) slots.plotWidth = String(plotWidth);

  if (!slots.areaMin && !slots.areaMax) {
    const ppm =
      parseFirstNumber(norm, /متری\s*(\d[\d,]*)\s*(?:میلیون|میلیارد|تومان)/) ??
      parseFirstNumber(norm, /متری\s*(\d[\d,]{5,})/) ??
      parseFirstNumber(norm, /(\d[\d,]{5,})\s*(?:تومان\s*)?(?:هر\s*)?متری/) ??
      parseFirstNumber(norm, /قیمت\s*هر\s*متر\s*(\d[\d,]*)/);
    if (ppm != null) slots.pricePerMeterMin = String(ppm);
  }

  const money = extractPropertyMoneyFromText(rawText);
  if (money.monthlyRent != null) slots.monthlyRent = String(money.monthlyRent);
  if (money.rahnAmount != null) slots.rahnAmount = String(money.rahnAmount);
  if (money.deposit != null) slots.deposit = String(money.deposit);

  const floor =
    parseFirstNumber(norm, /طبقه\s*(\d{1,2})/) ??
    parseFirstNumber(norm, /(\d{1,2})\s*طبقه/);
  if (floor != null) slots.floorMin = String(floor);

  if (money.deposit == null) {
    const deposit =
      parseFirstNumber(norm, /ودیعه\s*(\d[\d,]*)/) ??
      parseFirstNumber(norm, /(\d[\d,]*)\s*ودیعه/);
    if (deposit != null) slots.deposit = String(deposit);
  }

  const nightly = parseNightlyRentAmount(norm);
  if (nightly != null) slots.nightlyRent = String(nightly);

  const guestMatch =
    norm.match(/(\d)\s*نفر/) ?? norm.match(/(یک|دو|سه|چهار|پنج)\s*نفر/);
  if (guestMatch?.[1]) {
    slots.guestCount = GUEST_WORDS[guestMatch[1]] ?? guestMatch[1];
  }

  const roomMatch =
    norm.match(/(\d)\s*خواب/) ??
    norm.match(/(یک|دو|سه|چهار|تک)\s*خواب/) ??
    norm.match(/(\d)\s*خوابه/) ??
    norm.match(/(\d)\s*اتاق(?:ه)?/) ??
    norm.match(/(یک|دو|سه|چهار|پنج)\s*اتاق(?:ه)?/);
  if (roomMatch?.[1]) {
    const mapped = ROOM_WORDS[roomMatch[1]] ?? roomMatch[1];
    if (mapped === '4' && (norm.includes('4+') || norm.includes('۴+'))) {
      slots.rooms = '4+';
    } else {
      slots.rooms = mapped;
    }
  }

  if (norm.includes('نقلی')) {
    slots.areaMax = slots.areaMax ?? '50';
  }

  return slots;
}
