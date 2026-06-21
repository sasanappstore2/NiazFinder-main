/**
 * Smoke: POST /api/intake/analyze (rules-first, dev server on :3000)
 *
 * Run: npm run test:post-api-smoke
 */
const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3000';

async function main(): Promise<void> {
  const text = 'آپارتمان دو خوابه در تهران برای اجاره ماهانه';

  const res = await fetch(`${BASE}/api/intake/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, cityName: 'تهران' }),
  });

  const body = (await res.json()) as {
    error?: string;
    categorySlug?: string;
    parsed?: unknown;
    entities?: { categorySlug?: string };
    draft?: { parsedIntent?: { categorySlug?: string } };
  };

  if (!res.ok) {
    console.error('FAIL analyze', res.status, body);
    process.exit(1);
  }

  const categorySlug =
    body.categorySlug ??
    body.entities?.categorySlug ??
    body.draft?.parsedIntent?.categorySlug;

  if (!categorySlug && !body.parsed) {
    console.error('FAIL analyze response missing category/parsed', body);
    process.exit(1);
  }

  console.log('OK: POST /api/intake/analyze', res.status, categorySlug ?? 'parsed');
}

main().catch((err) => {
  console.error('FAIL smoke-post-intake-api', err);
  process.exit(1);
});
