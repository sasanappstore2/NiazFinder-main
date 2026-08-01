/** Env-driven thresholds for Need Assessment Engine (legacy; AI assessment removed). */

export function getAssessmentMinScore(): number {
  const raw = process.env.NEED_ASSESSMENT_MIN_SCORE;
  const n = raw ? Number(raw) : 72;
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 72;
}

export function getAssessmentRulesOnlyMinScore(): number {
  const raw = process.env.NEED_ASSESSMENT_RULES_ONLY_MIN_SCORE;
  const n = raw ? Number(raw) : 65;
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 65;
}

export function isAssessmentBlockContradictionsEnabled(): boolean {
  const raw = process.env.NEED_ASSESSMENT_BLOCK_CONTRADICTIONS;
  if (raw === 'false' || raw === '0') return false;
  return true;
}

export const RULES_ONLY_SCORE_CAP = 85;

/** MLX assessment disabled — manual wizard has no AI publish gate. */
export function isMlxAssessmentEnabled(): boolean {
  return false;
}
