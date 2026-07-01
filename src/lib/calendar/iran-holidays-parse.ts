import { toGregorian } from 'jalaali-js';
import type { IranCalendarRawEvent } from '@/lib/calendar/iran-holidays';

type Pipe2MonthBlock = {
  events?: IranCalendarRawEvent[];
};

type ShamsiHolidayDay = {
  date: string;
  events: { description: string; is_holiday: boolean }[];
  is_holiday: boolean;
};

export function flattenPipe2IndexJson(
  year: number,
  data: Record<string, Pipe2MonthBlock[]> | Pipe2MonthBlock[]
): IranCalendarRawEvent[] {
  const months = Array.isArray(data) ? data : data[String(year)];
  if (!Array.isArray(months)) return [];

  const events: IranCalendarRawEvent[] = [];
  for (const month of months) {
    for (const row of month.events ?? []) {
      if (!row?.jDate) continue;
      events.push({
        isHoliday: Boolean(row.isHoliday),
        text: String(row.text ?? ''),
        jDate: String(row.jDate),
        mDate: String(row.mDate ?? ''),
        jDay: String(row.jDay ?? ''),
      });
    }
  }
  return events;
}

export function normalizeShamsiHolidaysJson(days: ShamsiHolidayDay[]): IranCalendarRawEvent[] {
  const events: IranCalendarRawEvent[] = [];

  for (const day of days) {
    const parts = day.date.split('-').map((p) => Number(p));
    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) continue;
    const [jy, jm, jd] = parts;
    const { gy, gm, gd } = toGregorian(jy, jm, jd);
    const jDate = `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
    const mDate = `${gy}/${String(gm).padStart(2, '0')}/${String(gd).padStart(2, '0')}`;

    for (const ev of day.events ?? []) {
      events.push({
        isHoliday: Boolean(ev.is_holiday),
        text: String(ev.description ?? ''),
        jDate,
        mDate,
        jDay: String(jd),
      });
    }
  }

  return events;
}
