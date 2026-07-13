export { runIntakeIntelligence } from '@/intake/intelligence-engine/orchestrator';
export { runHybridIntakePipeline } from '@/intake/intelligence-engine/hybrid/hybrid-pipeline';
export { isHybridIntakeEnabled } from '@/intake/intelligence-engine/hybrid/config';
export { runTruthVerification, truthVerifyEnabled } from '@/intake/intelligence-engine/ai/truth-verifier';
export type { TruthVerifierResult } from '@/intake/intelligence-engine/ai/truth-verifier';
export type {
  IntakeIntelligenceInput,
  IntakeIntelligenceResult,
  IntakeFieldBag,
  FieldState,
  FieldSource,
} from '@/intake/intelligence-engine/types';
