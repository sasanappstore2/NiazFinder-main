/** Client + server rules-only intake mode (no AI in analyze). */
export function isRulesOnlyIntakeMode(): boolean {
  if (process.env.NEXT_PUBLIC_NEED_INTAKE_RULES_ONLY === 'true') return true;
  if (process.env.NEED_INTAKE_RULES_ONLY === 'true') return true;
  if (process.env.NEED_INTAKE_LLM_ENABLED === 'true') return false;
  if (process.env.AI_SEMANTIC_RESOLVER_ENABLED === 'true') return false;
  if (process.env.NEED_INTAKE_TRUTH_VERIFY_ENABLED === 'true') return false;
  return true;
}
