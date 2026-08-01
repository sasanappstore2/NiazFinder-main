export type {
  IntakeAgentResult,
  IntakeAgentFieldProjection,
  IntakeAgentSuggestedQuestion,
  IntakeAgentWarning,
  IntakeAgentLocation,
  IntakeFieldAction,
  IntakeUserCorrection,
} from '@/intake/agent/types';

export {
  INTAKE_CONFIDENCE_AUTO,
  INTAKE_CONFIDENCE_CONFIRM,
  resolveFieldAction,
  overallConfidenceFromScores,
} from '@/intake/agent/confidence-policy';

export { buildIntakeAgentResult } from '@/intake/agent/build-agent-result';
export { validateAgentResult } from '@/intake/agent/validate-agent-result';
export { applyUserCorrectionToDraft } from '@/intake/agent/apply-user-correction';
export { runIntakeAgent } from '@/intake/agent/run-intake-agent';
