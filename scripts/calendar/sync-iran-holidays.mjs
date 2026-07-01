#!/usr/bin/env node
/**
 * Downloads full-year time.ir calendar data (pipe2time index.json) into bundled JSON.
 * Run: npm run calendar:sync
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUT_DIR = path.join(ROOT, 'src/lib/calendar/bundled');
const PIPE2_BASE = 'https://hmarzban.github.io/pipe2time.ir/api';
const SHAMSI_BASE =
  'https://raw.githubusercontent.com/hasan-ahani/shamsi-holidays/main/holidays';

const FIRST_YEAR = 1400;
const LAST_YEAR = 1410;

function flattenPipe2IndexJson(year, data) {
  const months = Array.isArray(data) ? data : data[String(year)];
  if (!Array.isArray(months)) return [];

  const events = [];
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

async function fetchPipe2Year(year) {
  const res = await fetch(`${PIPE2_BASE}/${year}/index.json`);
  if (!res.ok) return null;
  const json = await res.json();
  const events = flattenPipe2IndexJson(year, json);
  return events.length > 0 ? events : null;
}

async function fetchShamsiYear(year) {
  const res = await fetch(`${SHAMSI_BASE}/${year}.json`);
  if (!res.ok) return null;
  const days = await res.json();
  if (!Array.isArray(days)) return null;
  return days;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  for (let year = FIRST_YEAR; year <= LAST_YEAR; year += 1) {
    let events = await fetchPipe2Year(year);
    let source = 'pipe2time.ir';

    if (!events) {
      const shamsi = await fetchShamsiYear(year);
      if (shamsi) {
        source = 'shamsi-holidays (fallback)';
        events = shamsi.flatMap((day) => {
          const parts = day.date.split('-').map(Number);
          if (parts.length !== 3) return [];
          const [jy, jm, jd] = parts;
          const jDate = `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
          return (day.events ?? []).map((ev) => ({
            isHoliday: Boolean(ev.is_holiday),
            text: String(ev.description ?? ''),
            jDate,
            mDate: '',
            jDay: String(jd),
          }));
        });
      }
    }

    if (!events?.length) {
      console.warn(`skip ${year}: no data`);
      continue;
    }

    const outPath = path.join(OUT_DIR, `${year}.json`);
    await writeFile(outPath, `${JSON.stringify(events)}\n`, 'utf8');
    const months = new Set(events.map((e) => e.jDate.slice(0, 7))).size;
    console.log(`${year}: ${events.length} events, ${months} months (${source})`);
  }

  console.log('done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
