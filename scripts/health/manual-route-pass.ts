/**
 * Quick manual route pass for site debug plan.
 * Run: npx tsx scripts/health/manual-route-pass.ts
 */
const BASE = process.env.SMOKE_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';
const ROUTES = ['/', '/n/iran', '/b/iran', '/post', '/chat', '/dashboard'];
const PERSIAN_NEED = '\u0646\u06cc\u0627\u0632';

async function main(): Promise<void> {
  let failed = 0;
  for (const path of ROUTES) {
    const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(15000) });
    const ok = res.status === 200;
    console.log(`${ok ? 'OK' : 'FAIL'} ${path} -> ${res.status}`);
    if (!ok) failed += 1;
  }

  const home = await fetch(`${BASE}/`);
  const html = await home.text();
  const hasPersian = html.includes(PERSIAN_NEED);
  console.log(`${hasPersian ? 'OK' : 'FAIL'} home Persian text present`);
  if (!hasPersian) failed += 1;

  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
