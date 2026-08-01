/** Client + server rules-only intake mode (no AI in analyze). */

export type IntakeAnalysisMode = 'ai' | 'rules';

function isRulesOnlyFlagOn(): boolean {
  if (process.env.NEXT_PUBLIC_NEED_INTAKE_RULES_ONLY === 'true') return true;
  if (process.env.NEED_INTAKE_RULES_ONLY === 'true') return true;
  return false;
}

function isLlmOrSemanticEnabled(): boolean {
  if (process.env.NEED_INTAKE_LLM_ENABLED === 'true') return true;
  if (process.env.NEXT_PUBLIC_NEED_INTAKE_LLM_ENABLED === 'true') return true;
  if (process.env.AI_SEMANTIC_RESOLVER_ENABLED === 'true') return true;
  if (process.env.NEED_INTAKE_TRUTH_VERIFY_ENABLED === 'true') return true;
  return false;
}

function isHybridEnabled(): boolean {
  return (
    process.env.NEED_INTAKE_HYBRID_ENABLED === 'true' ||
    process.env.NEXT_PUBLIC_NEED_INTAKE_HYBRID_ENABLED === 'true'
  );
}

/** True when analyze must not invoke LLM / semantic AI. */
export function isRulesOnlyIntakeMode(): boolean {
  if (isRulesOnlyFlagOn()) return true;
  if (isLlmOrSemanticEnabled()) return false;
  if (isHybridEnabled()) return false;
  return true;
}

/**
 * Product-facing analysis mode for /post copy and understanding card.
 * `'ai'` only when an LLM/semantic path is actually enabled — hybrid-alone
 * without LLM still shows honest «تحلیل قوانین» labeling.
 */
export function getIntakeAnalysisMode(): IntakeAnalysisMode {
  if (isRulesOnlyFlagOn()) return 'rules';
  if (isLlmOrSemanticEnabled()) return 'ai';
  return 'rules';
}
