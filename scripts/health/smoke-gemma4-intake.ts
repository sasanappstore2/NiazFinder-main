/**
 * Smoke: GEMMA4 intake service (:8100) + hybrid intent slice JSON.
 *
 * Run: npm run smoke:gemma4-intake
 */
import { checkLocalModelHealth, localChatCompletions } from '@/lib/need-intake/local-chat-client';
import { runIntentSlice } from '@/intake/intelligence-engine/hybrid/intent-slice';
import { runHybridIntakePipeline } from '@/intake/intelligence-engine/hybrid/hybrid-pipeline';

const SAMPLE =
  'دنبال لوله‌کش برای رفع نشتی در ونک تهران هستم';

async function main(): Promise<void> {
  process.env.NEED_INTAKE_HYBRID_ENABLED = 'true';
  process.env.NEED_INTAKE_LLM_ENABLED = 'true';
  process.env.AI_SEMANTIC_RESOLVER_ENABLED = 'true';
  process.env.AI_PROVIDER = 'local-llm';
  process.env.NEED_INTAKE_LOC_SKIP_PRISMA = 'true';

  const health = await checkLocalModelHealth();
  if (!health.ok) {
    console.error('FAIL gemma4 health:', health.loadError ?? 'model not ready');
    process.exit(1);
  }
  console.log('ok health model=', health.modelId);

  const ping = await localChatCompletions(
    [{ role: 'user', content: 'Reply with JSON only: {"ok":true}' }],
    { maxTokens: 32, temperature: 0.1 }
  );
  if (!ping?.content) {
    console.error('FAIL chat ping');
    process.exit(1);
  }
  console.log('ok chat ping', ping.latencyMs, 'ms');

  const slice = await runIntentSlice(SAMPLE);
  if (!slice?.vertical || !slice.intentType) {
    console.error('FAIL intent slice — invalid JSON:', slice);
    process.exit(1);
  }
  console.log('ok intent-slice', slice.vertical, slice.intentType, 'conf=', slice.confidence);

  const hybrid = await runHybridIntakePipeline({ text: SAMPLE, forceAi: true });
  console.log(
    'ok hybrid pipeline',
    'engine=',
    hybrid.meta.engine,
    'category=',
    hybrid.fields.categorySlug?.value ?? hybrid.fields.subcategorySlug?.value,
    'ai=',
    hybrid.meta.aiInvoked
  );

  console.log('smoke-gemma4-intake OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
