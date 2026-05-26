/**
 * Smoke-test key pages and APIs. Run: npx tsx scripts/health/smoke-routes.ts
 * Requires dev server on BASE_URL (default http://localhost:3000).
 */
const BASE = process.env.SMOKE_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';

type Check = { name: string; path: string; expect?: number };

const PAGES: Check[] = [
  { name: 'home', path: '/' },
  { name: 'dashboard', path: '/dashboard' },
  { name: 'business_market', path: '/b/iran' },
  { name: 'need_market', path: '/n/iran' },
  { name: 'login', path: '/login' },
  { name: 'business_edit', path: '/pro/biz-demo-cleaning-karaj/edit' },
];

const APIS: Check[] = [
  { name: 'locations', path: '/api/locations' },
  { name: 'categories', path: '/api/categories' },
  { name: 'business_me', path: '/api/business/me', expect: 401 },
];

async function probe(check: Check): Promise<{
  name: string;
  path: string;
  status: number;
  ok: boolean;
  ms: number;
  error?: string;
}> {
  const url = `${BASE}${check.path}`;
  const expect = check.expect ?? 200;
  const start = Date.now();
  try {
    const res = await fetch(url, {
      redirect: 'manual',
      headers: { Accept: 'text/html,application/json' },
      signal: AbortSignal.timeout(8000),
    });
    const status = res.status;
    return {
      name: check.name,
      path: check.path,
      status,
      ok: status === expect || (expect === 200 && status >= 200 && status < 400),
      ms: Date.now() - start,
    };
  } catch (e) {
    return {
      name: check.name,
      path: check.path,
      status: 0,
      ok: false,
      ms: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function main() {
  const results = [];
  for (const c of [...PAGES, ...APIS]) {
    results.push(await probe(c));
  }
  const failed = results.filter((r) => !r.ok);
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE,
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    results,
  };
  console.log(JSON.stringify(report, null, 2));
  if (failed.length > 0) {
    process.exit(1);
  }
}

main();
