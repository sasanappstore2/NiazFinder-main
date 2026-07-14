import { toGregorian } from 'jalaali-js';

export type IranCalendarRawEvent = {
  isHoliday: boolean;
  text: string;
  jDate: string;
  mDate: string;
  jDay: string;
};

export type IranCalendarEventItem = {
  text: string;
  isHoliday: boolean;
  mDate: string;
};

export type IranCalendarDayInfo = {
  isHoliday: boolean;
  events: IranCalendarEventItem[];
  gregorianLabel: string | null;
};

export type IranCalendarMonthPayload = {
  year: number;
  month: number;
  source: string;
  days: Record<string, IranCalendarDayInfo>;
};

const GREGORIAN_LABEL = new Intl.DateTimeFormat('fa-IR-u-ca-gregory', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export function jalaaliDayKey(jy: number, jm: number, jd: number): string {
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

export function formatMDateLabel(mDate: string): string | null {
  const parts = mDate.split('/').map((p) => Number(p));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [gy, gm, gd] = parts;
  return GREGORIAN_LABEL.format(new Date(gy, gm - 1, gd, 12, 0, 0, 0));
}

function gregorianLabelFromJDate(jDate: string): string | null {
  const parts = jDate.split('/').map((p) => Number(p));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const { gy, gm, gd } = toGregorian(parts[0], parts[1], parts[2]);
  return formatMDateLabel(`${gy}/${gm}/${gd}`);
}

export function buildMonthDayMap(
  events: IranCalendarRawEvent[],
  jy: number,
  jm: number
): Record<string, IranCalendarDayInfo> {
  const monthPrefix = `${jy}/${String(jm).padStart(2, '0')}/`;
  const grouped = new Map<string, IranCalendarEventItem[]>();

  for (const row of events) {
    if (!row.jDate.startsWith(monthPrefix)) continue;
    const list = grouped.get(row.jDate) ?? [];
    list.push({
      text: row.text,
      isHoliday: row.isHoliday,
      mDate: row.mDate,
    });
    grouped.set(row.jDate, list);
  }

  const days: Record<string, IranCalendarDayInfo> = {};
  for (const [key, list] of grouped) {
    const isHoliday = list.some((e) => e.isHoliday);
    const mDate = list.find((e) => e.mDate)?.mDate ?? '';
    days[key] = {
      isHoliday,
      events: list,
      gregorianLabel: mDate ? formatMDateLabel(mDate) : gregorianLabelFromJDate(key),
    };
  }

  return days;
}

export function emptyDayInfo(): IranCalendarDayInfo {
  return { isHoliday: false, events: [], gregorianLabel: null };
}

/** Bundled + pipe2time.ir data currently through this Jalali year. */
export const IRAN_CALENDAR_ABSOLUTE_MAX_YEAR = 1410;
export const IRAN_CALENDAR_MIN_YEAR = 1400;

export function isIranCalendarYearSupported(year: number): boolean {
  return year >= IRAN_CALENDAR_MIN_YEAR && year <= IRAN_CALENDAR_ABSOLUTE_MAX_YEAR;
}
