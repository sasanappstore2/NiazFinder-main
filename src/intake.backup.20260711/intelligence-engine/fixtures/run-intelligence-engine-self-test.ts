/**
 * Intelligence Engine v1 golden self-test (rules-first, no live AI required).
 */
import type { IntakeIntelligenceResult } from '@/intake/intelligence-engine/types';

async function stubServerOnly(): Promise<void> {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const p = require.resolve('server-only');
  require.cache[p] = {
    id: p,
    filename: p,
    loaded: true,
    exports: {},
  } as NodeModule;
}

const NIAVARAN_TEXT =
  '\u0645\u0646 \u06CC\u06A9 \u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 190 \u0645\u062A\u0631\u06CC \u0645\u06CC\u062E\u0648\u0627\u0645 \u062F\u0631 \u0646\u06CC\u0627\u0648\u0631\u0627\u0646 \u062A\u0647\u0631\u0627\u0646 \u067E\u0646\u062C\u0627\u0647 \u0645\u06CC\u0644\u06CC\u0648\u0646 \u0627\u062C\u0627\u0631\u0647 \u0645\u06CC\u062A\u0648\u0646\u0645 \u0628\u062F\u0645 \u0648 \u0633\u06CC\u0635\u062F \u0645\u06CC\u06CC\u0644\u0648\u0646 \u0647\u0645 \u0631\u0647\u0646 \u062F\u0627\u0631\u0645';

const PON_SAD_TEXT =
  '\u0645\u063A\u0627\u0632\u0647 100 \u0645\u062A\u0631\u06CC \u067E\u0648\u0646\u0635\u062F \u0645\u06CC\u0644\u06CC\u0648\u0646 \u0631\u0647\u0646 \u0648 \u062F\u0648\u0627\u0632\u062F\u0647 \u0645\u06CC\u0644\u06CC\u0648\u0646 \u0627\u062C\u0627\u0631\u0647';

const VANAK_TEXT =
  '\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u062F\u0648 \u062E\u0648\u0627\u0628\u0647 \u062F\u0631 \u0648\u0646\u06A9 \u062A\u0647\u0631\u0627\u0646 \u0628\u0631\u0627\u06CC \u0627\u062C\u0627\u0631\u0647';

const HOOD_NIAVARAN = '\u0646\u06CC\u0627\u0648\u0631\u0627\u0646';

const CASES: Array<{
  id: string;
  text: string;
  assert: (r: IntakeIntelligenceResult) => string | null;
}> = [
  {
    id: 'niavaran-190-rahn-rent',
    text: NIAVARAN_TEXT,
    assert: (r) => {
      if (r.fields.area?.value !== 190) return `area=${r.fields.area?.value}`;
      if (r.fields.monthlyRent?.value !== 50_000_000) return `rent=${r.fields.monthlyRent?.value}`;
      if (r.fields.rahnAmount?.value !== 300_000_000) return `rahn=${r.fields.rahnAmount?.value}`;
      const hood = String(r.fields.neighborhood?.value ?? '');
      if (!hood.includes(HOOD_NIAVARAN)) return `hood=${hood}`;
      if (r.fields.transactionType?.value !== 'DEPOSIT_AND_RENT') {
        return `tx=${r.fields.transactionType?.value}`;
      }
      if (r.meta.latencyMs > 10000) return `latency=${r.meta.latencyMs}ms > 10000ms (cold)`;
      return null;
    },
  },
  {
    id: 'pon-sad-shop',
    text: PON_SAD_TEXT,
    assert: (r) => {
      if (r.fields.rahnAmount?.value !== 500_000_000) return `rahn=${r.fields.rahnAmount?.value}`;
      if (r.fields.monthlyRent?.value !== 12_000_000) return `rent=${r.fields.monthlyRent?.value}`;
      return null;
    },
  },
  {
    id: 'field-meta-present',
    text: VANAK_TEXT,
    assert: (r) => {
      if (!r.trace.fieldMeta.city?.source) return 'missing city source';
      if ((r.trace.fieldMeta.city?.confidence ?? 0) < 0.5) return 'city confidence low';
      return null;
    },
  },
];

async function main(): Promise<void> {
  await stubServerOnly();
  const { runIntakeIntelligence } = await import('@/intake/intelligence-engine/orchestrator');

  process.env.AI_SEMANTIC_RESOLVER_ENABLED = 'false';
  process.env.NEED_INTAKE_LLM_ENABLED = 'false';

  let failed = 0;
  let aiCount = 0;

  for (const c of CASES) {
    const result = await runIntakeIntelligence({ text: c.text }, { skipCache: true });
    if (result.meta.aiInvoked) aiCount += 1;
    const err = c.assert(result);
    if (err) {
      console.error(`FAIL ${c.id}: ${err}`);
      failed += 1;
    } else {
      console.log(`ok ${c.id} (${result.meta.latencyMs}ms, ai=${result.meta.aiInvoked})`);
    }
  }

  const noAiRate = 1 - aiCount / CASES.length;
  if (noAiRate < 0.5) {
    console.error(`WARN ai-free rate ${(noAiRate * 100).toFixed(0)}% below 50% on golden set`);
  }

  if (failed > 0) {
    console.error(`intelligence-engine: ${failed} failed`);
    process.exit(1);
  }
  console.log('intelligence-engine self-test OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
