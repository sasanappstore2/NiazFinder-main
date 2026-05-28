import { normalizeIntakeText } from '@/lib/need-intake/normalize-intake-text';

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

const ROOM_WORDS: Record<string, string> = {
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  یک: '1',
  دو: '2',
  سه: '3',
  چهار: '4',
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

/** Extract area min/max and bedroom count from free-form property text. */
export function extractPropertySlotsFromText(rawText: string): PropertySlotsFromText {
  const norm = toAsciiDigits(normalizeIntakeText(rawText));
  const slots: PropertySlotsFromText = {};

  const areaMax =
    parseFirstNumber(norm, /حداکثر\s*(\d{1,5})\s*متر/) ??
    parseFirstNumber(norm, /(\d{1,5})\s*متر\s*حداکثر/) ??
    parseFirstNumber(norm, /تا\s*(\d{1,5})\s*متر(?!\s*مربع)/) ??
    parseFirstNumber(norm, /حداکثر\s*(\d{1,5})\s*متری/);

  const areaMin =
    parseFirstNumber(norm, /حداقل\s*(\d{1,5})\s*متر/) ??
    parseFirstNumber(norm, /(\d{1,5})\s*متر\s*حداقل/) ??
    parseFirstNumber(norm, /از\s*(\d{1,5})\s*متر/) ??
    parseFirstNumber(norm, /حداقل\s*(\d{1,5})\s*متری/);

  if (areaMax != null) slots.areaMax = String(areaMax);
  if (areaMin != null) slots.areaMin = String(areaMin);

  const areaFromMetri = parseFirstNumber(norm, /(\d{1,5})\s*متری(?:\s|$|،|\.|\/)/);
  if (areaFromMetri != null) {
    slots.areaMin = String(areaFromMetri);
  }

  if (!slots.areaMax && !slots.areaMin) {
    const plainMeter = parseFirstNumber(norm, /(\d{1,5})\s*متر(?:\s|$|،|\.|\/)/);
    if (plainMeter != null) {
      if (norm.includes('حداکثر') || norm.includes('تا ')) {
        slots.areaMax = String(plainMeter);
      } else if (norm.includes('حداقل')) {
        slots.areaMin = String(plainMeter);
      } else {
        slots.areaMin = String(plainMeter);
      }
    }
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

  const millionRahn = norm.match(/(\d+)\s*میلیون[^\n]{0,30}رهن/);
  if (millionRahn) slots.rahnAmount = String(Number(millionRahn[1]) * 1_000_000);
  const millionRent =
    norm.match(/(\d+)\s*میلیون[^\n]{0,30}اجاره/) ??
    norm.match(/اجاره[^\n]{0,20}(\d+)\s*میلیون/);
  if (millionRent) slots.monthlyRent = String(Number(millionRent[1]) * 1_000_000);

  const floor =
    parseFirstNumber(norm, /طبقه\s*(\d{1,2})/) ??
    parseFirstNumber(norm, /(\d{1,2})\s*طبقه/);
  if (floor != null) slots.floorMin = String(floor);

  const deposit =
    parseFirstNumber(norm, /ودیعه\s*(\d[\d,]*)/) ??
    parseFirstNumber(norm, /(\d[\d,]*)\s*ودیعه/);
  if (deposit != null) slots.deposit = String(deposit);

  const rahn =
    parseFirstNumber(norm, /رهن\s*(\d[\d,]*)/) ??
    parseFirstNumber(norm, /(\d[\d,]*)\s*رهن/);
  if (rahn != null) slots.rahnAmount = String(rahn);

  const monthly =
    parseFirstNumber(norm, /اجاره\s*(\d[\d,]*)/) ??
    parseFirstNumber(norm, /(\d[\d,]*)\s*اجاره\s*ماه/);
  if (monthly != null) slots.monthlyRent = String(monthly);

  const nightly =
    parseFirstNumber(norm, /(\d[\d,]*)\s*(?:تومان\s*)?(?:\/\s*)?شب/) ??
    parseFirstNumber(norm, /شب\s*(\d[\d,]*)/) ??
    parseFirstNumber(norm, /روزانه\s*(\d[\d,]*)/);
  if (nightly != null) slots.nightlyRent = String(nightly);

  const guestMatch =
    norm.match(/(\d)\s*نفر/) ?? norm.match(/(یک|دو|سه|چهار|پنج)\s*نفر/);
  if (guestMatch?.[1]) {
    slots.guestCount = GUEST_WORDS[guestMatch[1]] ?? guestMatch[1];
  }

  const roomMatch =
    norm.match(/(\d)\s*خواب/) ??
    norm.match(/(یک|دو|سه|چهار)\s*خواب/) ??
    norm.match(/(\d)\s*خوابه/);
  if (roomMatch?.[1]) {
    const mapped = ROOM_WORDS[roomMatch[1]] ?? roomMatch[1];
    if (mapped === '4' && (norm.includes('4+') || norm.includes('۴+'))) {
      slots.rooms = '4+';
    } else {
      slots.rooms = mapped;
    }
  }

  return slots;
}
