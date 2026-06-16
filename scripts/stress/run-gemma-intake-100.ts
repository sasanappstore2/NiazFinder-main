/**
 * Generate 100 random Persian needs via Gemma, run Intelligence Engine + truth verify.
 *
 * Run:
 *   npm run test:gemma-intake-100
 *   npm run test:gemma-intake-100 -- --count 20   # quick subset
 *
 * Requires Gemma on NEED_INTAKE_LLM_URL (default http://127.0.0.1:1234).
 */
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { checkLocalModelHealth, localChatCompletions } from '@/lib/need-intake/local-chat-client';
import { extractJsonFromChatContent } from '@/lib/need-intake/local-chat-client';
import { runIntakeIntelligence } from '@/intake/intelligence-engine';
import { clearIntelligenceCache } from '@/lib/need-intake/intake-parse-cache-store';

const DEFAULT_COUNT = 100;
const BATCH_SIZE = 10;

const FALLBACK_NEEDS: string[] = [
  '\u0645\u0646 \u06CC\u06A9 \u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u0633\u0647 \u062E\u0648\u0627\u0628\u0647 \u062F\u0631 \u0646\u06CC\u0627\u0648\u0631\u0627\u0646 \u062A\u0647\u0631\u0627\u0646 \u0628\u0631\u0627\u06CC \u0627\u062C\u0627\u0631\u0647 \u0645\u06CC\u062E\u0648\u0627\u0645',
  '\u0648\u06CC\u0644\u0627 \u062F\u0648\u0628\u0644\u06A9\u0633 \u062F\u0631 \u0645\u0634\u0647\u062F \u0628\u0631\u0627\u06CC \u062E\u0631\u06CC\u062F \u062A\u0627 \u067E\u0646\u062C \u0645\u06CC\u0644\u06CC\u0627\u0631\u062F',
  '\u0645\u063A\u0627\u0632\u0647 \u067E\u0648\u0646\u0635\u062F \u0645\u062A\u0631\u06CC \u062F\u0631 \u062A\u0647\u0631\u0627\u0646 \u0631\u0647\u0646 \u0648 \u062F\u0648 \u0645\u06CC\u0644\u06CC\u0648\u0646 \u0627\u062C\u0627\u0631\u0647',
  '\u062F\u0646\u0628\u0627\u0644 \u0644\u0648\u0644\u0647\u200C\u0633\u0627\u0632 \u0628\u0631\u0627\u06CC \u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u062F\u0631 \u0648\u0646\u06A9 \u062A\u0647\u0631\u0627\u0646',
  '\u0622\u06CC\u0641\u0648\u0646 13 \u062F\u0633\u062A\u062F\u0648 \u062A\u0645\u06CC\u0632 \u062F\u0631 \u0627\u0635\u0641\u0647\u0627\u0646 \u0628\u0627 \u0628\u0627\u062A\u0631\u06CC \u0633\u0627\u0644\u0645',
  '\u062E\u0648\u062F\u0631\u0648 \u067E\u0631\u0627\u06CC\u062F \u062F\u0631 \u0634\u06CC\u0631\u0627\u0632 \u0628\u0631\u0627\u06CC \u0641\u0631\u0648\u0634 \u0641\u0648\u0631\u06CC',
  '\u0646\u0648\u0632\u062F \u0628\u0631\u0642 \u0631\u0627 \u062F\u0631 \u062A\u0628\u0631\u06CC\u0632 \u0646\u0635\u0628 \u0645\u06CC\u062E\u0648\u0627\u0645',
  '\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 120 \u0645\u062A\u0631\u06CC \u062F\u0631 \u0627\u0644\u0647\u0645\u200C\u0634\u0647\u0631 \u062A\u0647\u0631\u0627\u0646 \u0627\u062C\u0627\u0631\u0647 \u0633\u0627\u0644\u0627\u0646\u0647',
  '\u067E\u0644\u0627\u06CC\u0633\u062A\u06CC\u0646 \u0628\u0631\u0627\u06CC \u062A\u0639\u0645\u06CC\u0631 \u0622\u06CC\u0641\u0648\u0646 \u0635\u0641\u062D\u0647 \u0634\u06A9\u0633\u062A\u0647',
  '\u062F\u0646\u0628\u0627\u0644 \u0645\u0639\u0645\u0627\u0631 \u0628\u0631\u0627\u06CC \u0633\u0627\u062E\u062A\u0645\u0627\u0646 \u0648\u0644\u0627\u06CC\u062A \u062F\u0631 \u06A9\u0631\u062C',
];

function parseArgs(): { count: number; skipGenerate: boolean; forceAi: boolean } {
  const args = process.argv.slice(2);
  let count = DEFAULT_COUNT;
  let skipGenerate = false;
  let forceAi = process.env.NEED_INTAKE_TRUTH_VERIFY_ALWAYS === 'true';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count' && args[i + 1]) count = Math.max(1, Number(args[i + 1]) || DEFAULT_COUNT);
    if (args[i] === '--skip-generate') skipGenerate = true;
    if (args[i] === '--force-ai') forceAi = true;
  }
  return { count, skipGenerate, forceAi };
}

