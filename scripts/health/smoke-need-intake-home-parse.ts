/**
 * Home / post intake analyze smoke (canonical engine).
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

  const analyzeRes = await fetch(`${BASE}/api/intake/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: SAMPLE_TEXT }),
    signal: AbortSignal.timeout(60000),
  });

  const analyzeJson = (await analyzeRes.json().catch(() => ({}))) as Record<string, unknown>;
  const entities = analyzeJson.entities as { categorySlug?: string; subcategorySlug?: string } | undefined;
  const slug = entities?.subcategorySlug ?? entities?.categorySlug;

  out.intakeAnalyze = {
    status: analyzeRes.status,
    sampleLength: SAMPLE_TEXT.length,
    meta: analyzeJson.meta,
    categorySlug: slug,
    needType: analyzeJson.needType,
  };

  const ok = analyzeRes.ok && typeof slug === 'string' && slug.length > 0;

  console.log(JSON.stringify({ ...out, passed: ok }, null, 2));
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
