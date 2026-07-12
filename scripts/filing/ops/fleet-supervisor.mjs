#!/usr/bin/env node
/**
 * Filing fleet supervisor — tick scheduler + periodic fleet eval/onboard.
 * Usage: npm run filing-scrapers:fleet
 */
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, '../..');

const BASE = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://127.0.0.1:3000').replace(
  /\/$/,
  ''
);
const SECRET = process.env.INTERNAL_API_SECRET?.trim() || '';
const TICK_MS = Number(process.env.FILING_FLEET_TICK_MS || 60_000);
const EVAL_INTERVAL_MS = Number(process.env.FILING_FLEET_EVAL_MS || 6 * 60 * 60_000);
const ONBOARD_INTERVAL_MS = Number(process.env.FILING_FLEET_ONBOARD_MS || 24 * 60 * 60_000);

let lastEval = 0;
let lastOnboard = 0;

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
    `[${ts}] tick ok — checked=${body.checked} ran=${body.ran} imported=${body.imported} recovered=${body.recovered ?? 0}`,
    body.errors?.length ? body.errors : ''
  );
}

function runScript(script) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('node', [script], { cwd: root, stdio: 'inherit', env: process.env });
    child.on('exit', (code) => (code === 0 ? resolvePromise() : reject(new Error(`${script} exit ${code}`))));
  });
}

async function loop() {
  const now = Date.now();
  await tick();

  if (now - lastOnboard >= ONBOARD_INTERVAL_MS) {
    lastOnboard = now;
    try {
      console.log('[fleet] running onboard...');
      await runScript('scripts/filing-portal/run-portal-fleet-onboard.mjs');
    } catch (e) {
      console.error('[fleet] onboard failed', e);
    }
  }

  if (now - lastEval >= EVAL_INTERVAL_MS) {
    lastEval = now;
    try {
      console.log('[fleet] running eval...');
      await runScript('scripts/filing-portal/run-fleet-eval.mjs');
    } catch (e) {
      console.error('[fleet] eval failed', e);
    }
  }
}

console.log(
  `Filing fleet supervisor → ${BASE} tick=${TICK_MS / 1000}s eval=${EVAL_INTERVAL_MS / 3600000}h onboard=${ONBOARD_INTERVAL_MS / 3600000}h`
);
lastEval = Date.now();
lastOnboard = Date.now();
void loop();
setInterval(() => void loop(), TICK_MS);
