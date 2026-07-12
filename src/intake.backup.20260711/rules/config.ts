import {
  getIntakeAnalysisMode,
  isRulesOnlyIntakeMode,
  type IntakeAnalysisMode,
} from '@/lib/intake/rules-only-mode';

export type { IntakeAnalysisMode };
export { getIntakeAnalysisMode };

/**
 * Rules-first intake configuration.
 * Prefer `getIntakeAnalysisMode()` / `isRulesOnlyIntakeMode()` for product UX;
 * this flag is the server gate for invoking LLM paths.
 */
export function isIntakeAiGloballyDisabled(): boolean {
  return isRulesOnlyIntakeMode();
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
/** Smaller cartesian target for estate leaves — collision table covers cross-category cases. */
export const RULES_ESTATE_PACK_TARGET_SIZE = 2_000;
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
