/**
 * Analytics admin API smoke test.
 * Usage: npx tsx scripts/test-analytics-admin-e2e.ts [baseUrl]
 */
const BASE = process.argv[2]?.replace(/\/$/, '') || 'http://localhost:3000';

async function fetchJson(path: string) {
  const res = await fetch(`${BASE}${path}`);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

const ENDPOINTS = [
  '/api/super-admin/analytics/summary?preset=7d',
  '/api/super-admin/analytics/summary/sparklines?preset=7d&metrics=sessions,pageViews',
  '/api/super-admin/analytics/timeline?preset=7d&metric=pageViews',
  '/api/super-admin/analytics/realtime',
  '/api/super-admin/analytics/acquisition?preset=7d&groupBy=channel',
  '/api/super-admin/analytics/acquisition/matrix?preset=7d',
  '/api/super-admin/analytics/acquisition/landing?preset=7d',
  '/api/super-admin/analytics/engagement?preset=7d',
  '/api/super-admin/analytics/geo?preset=7d&level=province&metric=sessions',
  '/api/super-admin/analytics/geo/cities?preset=7d&province=tehran',
  '/api/super-admin/analytics/geo/detail?preset=7d&province=tehran',
  '/api/super-admin/analytics/geo/layout?province=tehran',
  '/api/super-admin/analytics/technology?preset=7d&dim=device',
  '/api/super-admin/analytics/dimensions?preset=7d&dim=market',
  '/api/super-admin/analytics/events?preset=7d',
  '/api/super-admin/analytics/funnel?preset=need',
  '/api/super-admin/analytics/retention?preset=28d&weeks=4',
  '/api/super-admin/analytics/explorer?preset=7d&q=test',
  '/api/super-admin/analytics/platform/correlation?preset=7d',
  '/api/super-admin/analytics/platform',
];

async function main() {
  console.log(`Analytics admin E2E against ${BASE}`);
  let passed = 0;
  let skipped = 0;

  for (const path of ENDPOINTS) {
    const name = path.split('?')[0]!.split('/').pop()!;
    const { status } = await fetchJson(path);
    if (status === 401 || status === 403) {
      console.log(`SKIP ${name}: auth (${status})`);
      skipped += 1;
    } else if (status >= 200 && status < 300) {
      console.log(`OK   ${name}`);
      passed += 1;
    } else {
      console.error(`FAIL ${name}: HTTP ${status}`);
      process.exitCode = 1;
    }
  }

  console.log(`\nDone: ${passed} ok, ${skipped} skipped`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
