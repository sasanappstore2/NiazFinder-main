/**
 * Smoke test: local OpenAI-compatible model (:1234) + Intelligence Engine AI gate.
 * Run: NEED_INTAKE_LLM_ENABLED=true npx tsx scripts/health/smoke-local-llm-intake.ts
 */
import { checkLocalModelHealth, localChatCompletions } from '@/lib/need-intake/local-chat-client';
import { parseLabelsViaLocalChat } from '@/lib/need-intake/local-parse-bridge';
import { runIntakeIntelligence } from '@/intake/intelligence-engine';

const SAMPLE =
  '\u0645\u0646 \u06CC\u06A9 \u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u062F\u0648 \u062E\u0648\u0627\u0628\u0647 \u062F\u0631 \u0648\u0646\u06A9 \u062A\u0647\u0631\u0627\u0646 \u0628\u0631\u0627\u06CC \u0627\u062C\u0627\u0631\u0647 \u0645\u0627\u0647\u06CC \u062F\u0648 \u0645\u06CC\u0644\u06CC\u0648\u0646 \u062A\u0648\u0627\u0646\u0645 \u0628\u062F\u0645';

async function main(): Promise<void> {
  process.env.NEED_INTAKE_LLM_ENABLED = 'true';
  process.env.AI_SEMANTIC_RESOLVER_ENABLED = 'true';
  process.env.AI_PROVIDER = 'local-llm';
  process.env.NEED_INTAKE_LOC_SKIP_PRISMA = 'true';

  const health = await checkLocalModelHealth();
  if (!health.ok) {
    console.error('FAIL local model health:', health.loadError ?? 'no models');
    process.exit(1);
  }
  console.log('ok health model=', health.modelId, 'models=', health.models?.join(','));

  const ping = await localChatCompletions(
    [{ role: 'user', content: 'Reply with JSON: {"ok":true}' }],
    { maxTokens: 32 }
  );
  if (!ping) {
    console.error('FAIL chat ping');
    process.exit(1);
  }
  console.log('ok chat ping', ping.latencyMs, 'ms');

  const parsed = await parseLabelsViaLocalChat(SAMPLE);
  if (!parsed?.labels.categorySlug) {
    console.warn('WARN parse-bridge returned no category (model may need tuning)');
  } else {
    console.log('ok parse-bridge category=', parsed.labels.categorySlug);
  }

  const intel = await runIntakeIntelligence(
    { text: SAMPLE, forceAi: true },
    { skipCache: true }
  );
  console.log(
    'ok intelligence engine',
    'ai=',
    intel.meta.aiInvoked,
    'provider=',
    intel.trace.aiProvider,
    'latency=',
    intel.meta.latencyMs,
    'ms'
  );

  console.log('smoke-local-llm-intake OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
