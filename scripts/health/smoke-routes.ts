/**
 * Expanded route smoke using url-catalog sample + core pages.
 * Run: npm run smoke:routes
 */
import { buildCatalogUrls } from '../crawl/lib/url-catalog';

const BASE = process.env.SMOKE_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';

const CORE_PAGES = [
  '/',
  '/dashboard',
  '/login',
  '/post',
  '/chat',
  '/my-business',
  '/blog',
  '/help',
  '/privacy',
  '/terms',
];

function catalogSample(): string[] {
  const all = buildCatalogUrls({
    includeFilters: false,
    includeCityCategories: true,
    includeIranCategories: true,
  });
  const picks = [
    '/n/iran',
    '/b/iran',
    '/n/tehran',
    '/b/tehran',
    '/n/tehran/repairs/ac-repair',
    '/n/tehran/real-estate',
    '/b/tehran',
    '/search',
    '/discover',
    '/social-feed',
  ];
  return [...new Set([...CORE_PAGES, ...picks, ...all.filter((u) => u.startsWith('/n/tehran/')).slice(0, 5)])];
}

type Check = { name: string; path: string; expect?: number };

const APIS: Check[] = [
  { name: 'locations', path: '/api/locations' },
  { name: 'categories', path: '/api/categories' },
  { name: 'business_me', path: '/api/business/me', expect: 401 },
  { name: 'dashboard', path: '/api/dashboard', expect: 401 },
  { name: 'wallet', path: '/api/wallet', expect: 401 },
  { name: 'blog', path: '/api/blog' },
  { name: 'search_unified', path: '/api/search/unified?q=test' },
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
      signal: AbortSignal.timeout(12000),
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
  const pages = catalogSample().map((path, i) => ({
    name: `page_${i}_${path.replace(/\//g, '_').slice(0, 40)}`,
    path,
  }));

  const results = [];
  for (const c of [...pages, ...APIS]) {
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
