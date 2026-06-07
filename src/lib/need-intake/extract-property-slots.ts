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

function parseMoneyMillion(millionStr: string): number | undefined {
  const n = Number(millionStr);
  if (!Number.isFinite(n) || n <= 0 || n > 5_000) return undefined;
  return Math.round(n * 1_000_000);
}

function parseMoneyBillion(billionStr: string): number | undefined {
  const n = Number(billionStr);
  if (!Number.isFinite(n) || n <= 0 || n > 500) return undefined;
  return Math.round(n * 1_000_000_000);
}

function extractMonthlyRentToman(norm: string): number | undefined {
  const patterns = [
    /اجاره\s*(?:ام)?\s*(?:هم\s*)?(\d+(?:\.\d+)?)\s*میلیون/u,
    /(?:اجاره\s*ماهانه|اجاره\s*ماهیانه)\s*(?:هم\s*)?(\d+(?:\.\d+)?)\s*میلیون/u,
    /(\d+(?:\.\d+)?)\s*میلیون\s*(?:تومان\s*)?(?:ماهانه|ماهیانه|\/\s*ماه)/u,
    /(\d+(?:\.\d+)?)\s*میلیون[^\n]{0,12}اجاره/u,
  ];
  for (const re of patterns) {
    const m = norm.match(re);
    if (m?.[1]) {
      const value = parseMoneyMillion(m[1]);
      if (value != null) return value;
    }
  }
  return undefined;
}

function extractRahnToman(norm: string): number | undefined {
  const billionPatterns = [
    /(\d+(?:\.\d+)?)\s*میلیارد[^\n]{0,50}(?:رهن|ودیعه|بودجه)/u,
    /(?:رهن|ودیعه|بودجه)[^\n]{0,50}(\d+(?:\.\d+)?)\s*میلیارد/u,
    /(?:حدوداً|حدودا|تا|حداکثر|حداقل)\s*(\d+(?:\.\d+)?)\s*میلیارد/u,
  ];
  for (const re of billionPatterns) {
    const m = norm.match(re);
    if (m?.[1]) {
      const value = parseMoneyBillion(m[1]);
      if (value != null) return value;
    }
  }

  const millionRahnAfter = norm.match(/رهن\s*(\d+(?:\.\d+)?)\s*میلیون/u);
  if (millionRahnAfter?.[1]) return parseMoneyMillion(millionRahnAfter[1]);

  const millionRahn = norm.match(/(\d+(?:\.\d+)?)\s*میلیون[^\n]{0,30}رهن/u);
  if (millionRahn?.[1]) return parseMoneyMillion(millionRahn[1]);

  const rahn =
    parseFirstNumber(norm, /رهن\s*(\d[\d,]*)/) ??
    parseFirstNumber(norm, /(\d[\d,]*)\s*رهن/);
  if (rahn != null) return rahn;

  return undefined;
}

/** Keep words; normalize Persian/Arabic digit runs to ASCII for regex `\d` matching. */
function normalizeForSlotMatch(text: string): string {
  return normalizeIntakeText(text).replace(/[۰-۹٠-٩0-9]+/g, (run) => toAsciiDigits(run));
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
    parseFirstNumber(norm, /حدود(?:اً|ا)\s*(\d{1,5})\s*متری/);

  const areaMin =
    areaApprox ??
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

  const areaFromMetri = parseFirstNumber(norm, /(\d{1,5})\s*متری(?:\s|$|،|\.|\/)/);
  if (areaFromMetri != null) {
    slots.areaMin = String(areaFromMetri);
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

  const monthlyRent = extractMonthlyRentToman(norm);
  if (monthlyRent != null) slots.monthlyRent = String(monthlyRent);

  const rahnAmount = extractRahnToman(norm);
  if (rahnAmount != null) slots.rahnAmount = String(rahnAmount);

  const rahnEjareShort = norm.match(/رهن\s*(\d+(?:\.\d+)?)\s*(?:و\s*)?اجاره\s*(\d+(?:\.\d+)?)/u);
  if (rahnEjareShort?.[1] && rahnEjareShort[2]) {
    slots.rahnAmount = String(Math.round(Number(rahnEjareShort[1]) * 1_000_000));
    slots.monthlyRent = String(Math.round(Number(rahnEjareShort[2]) * 1_000_000));
  }

  const rahnOnly = norm.match(/رهن\s*(\d+(?:\.\d+)?)(?:\s*اجاره\s*ندارم|\s*فقط)?/u);
  if (rahnOnly && norm.includes('اجاره ندارم')) {
    slots.rahnAmount = String(Math.round(Number(rahnOnly[1]) * 1_000_000));
  }

  const floor =
    parseFirstNumber(norm, /طبقه\s*(\d{1,2})/) ??
    parseFirstNumber(norm, /(\d{1,2})\s*طبقه/);
  if (floor != null) slots.floorMin = String(floor);

  const deposit =
    parseFirstNumber(norm, /ودیعه\s*(\d[\d,]*)/) ??
    parseFirstNumber(norm, /(\d[\d,]*)\s*ودیعه/);
  if (deposit != null) slots.deposit = String(deposit);

  if (!slots.monthlyRent) {
    const ejareMoney = norm.match(
      /اجاره\s*(\d[\d,]*)(?!\d*(?:m(?:\s|$|،|\.|\/|i)|متر|متری))/iu
    );
    if (ejareMoney?.[1]) {
      const n = Number(ejareMoney[1].replace(/,/g, ''));
      const tail = norm.slice(
        (ejareMoney.index ?? 0) + ejareMoney[0].length,
        (ejareMoney.index ?? 0) + ejareMoney[0].length + 12
      );
      if (
        n > 0 &&
        !/^\s*متر|^\s*متری/i.test(tail) &&
        !(slots.areaMin && String(n) === slots.areaMin)
      ) {
        slots.monthlyRent = String(n);
      }
    }
    if (!slots.monthlyRent) {
      const reverse = norm.match(/(\d[\d,]*)\s*اجاره\s*ماه/);
      if (reverse?.[1]) {
        const n = Number(reverse[1].replace(/,/g, ''));
        if (n > 0) slots.monthlyRent = String(n);
      }
    }
  }

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
    norm.match(/(یک|دو|سه|چهار|تک)\s*خواب/) ??
    norm.match(/(\d)\s*خوابه/);
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
