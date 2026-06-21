/**
 * Smoke: home-lead style intake analyze (short Persian need text)
 *
 * Run: npm run smoke:need-intake-home-parse
 */
const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3000';

async function main(): Promise<void> {
  const text = 'به یک لوله‌کش در مشهد نیاز دارم';

  const res = await fetch(`${BASE}/api/intake/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  const body = (await res.json()) as {
    error?: string;
    categorySlug?: string;
    entities?: { categorySlug?: string };
    categoryCandidates?: Array<{ slug: string }>;
  };

  if (!res.ok) {
    console.error('FAIL home parse', res.status, body);
    process.exit(1);
  }

  const categorySlug =
    body.categorySlug ??
    body.entities?.categorySlug ??
    body.categoryCandidates?.[0]?.slug;

  console.log('OK: home-lead parse', categorySlug ?? '(no category)');
}

main().catch((err) => {
  console.error('FAIL smoke-need-intake-home-parse', err);
  process.exit(1);
});
