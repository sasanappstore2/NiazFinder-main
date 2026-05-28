/**
 * End-to-end-ish check for home → parse-intent (and optional mlx-health in dev).
 *
 * Run with Next dev up:
 *   npx tsx scripts/health/smoke-need-intake-home-parse.ts
 *
 * Env:
 *   SMOKE_BASE_URL — default http://localhost:3000
 *   SMOKE_INTAKE_TEXT — optional override for POST body `text`
 */
const BASE = process.env.SMOKE_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';

const SAMPLE_TEXT =
  process.env.SMOKE_INTAKE_TEXT?.trim() ||
  'به دنبال آپارتمان ۶۰ تا ۷۰ متری دو خواب در منطقه ونک برای اجاره هستم؛ بودجه ماهانه حدود ۴۰ میلیون';

async function main() {
  const out: Record<string, unknown> = { baseUrl: BASE };

  try {
    const healthRes = await fetch(`${BASE}/api/need-intake/mlx-health`, {
      method: 'GET',
      signal: AbortSignal.timeout(8000),
    });
    if (healthRes.status === 404) {
      out.mlxHealth = {
        skipped: true,
        note: 'Route disabled outside development (expected in production builds).',
      };
    } else {
      const healthJson = (await healthRes.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      out.mlxHealth = {
        status: healthRes.status,
        ok: healthRes.ok,
        body: healthJson,
      };
    }
  } catch (e) {
    out.mlxHealth = {
      error: e instanceof Error ? e.message : String(e),
    };
  }

  const parseRes = await fetch(`${BASE}/api/need-intake/parse-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: SAMPLE_TEXT }),
    signal: AbortSignal.timeout(60000),
  });

  const parseJson = (await parseRes.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  const parsed = parseJson.parsed as { categorySlug?: string } | undefined;
  const slug = parsed?.categorySlug;

  out.parseIntent = {
    status: parseRes.status,
    sampleLength: SAMPLE_TEXT.length,
    meta: parseJson.meta,
    categorySlug: slug,
  };

  const ok = parseRes.ok && typeof slug === 'string' && slug.length > 0;

  console.log(JSON.stringify({ ...out, passed: ok }, null, 2));
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
