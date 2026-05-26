/**
 * Smoke-test public APIs. Run: npx tsx scripts/health/smoke-api.ts
 */
const BASE = process.env.SMOKE_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';

type ApiCheck = {
  name: string;
  path: string;
  method?: string;
  expect: number;
};

const CHECKS: ApiCheck[] = [
  { name: 'locations', path: '/api/locations', expect: 200 },
  { name: 'categories', path: '/api/categories', expect: 200 },
  { name: 'business_me_unauth', path: '/api/business/me', expect: 401 },
  { name: 'auth_get', path: '/api/auth', expect: 405 },
  { name: 'need_intake_parse', path: '/api/need-intake/parse-intent', method: 'POST', expect: 400 },
];

async function run(c: ApiCheck) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE}${c.path}`, {
      method: c.method ?? 'GET',
      signal: AbortSignal.timeout(8000),
    });
    return {
      name: c.name,
      path: c.path,
      status: res.status,
      ok: res.status === c.expect,
      ms: Date.now() - start,
    };
  } catch (e) {
    return {
      name: c.name,
      path: c.path,
      status: 0,
      ok: false,
      ms: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function main() {
  const results = [];
  for (const c of CHECKS) results.push(await run(c));
  const failed = results.filter((r) => !r.ok);
  console.log(JSON.stringify({ baseUrl: BASE, passed: results.length - failed.length, failed: failed.length, results }, null, 2));
  process.exit(failed.length ? 1 : 0);
}

main();
