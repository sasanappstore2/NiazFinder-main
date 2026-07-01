#!/usr/bin/env node
/** Soak test: run fleet supervisor loop for a fixed duration (default 2h). */
const DURATION_MS = Number(process.env.FILING_SOAK_MS || 2 * 60 * 60_000);
const TICK_MS = Number(process.env.FILING_FLEET_TICK_MS || 30_000);

const BASE = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://127.0.0.1:3000').replace(
  /\/$/,
  ''
);
const SECRET = process.env.INTERNAL_API_SECRET?.trim() || '';

const start = Date.now();
let ticks = 0;
let errors = 0;

async function tick() {
  const res = await fetch(`${BASE}/api/internal/filing-scrapers/tick`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(SECRET ? { 'x-internal-secret': SECRET } : {}),
    },
  });
  ticks += 1;
  if (!res.ok) errors += 1;
  const body = await res.json().catch(() => ({}));
  console.log(
    `[soak ${Math.round((Date.now() - start) / 1000)}s] tick#${ticks} ok=${res.ok} ran=${body.ran ?? 0} imported=${body.imported ?? 0}`
  );
}

console.log(`Soak test ${DURATION_MS / 60000}min → ${BASE}`);
const timer = setInterval(() => void tick(), TICK_MS);
void tick();

setTimeout(() => {
  clearInterval(timer);
  console.log(`SOAK COMPLETE ticks=${ticks} errors=${errors}`);
  process.exit(errors > ticks * 0.5 ? 1 : 0);
}, DURATION_MS);
