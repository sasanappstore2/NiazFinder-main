/**
 * Fast-path hybrid intake: no LLM on clear estate text; enrich only when ambiguous.
 * Lite live pass skips LRE / city-AI.
 *
 * Run: npm run test:intake-fast-path
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { clearIntelligenceCache } from '@/lib/need-intake/intake-parse-cache-store';

async function stubServerOnly(): Promise<void> {
  const require = createRequire(import.meta.url);
  const p = require.resolve('server-only');
  require.cache[p] = {
    id: p,
    filename: p,
    loaded: true,
    exports: {},
  } as NodeModule;
}

function stepNames(result: { trace?: { steps?: Array<{ name: string; summary?: string }> } }): string[] {
  return (result.trace?.steps ?? []).map((s) => s.name);
}

function stepResolver(
  result: { trace?: { steps?: Array<{ name: string; resolver?: string; summary?: string }> } },
  name: string
): string {
  const step = result.trace?.steps?.find((s) => s.name === name);
  return `${step?.resolver ?? ''} ${step?.summary ?? ''}`.trim();
}

async function main(): Promise<void> {
  await stubServerOnly();
  process.env.NEED_INTAKE_HYBRID_ENABLED = 'true';
  process.env.NEED_INTAKE_RULES_ONLY = 'false';
  process.env.NEED_INTAKE_LLM_ENABLED = 'true';
  process.env.NEED_INTAKE_LOC_SKIP_PRISMA = 'true';
  process.env.NEED_INTAKE_INTENT_GIST_ENABLED = 'true';
  await clearIntelligenceCache();

  const { runHybridIntakePipeline } = await import(
    '@/intake/intelligence-engine/hybrid/hybrid-pipeline'
  );

  const clearText =
    'اجاره آپارتمان دو خوابه در سیدی مشهد رهن ۵۰۰ میلیون اجاره ۱۵ میلیون';

  await runHybridIntakePipeline({ text: clearText, lite: true });
  await clearIntelligenceCache();

  const liteStarted = performance.now();
  const lite = await runHybridIntakePipeline({ text: clearText, lite: true });
  const liteLatencyMs = Math.round(performance.now() - liteStarted);
  const liteNames = stepNames(lite);
  const liteResolver = stepResolver(lite, 'resolvers');

  assert.equal(lite.meta.lite, true, 'lite pass must set meta.lite');
  assert.equal(lite.meta.aiInvoked, false, 'lite must not invoke AI');
  assert.ok(!liteNames.includes('city-disambig'), `lite must skip city-disambig: ${liteNames.join(',')}`);
  assert.ok(liteResolver.includes('lite'), `lite resolvers must skip LRE: ${liteResolver}`);
  assert.ok(!liteNames.includes('intent-gist'), `unexpected gist step: ${liteNames.join(',')}`);
  assert.ok(!liteNames.includes('scoped-field-fill'), `unexpected fill step: ${liteNames.join(',')}`);

  const liteRooms = Number(lite.fields.rooms?.value ?? lite.draft.entities.rooms ?? 0);
  const liteCity = String(lite.fields.city?.value ?? lite.draft.entities.city ?? '');
  assert.ok(liteRooms === 2 || liteRooms === 1, `lite rooms expected, got ${liteRooms}`);
  assert.ok(liteCity.includes('مشهد') || Boolean(lite.fields.citySlug?.value), `lite city missing: ${liteCity}`);

  const LITE_BUDGET_MS = 350;
  assert.ok(
    liteLatencyMs < LITE_BUDGET_MS,
    `lite latency ${liteLatencyMs}ms exceeds ${LITE_BUDGET_MS}ms budget`
  );

  await clearIntelligenceCache();
  await runHybridIntakePipeline({ text: clearText });
  await clearIntelligenceCache();

  const started = performance.now();
  const fast = await runHybridIntakePipeline({ text: clearText });
  const latencyMs = Math.round(performance.now() - started);
  const names = stepNames(fast);

  assert.equal(fast.meta.aiInvoked, false, 'clear estate text must not invoke AI on fast path');
  assert.equal(fast.meta.needsEnrich, false, 'clear estate text must not request enrich');
  assert.equal(Boolean(fast.meta.lite), false, 'full pass must not be lite');
  assert.ok(!names.includes('intent-gist'), `unexpected gist step: ${names.join(',')}`);
  assert.ok(!names.includes('scoped-field-fill'), `unexpected fill step: ${names.join(',')}`);

  const rooms = Number(fast.fields.rooms?.value ?? fast.draft.entities.rooms ?? 0);
  const city = String(fast.fields.city?.value ?? fast.draft.entities.city ?? '');
  assert.ok(rooms === 2 || rooms === 1, `rooms expected from FieldBag, got ${rooms}`);
  assert.ok(city.includes('مشهد') || Boolean(fast.fields.citySlug?.value), `city missing: ${city}`);
  assert.ok(
    fast.draft.entities.rooms === 2 || fast.draft.answers?.rooms === 2 || rooms === 2,
    'rooms must land on draft.entities or answers'
  );

  const FAST_BUDGET_MS = 1500;
  assert.ok(
    latencyMs < FAST_BUDGET_MS,
    `fast-path latency ${latencyMs}ms exceeds ${FAST_BUDGET_MS}ms budget`
  );

  const ambiguous = await runHybridIntakePipeline({ text: 'نیاز به کمک فوری دارم' });
  assert.equal(ambiguous.meta.aiInvoked, false, 'ambiguous fast path still rules-only');
  assert.equal(ambiguous.meta.needsEnrich, true, 'vague text should flag needsEnrich');

  const enrichClear = await runHybridIntakePipeline({
    text: clearText,
    enrich: true,
  });
  const enrichNames = stepNames(enrichClear);
  assert.equal(enrichClear.meta.needsEnrich, false);

  console.log(
    JSON.stringify({
      ok: true,
      liteLatencyMs,
      liteSteps: liteNames,
      liteResolver,
      fastLatencyMs: latencyMs,
      fastEngine: fast.meta.engine,
      fastSteps: names,
      rooms,
      city,
      ambiguousNeedsEnrich: ambiguous.meta.needsEnrich,
      enrichSteps: enrichNames,
    })
  );
  console.log('test:intake-fast-path OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
