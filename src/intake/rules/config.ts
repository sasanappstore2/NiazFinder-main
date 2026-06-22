/**
 * Rules-first intake configuration.
 */
export function isIntakeAiGloballyDisabled(): boolean {
  if (process.env.NEED_INTAKE_RULES_ONLY === 'true') return true;
  if (process.env.NEED_INTAKE_LLM_ENABLED === 'true') return false;
  if (process.env.AI_SEMANTIC_RESOLVER_ENABLED === 'true') return false;
  if (process.env.NEED_INTAKE_TRUTH_VERIFY_ENABLED === 'true') return false;
  if (process.env.NEED_INTAKE_HYBRID_ENABLED === 'true') return false;
  return true;
}

export function isHybridIntakeConfigured(): boolean {
  return process.env.NEED_INTAKE_HYBRID_ENABLED === 'true';
}

export function isIntakeRulesOnlyMode(): boolean {
  return isIntakeAiGloballyDisabled();
}

export const RULES_CATEGORY_MIN_CONFIDENCE = 0.75;
export const REGISTRY_CATEGORY_OVERRIDE_THRESHOLD = 0.78;
export const RULES_PACK_TARGET_SIZE = 10_000;
export const RULES_PACKS_DIR = 'src/intake/rules/packs';

/** Top-K rule hypotheses for disambiguation. */
export const RULES_DISAMBIG_TOP_K = 6;
export const RULES_DISAMBIG_MIN_GAP = 0.1;
export const RULES_DISAMBIG_MIN_CONFIDENCE = 0.85;
export const RULES_DISAMBIG_NEAR_TOP_RATIO = 0.6;

export function isIntentSliceEnabled(): boolean {
  return process.env.NEED_INTAKE_INTENT_SLICE_ENABLED === 'true';
}

export function isDisambigAiEnabled(): boolean {
  if (isIntakeAiGloballyDisabled()) return false;
  if (process.env.NEED_INTAKE_DISAMBIG_AI_ENABLED === 'false') return false;
  return (
    process.env.NEED_INTAKE_DISAMBIG_AI_ENABLED === 'true' ||
    process.env.NEED_INTAKE_LLM_ENABLED === 'true' ||
    process.env.NEED_INTAKE_HYBRID_ENABLED === 'true'
  );
}

/**
 * Propose→Validate pipeline: the LLM proposes top-5 category + neighborhood
 * candidates, then the real category tree + location catalog validate them.
 * Coexists with the global AI kill-switch — requires an AI-enable flag.
 */
export function isProposeValidateEnabled(): boolean {
  if (isIntakeAiGloballyDisabled()) return false;
  return process.env.NEED_INTAKE_PROPOSE_VALIDATE_ENABLED === 'true';
}

function pvNum(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Confidence gates for propose→validate finalization (env-overridable). */
export function proposeValidateThresholds() {
  return {
    categoryClearMin: pvNum('PV_CATEGORY_CLEAR_MIN', 0.55),
    categoryClearMargin: pvNum('PV_CATEGORY_CLEAR_MARGIN', 0.08),
    cityCrossCheckMin: pvNum('PV_CITY_CROSSCHECK_MIN', 0.6),
  };
}
