import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { toGregorian, toJalaali } from 'jalaali-js';
import {
  buildMonthDayMap,
  type IranCalendarMonthPayload,
  type IranCalendarRawEvent,
  IRAN_CALENDAR_ABSOLUTE_MAX_YEAR,
  IRAN_CALENDAR_MIN_YEAR,
  isIranCalendarYearSupported,
} from '@/lib/calendar/iran-holidays';
import {
  flattenPipe2IndexJson,
  normalizeShamsiHolidaysJson,
} from '@/lib/calendar/iran-holidays-parse';

const YEAR_CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const yearCache = new Map<number, { expiresAt: number; events: IranCalendarRawEvent[] }>();

function pipe2IndexUrl(year: number): string {
  const template =
    process.env.IRAN_CALENDAR_YEAR_INDEX_URL ??
    'https://hmarzban.github.io/pipe2time.ir/api/{year}/index.json';
  return template.replace('{year}', String(year));
}

function shamsiHolidaysUrl(year: number): string {
  return `https://raw.githubusercontent.com/hasan-ahani/shamsi-holidays/main/holidays/${year}.json`;
}

function bundledYearPath(year: number): string {
  return path.join(process.cwd(), 'src/lib/calendar/bundled', `${year}.json`);
}

async function loadBundledYearEvents(year: number): Promise<IranCalendarRawEvent[] | null> {
  try {
    const raw = await readFile(bundledYearPath(year), 'utf8');
    const json = JSON.parse(raw) as IranCalendarRawEvent[];
    return Array.isArray(json) && json.length > 0 ? json : null;
  } catch {
    return null;
  }
}

async function fetchRemoteJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 60 * 60 * 24 },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchPipe2YearEvents(year: number): Promise<IranCalendarRawEvent[]> {
  const ntpBase = process.env.IRAN_CALENDAR_NTP_BASE_URL?.replace(/\/$/, '');
  const urls = [
    pipe2IndexUrl(year),
    ...(ntpBase ? [`${ntpBase}/${year}/index.json`] : []),
  ];

  for (const url of urls) {
    const json = await fetchRemoteJson<Record<string, unknown> | unknown[]>(url);
    if (!json) continue;
    const events = flattenPipe2IndexJson(year, json as never);
    if (events.length > 0) return events;
  }

  return [];
}

async function fetchShamsiYearEvents(year: number): Promise<IranCalendarRawEvent[]> {
  const json = await fetchRemoteJson<unknown>(shamsiHolidaysUrl(year));
  if (!Array.isArray(json)) return [];
  return normalizeShamsiHolidaysJson(json as never);
}

async function fetchYearEvents(year: number): Promise<IranCalendarRawEvent[]> {
  const cached = yearCache.get(year);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.events;
  }

  const bundled = await loadBundledYearEvents(year);
  if (bundled) {
    yearCache.set(year, { events: bundled, expiresAt: Date.now() + YEAR_CACHE_TTL_MS });
    return bundled;
  }

  let events = await fetchPipe2YearEvents(year);
  if (events.length === 0) {
    events = await fetchShamsiYearEvents(year);
  }

  if (events.length > 0) {
    yearCache.set(year, { events, expiresAt: Date.now() + YEAR_CACHE_TTL_MS });
  }

  return events;
}

export async function getIranCalendarMonth(
  year: number,
  month: number
): Promise<IranCalendarMonthPayload> {
  if (!isIranCalendarYearSupported(year)) {
    return {
      year,
      month,
      source: 'unsupported-year',
      days: {},
    };
  }

  const events = await fetchYearEvents(year);
  const days = buildMonthDayMap(events, year, month);

  return {
    year,
    month,
    source: events.length > 0 ? 'time.ir' : 'unavailable',
    days,
  };
}

export function getIranCalendarMaxYear(): number {
  const now = new Date();
  const { jy } = toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return Math.min(jy + 10, IRAN_CALENDAR_ABSOLUTE_MAX_YEAR);
}

export function assertIranCalendarQuery(year: number, month: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month)) return 'سال یا ماه نامعتبر';
  if (month < 1 || month > 12) return 'ماه باید بین ۱ تا ۱۲ باشد';

  const maxYear = getIranCalendarMaxYear();
  if (year < IRAN_CALENDAR_MIN_YEAR || year > maxYear) {
    return `سال باید بین ${IRAN_CALENDAR_MIN_YEAR} و ${maxYear} باشد`;
  }
  return null;
}
