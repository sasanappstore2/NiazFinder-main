import type { IntakeAnalysisResult } from '@/intake/types';

/** Analysis trace metadata (optional session / engine diagnostics). */
export interface IntakeAnalysisTrace {
  analyzedAt?: string;
  source?: string;
  latencyMs?: number;
  capturedAt?: string;
  ruleResult?: IntakeAnalysisResult;
  aiInvoked?: boolean;
  aiExtraction?: unknown;
  validatedPatch?: unknown;
  validationRejects?: unknown[];
  candidates?: unknown;
  aiProvider?: string | null;
  aiLatencyMs?: number;
  ruleConfidence?: number;
}