async function generateNeedBatch(batchIndex: number, size: number): Promise<string[]> {
  const topics = [
    'real-estate rent/buy in Tehran/Mashhad/Isfahan',
    'services (plumber, electrician, moving)',
    'vehicles buy/sell',
    'jobs',
    'electronics',
  ];
  const topic = topics[batchIndex % topics.length];

  const chat = await localChatCompletions(
    [
      {
        role: 'system',
        content:
          'You write realistic Persian need posts for Iranian marketplace NiazFinder. JSON only, no markdown.',
      },
      {
        role: 'user',
        content: `Write exactly ${size} unique Persian need texts about: ${topic}.
Each 1-2 sentences, natural colloquial Persian, include city/neighborhood/price/area when relevant.
Return JSON: {"needs":["text1","text2",...]}`,
      },
    ],
    { maxTokens: 1800, temperature: 0.85 }
  );

  if (!chat) return [];

  const json = extractJsonFromChatContent(chat.content) as { needs?: unknown } | null;
  if (!json || !Array.isArray(json.needs)) return [];

  return json.needs
    .filter((n): n is string => typeof n === 'string' && n.trim().length >= 8)
    .map((n) => n.trim())
    .slice(0, size);
}

async function generateNeeds(total: number): Promise<string[]> {
  const out: string[] = [];
  let batch = 0;

  while (out.length < total) {
    const need = total - out.length;
    const size = Math.min(BATCH_SIZE, need);
    process.stdout.write(`\r  generating batch ${batch + 1} (${out.length}/${total})...`);

    const batchNeeds = await generateNeedBatch(batch, size);
    if (batchNeeds.length === 0) {
      console.warn(`\nWARN batch ${batch} empty ? using fallbacks`);
      for (let i = 0; i < size && out.length < total; i++) {
        out.push(FALLBACK_NEEDS[(out.length + i) % FALLBACK_NEEDS.length]!);
      }
    } else {
      out.push(...batchNeeds);
    }

    batch += 1;
    if (batch > Math.ceil(total / BATCH_SIZE) + 5) break;
  }

  console.log(`\n  generated ${out.length} need texts`);
  return out.slice(0, total);
}

function padFallback(needs: string[], total: number): string[] {
  const out = [...needs];
  while (out.length < total) {
    out.push(FALLBACK_NEEDS[out.length % FALLBACK_NEEDS.length]!);
  }
  return out.slice(0, total);
}

async function main(): Promise<void> {
  process.env.NEED_INTAKE_LLM_ENABLED = 'true';
  process.env.AI_SEMANTIC_RESOLVER_ENABLED = 'true';
  process.env.AI_PROVIDER = 'local-llm';
  process.env.NEED_INTAKE_TRUTH_VERIFY_ENABLED = 'true';
  process.env.NEED_INTAKE_LOC_SKIP_PRISMA = 'true';
  process.env.NEED_INTAKE_LLM_TIMEOUT_MS = '25000';

  const { count, skipGenerate, forceAi } = parseArgs();

  const health = await checkLocalModelHealth();
  if (!health.ok) {
    console.error('FAIL: Gemma not reachable at NEED_INTAKE_LLM_URL ? start LM Studio on :1234');
    console.error('  ', health.loadError);
    process.exit(1);
  }
  console.log(`model=${health.modelId} | testing ${count} needs | forceAi=${forceAi}`);

  clearIntelligenceCache();

  let needs: string[];
  if (skipGenerate) {
    needs = padFallback([], count);
  } else {
    needs = await generateNeeds(count);
    if (needs.length < count) needs = padFallback(needs, count);
  }

  const stats = {
    total: needs.length,
    ok: 0,
    errors: 0,
    aiInvoked: 0,
    aiAttempted: 0,
    truthCorrected: 0,
    latencies: [] as number[],
    corrections: {} as Record<string, number>,
    failures: [] as Array<{ id: number; error: string; text: string }>,
  };

  for (let i = 0; i < needs.length; i++) {
    const text = needs[i]!;
    process.stdout.write(`\r  intake ${i + 1}/${needs.length}...`);

    try {
      const result = await runIntakeIntelligence({ text, forceAi }, { skipCache: true });
      stats.ok += 1;
      stats.latencies.push(result.meta.latencyMs);
      if (result.meta.aiInvoked) stats.aiInvoked += 1;
      if (result.trace.truthVerification?.invoked || result.meta.aiInvoked) {
        stats.aiAttempted += 1;
      }
      const corrected = result.meta.truthVerifyCorrected ?? [];
      if (corrected.length) {
        stats.truthCorrected += 1;
        for (const f of corrected) {
          stats.corrections[f] = (stats.corrections[f] ?? 0) + 1;
        }
      }
    } catch (e) {
      stats.errors += 1;
      stats.failures.push({
        id: i,
        error: e instanceof Error ? e.message : String(e),
        text: text.slice(0, 80),
      });
    }
  }

  console.log('');

  const sorted = [...stats.latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;

  const report = {
    at: new Date().toISOString(),
    model: health.modelId,
    ...stats,
    latencyP50Ms: p50,
    latencyP95Ms: p95,
    aiRate: stats.aiInvoked / stats.total,
    truthCorrectRate: stats.truthCorrected / stats.total,
    needsSample: needs.slice(0, 5),
  };

  const outDir = path.join(process.cwd(), 'reports');
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `gemma-intake-${count}-${Date.now()}.json`);
  await writeFile(outPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('--- results ---');
  console.log(`ok: ${stats.ok}/${stats.total} errors: ${stats.errors}`);
  console.log(`ai invoked: ${stats.aiInvoked} (${((stats.aiInvoked / stats.total) * 100).toFixed(0)}%) attempted: ${stats.aiAttempted}`);
  console.log(`truth corrected: ${stats.truthCorrected} (${((stats.truthCorrected / stats.total) * 100).toFixed(0)}%)`);
  console.log(`latency p50=${p50}ms p95=${p95}ms`);
  if (Object.keys(stats.corrections).length) {
    console.log('top corrections:', stats.corrections);
  }
  if (stats.failures.length) {
    console.log('failures:', stats.failures.slice(0, 5));
  }
  console.log(`report: ${outPath}`);

  if (stats.errors > 0) {
    process.exit(1);
  }
  console.log('gemma-intake-100 OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
