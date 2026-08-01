/**
 * Self-test: hybrid runtime fallback.
 * Run: npx tsx src/lib/need-intake/fixtures/run-hybrid-runtime-self-test.ts
 */
import {
  resolveHybridRuntime,
  shouldInvokeHybridAi,
} from '@/lib/need-intake/hybrid-runtime';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

{
  const d = resolveHybridRuntime({ llmHealthy: true, rulesOnlyForced: true });
  assert(d.mode === 'rules-only', 'forced rules');
  assert(!shouldInvokeHybridAi(d), 'no AI when forced');
}

{
  const prev = process.env.NEED_INTAKE_HYBRID_ENABLED;
  process.env.NEED_INTAKE_HYBRID_ENABLED = 'true';
  const unhealthy = resolveHybridRuntime({ llmHealthy: false });
  assert(unhealthy.mode === 'rules-fallback', 'fallback when LLM down');
  assert(!shouldInvokeHybridAi(unhealthy), 'no AI on fallback');
  const healthy = resolveHybridRuntime({ llmHealthy: true });
  assert(healthy.mode === 'hybrid', 'hybrid when healthy');
  assert(shouldInvokeHybridAi(healthy), 'AI on hybrid');
  if (prev === undefined) delete process.env.NEED_INTAKE_HYBRID_ENABLED;
  else process.env.NEED_INTAKE_HYBRID_ENABLED = prev;
}

{
  const prev = process.env.NEED_INTAKE_HYBRID_ENABLED;
  delete process.env.NEED_INTAKE_HYBRID_ENABLED;
  const d = resolveHybridRuntime({ llmHealthy: true });
  assert(d.mode === 'rules-only', 'default rules-only');
  if (prev !== undefined) process.env.NEED_INTAKE_HYBRID_ENABLED = prev;
}

console.log('hybrid-runtime self-test: OK');
