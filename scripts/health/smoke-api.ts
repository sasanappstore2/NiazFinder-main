/**
 * Tiered public API smoke matrix from api-inventory.json
 * Run: npm run smoke:api
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE = process.env.SMOKE_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';
const root = join(import.meta.dirname, '../..');

type ApiCheck = {
  name: string;
  path: string;
  method?: string;
  expect: number;
  body?: string;
};

const MANUAL_CHECKS: ApiCheck[] = [
  { name: 'locations', path: '/api/locations', expect: 200 },
  { name: 'categories', path: '/api/categories', expect: 200 },
  { name: 'blog', path: '/api/blog', expect: 200 },
  { name: 'business_occupations', path: '/api/business/occupations', expect: 200 },
  { name: 'business_me_unauth', path: '/api/business/me', expect: 401 },
  { name: 'wallet_unauth', path: '/api/wallet', expect: 401 },
  { name: 'dashboard_unauth', path: '/api/dashboard', expect: 401 },
  { name: 'users_me_unauth', path: '/api/users/me', expect: 401 },
  { name: 'requests_list', path: '/api/requests?limit=1', expect: 200 },
  { name: 'business_browse', path: '/api/business/browse?limit=1', expect: 200 },
  { name: 'search_unified', path: '/api/search/unified?q=test', expect: 200 },
  { name: 'neighborhoods', path: '/api/locations/neighborhoods?city=tehran', expect: 200 },
  { name: 'auth_get', path: '/api/auth', method: 'POST', expect: 405 },
  { name: 'intake_analyze', path: '/api/intake/analyze', method: 'POST', expect: 400, body: '{}' },
  { name: 'super_admin_overview_unauth', path: '/api/super-admin/overview', expect: 401 },
];

function loadInventoryRoutes(): string[] {
  const invPath = join(root, 'reports/api-inventory.json');
  if (!existsSync(invPath)) return [];
  try {
    const inv = JSON.parse(readFileSync(invPath, 'utf8')) as { routes?: string[] };
    return inv.routes ?? [];
  } catch {
    return [];
  }
}

async function run(c: ApiCheck) {
  const start = Date.now();
  try {
    const method = c.method ?? 'GET';
    const res = await fetch(`${BASE}${c.path}`, {
      method,
      headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body: method === 'POST' ? c.body ?? '{}' : undefined,
      signal: AbortSignal.timeout(10000),
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
  const inventoryCount = loadInventoryRoutes().length;
  const results = [];
  for (const c of MANUAL_CHECKS) results.push(await run(c));
  const failed = results.filter((r) => !r.ok);
  console.log(
    JSON.stringify(
      {
        baseUrl: BASE,
        inventoryRouteCount: inventoryCount,
        checksRun: results.length,
        passed: results.length - failed.length,
        failed: failed.length,
        results,
      },
      null,
      2
    )
  );
  process.exit(failed.length ? 1 : 0);
}

main();
