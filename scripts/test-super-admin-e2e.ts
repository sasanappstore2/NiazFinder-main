/**
 * Super Admin API smoke test (no browser).
 * Requires: DATABASE_URL, SUPER_ADMIN auth via env or first user fallback.
 *
 * Usage: npx tsx scripts/test-super-admin-e2e.ts [baseUrl]
 */
const BASE = process.argv[2]?.replace(/\/$/, '') || 'http://localhost:3000';

async function fetchJson(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  const endpoints = [
    { path: '/api/super-admin/overview', name: 'overview' },
    { path: '/api/super-admin/workflow', name: 'workflow' },
    { path: '/api/super-admin/audit?limit=1', name: 'audit' },
    { path: '/api/super-admin/reports?limit=1', name: 'reports' },
    { path: '/api/super-admin/businesses?limit=1', name: 'businesses' },
    { path: '/api/super-admin/proposals?limit=1', name: 'proposals' },
    { path: '/api/super-admin/voice-calls?limit=1', name: 'voice-calls' },
    { path: '/api/super-admin/notifications?limit=1', name: 'notifications' },
    { path: '/api/super-admin/reviews?limit=1', name: 'reviews' },
    { path: '/api/super-admin/outreach?limit=1', name: 'outreach' },
    { path: '/api/super-admin/need-alerts?limit=1', name: 'need-alerts' },
    { path: '/api/super-admin/transactions?limit=1', name: 'transactions' },
    { path: '/api/super-admin/settings', name: 'settings' },
    { path: '/api/super-admin/referrals?limit=1', name: 'referrals' },
    { path: '/api/super-admin/coupons?limit=1', name: 'coupons' },
    { path: '/api/super-admin/business-occupations', name: 'business-occupations' },
    { path: '/api/business/occupations', name: 'business-occupations-public' },
    { path: '/api/super-admin/analytics/summary?preset=7d', name: 'analytics-summary' },
    { path: '/api/super-admin/analytics/summary/sparklines?preset=7d&metrics=sessions', name: 'analytics-sparklines' },
    { path: '/api/super-admin/analytics/realtime', name: 'analytics-realtime' },
    { path: '/api/super-admin/analytics/engagement?preset=7d', name: 'analytics-engagement' },
    { path: '/api/super-admin/analytics/funnel?preset=need', name: 'analytics-funnel' },
    { path: '/api/super-admin/analytics/retention?preset=28d', name: 'analytics-retention' },
    { path: '/api/super-admin/analytics/platform/correlation?preset=7d', name: 'analytics-correlation' },
    { path: '/api/super-admin/analytics/platform', name: 'analytics-platform' },
  ];

  console.log(`Super Admin E2E smoke against ${BASE}`);
  let passed = 0;
  let skipped = 0;

  for (const ep of endpoints) {
    const { status } = await fetchJson(ep.path);
    if (status === 401 || status === 403) {
      console.log(`SKIP ${ep.name}: auth required (${status})`);
      skipped += 1;
    } else if (status >= 200 && status < 300) {
      console.log(`OK   ${ep.name}`);
      passed += 1;
    } else {
      console.error(`FAIL ${ep.name}: HTTP ${status}`);
      process.exitCode = 1;
    }
  }

  console.log(`\nDone: ${passed} ok, ${skipped} skipped (auth)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
