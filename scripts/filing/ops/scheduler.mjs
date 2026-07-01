#!/usr/bin/env node
/**
 * Filing scraper scheduler — call internal tick every ~60s; server decides which bots are due (10min+jitter).
 * Usage: npm run filing-scrapers:scheduler
 */
const BASE = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://127.0.0.1:3000').replace(
  /\/$/,
  ''
);
const SECRET = process.env.INTERNAL_API_SECRET?.trim() || '';

const LOOP_MS = 60_000;

async function tick() {
  const res = await fetch(`${BASE}/api/internal/filing-scrapers/tick`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(SECRET ? { 'x-internal-secret': SECRET } : {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  const ts = new Date().toISOString();
  if (!res.ok) {
    console.error(`[${ts}] tick failed`, res.status, body);
    return;
  }
  console.log(
    `[${ts}] tick ok — checked=${body.checked} ran=${body.ran} imported=${body.imported}`,
    body.errors?.length ? body.errors : ''
  );
}

console.log(`Filing scraper scheduler → ${BASE} (every ${LOOP_MS / 1000}s)`);
void tick();
setInterval(() => void tick(), LOOP_MS);
