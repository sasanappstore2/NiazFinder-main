/**
 * Hybrid intake runtime helpers — enable hybrid when LLM is healthy,
 * otherwise fall back to rules-only without failing analyze.
 */
import { isHybridIntakeEnabled } from '@/intake/intelligence-engine/hybrid/config';

export type HybridRuntimeMode = 'hybrid' | 'rules-fallback' | 'rules-only';

export interface HybridRuntimeDecision {
  mode: HybridRuntimeMode;
  hybridRequested: boolean;
  llmHealthy: boolean;
  reason: string;
}

/**
 * Decide analyze path for a request.
 * Publish remains rules-only regardless of this decision (ADR-001).
 */
export function resolveHybridRuntime(opts: {
  llmHealthy: boolean;
  /** Force rules even if hybrid env is on (e.g. NEED_INTAKE_RULES_ONLY). */
  rulesOnlyForced?: boolean;
}): HybridRuntimeDecision {
  if (opts.rulesOnlyForced) {
    return {
      mode: 'rules-only',
      hybridRequested: false,
      llmHealthy: opts.llmHealthy,
      reason: 'rules_only_forced',
    };
  }

  const hybridRequested = isHybridIntakeEnabled();
  if (!hybridRequested) {
    return {
      mode: 'rules-only',
      hybridRequested: false,
      llmHealthy: opts.llmHealthy,
      reason: 'hybrid_disabled',
    };
  }

  if (!opts.llmHealthy) {
    return {
      mode: 'rules-fallback',
      hybridRequested: true,
      llmHealthy: false,
      reason: 'llm_unhealthy',
    };
  }

  return {
    mode: 'hybrid',
    hybridRequested: true,
    llmHealthy: true,
    reason: 'hybrid_ready',
  };
}

export function shouldInvokeHybridAi(decision: HybridRuntimeDecision): boolean {
  return decision.mode === 'hybrid';
}
