/**
 * Rules-first intake configuration.
 */
export function isIntakeAiGloballyDisabled(): boolean {
  if (process.env.NEED_INTAKE_RULES_ONLY === 'true') return true;
  if (process.env.NEED_INTAKE_LLM_ENABLED === 'true') return false;
  if (process.env.AI_SEMANTIC_RESOLVER_ENABLED === 'true') return false;
  if (process.env.NEED_INTAKE_TRUTH_VERIFY_ENABLED === 'true') return false;
  return true;
}

export function isIntakeRulesOnlyMode(): boolean {
  return isIntakeAiGloballyDisabled();
}

export const RULES_CATEGORY_MIN_CONFIDENCE = 0.75;
export const REGISTRY_CATEGORY_OVERRIDE_THRESHOLD = 0.78;
export const RULES_PACK_TARGET_SIZE = 10_000;
export const RULES_PACKS_DIR = 'src/intake/rules/packs';
