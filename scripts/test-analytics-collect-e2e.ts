/**
 * Smoke test for POST /api/analytics/collect
 * Usage: npx tsx scripts/test-analytics-collect-e2e.ts [baseUrl]
 */
const BASE = process.argv[2]?.replace(/\/$/, '') || 'http://localhost:3000';

async function main() {
  const payload = {
    sessionId: `test-${Date.now()}`,
    visitorId: `visitor-${Date.now()}`,
    type: 'page_view',
    path: '/n/tehran',
    title: 'Test page',
    consent: true,
    referrer: 'https://google.com',
    utm: { source: 'test', medium: 'e2e' },
  };

  const res = await fetch(`${BASE}/api/analytics/collect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('FAIL collect:', res.status, data);
    process.exitCode = 1;
    return;
  }

  console.log('OK   POST /api/analytics/collect');

  const eventRes = await fetch(`${BASE}/api/analytics/collect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      type: 'event',
      name: 'test_event',
      properties: { foo: 'bar' },
    }),
  });

  if (!eventRes.ok) {
    console.error('FAIL event collect:', eventRes.status);
    process.exitCode = 1;
    return;
  }

  console.log('OK   custom event collect');

  const noConsent = await fetch(`${BASE}/api/analytics/collect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, consent: false }),
  });

  if (noConsent.status !== 403) {
    console.error('FAIL expected 403 without consent, got', noConsent.status);
    process.exitCode = 1;
    return;
  }

  console.log('OK   consent gate (403 without consent)');
  console.log('\nAnalytics collect E2E passed');
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
