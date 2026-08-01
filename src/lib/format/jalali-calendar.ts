import {
  isLeapJalaaliYear,
  jalaaliMonthLength,
  jalaaliToDateObject,
  toGregorian,
  toJalaali,
  type JalaaliDate,
} from 'jalaali-js';
import { formatCountFa, toPersianDigits } from './digits';

export const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

export const JALALI_WEEKDAYS_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] as const;

/** Friday column index in the Jalali week grid (week starts Saturday). */
export const JALALI_FRIDAY_COLUMN = 6;

export type JalaaliParts = JalaaliDate;

export function gregorianToJalaali(date: Date): JalaaliParts {
  return toJalaali(date);
}

export function jalaaliToDate(parts: JalaaliParts): Date {
  return jalaaliToDateObject(parts.jy, parts.jm, parts.jd);
}

export function isSameJalaaliDay(a: JalaaliParts, b: JalaaliParts): boolean {
  return a.jy === b.jy && a.jm === b.jm && a.jd === b.jd;
}

export function shiftJalaaliMonth(jy: number, jm: number, delta: number): JalaaliParts {
  let month = jm + delta;
  let year = jy;

  while (month > 12) {
    month -= 12;
    year += 1;
  }
  while (month < 1) {
    month += 12;
    year -= 1;
  }

  return { jy: year, jm: month, jd: 1 };
}

export type JalaaliMonthCell = JalaaliParts | null;

export function getJalaaliMonthGrid(jy: number, jm: number): JalaaliMonthCell[] {
  const length = jalaaliMonthLength(jy, jm);
  const firstDay = jalaaliToDateObject(jy, jm, 1);
  const startCol = (firstDay.getDay() + 1) % 7;
  const cells: JalaaliMonthCell[] = [];

  for (let i = 0; i < startCol; i++) cells.push(null);
  for (let jd = 1; jd <= length; jd++) cells.push({ jy, jm, jd });
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

const longWeekdayFormatter = new Intl.DateTimeFormat('fa-IR', {
  weekday: 'long',
});

const gregorianLongFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-gregory', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

/** Friday = weekend / public holiday in Iran. */
export function isJalaaliFriday(parts: JalaaliParts): boolean {
  return jalaaliToDateObject(parts.jy, parts.jm, parts.jd).getDay() === 5;
}

export function formatJalaaliWeekday(date: Date): string {
  return longWeekdayFormatter.format(date);
}

/** Jalali date string aligned with the calendar grid (jalaali-js). */
export function formatJalaaliFromParts(parts: JalaaliParts, opts?: { withWeekday?: boolean }): string {
  const withWeekday = opts?.withWeekday !== false;
  const date = jalaaliToDateObject(parts.jy, parts.jm, parts.jd);
  const core = `${toPersianDigits(parts.jd)} ${JALALI_MONTHS[parts.jm - 1]} ${formatCountFa(parts.jy)}`;
  if (!withWeekday) return core;
  return `${longWeekdayFormatter.format(date)}، ${core}`;
}

/** Gregorian equivalent from Jalali parts — avoids Intl Persian-calendar drift. */
export function formatGregorianFromParts(parts: JalaaliParts): string {
  const { gy, gm, gd } = toGregorian(parts.jy, parts.jm, parts.jd);
  const date = new Date(gy, gm - 1, gd, 12, 0, 0, 0);
  return gregorianLongFormatter.format(date);
}

/** @deprecated Prefer formatJalaaliFromParts for grid-consistent labels */
export function formatJalaaliLong(date: Date): string {
  return formatJalaaliFromParts(gregorianToJalaali(date));
}

/** @deprecated Prefer formatGregorianFromParts */
export function formatGregorianFootnote(date: Date): string {
  return formatGregorianFromParts(gregorianToJalaali(date));
}

export function formatJalaaliCompact(parts: JalaaliParts): string {
  return `${toPersianDigits(parts.jd)} ${JALALI_MONTHS[parts.jm - 1]}`;
}

export function formatJalaaliMonthYear(jy: number, jm: number): string {
  return `${JALALI_MONTHS[jm - 1]} ${formatCountFa(jy)}`;
}

export function formatTimeFa(date: Date, withSeconds = false): string {
  return date.toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
    second: withSeconds ? '2-digit' : undefined,
    hour12: false,
  });
}

export function formatJalaaliYearLabel(jy: number): string {
  const leap = isLeapJalaaliYear(jy);
  return leap ? `${formatCountFa(jy)} (کبیسه)` : formatCountFa(jy);
}

export function jalaaliPartsToIso(parts: JalaaliParts): string {
  const { gy, gm, gd } = toGregorian(parts.jy, parts.jm, parts.jd);
  const m = String(gm).padStart(2, '0');
  const d = String(gd).padStart(2, '0');
  return `${gy}-${m}-${d}`;
}
