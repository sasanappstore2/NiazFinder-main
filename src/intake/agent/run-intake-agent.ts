import { runIntakeIntelligence } from '@/intake/intelligence-engine/orchestrator';
import type { IntakeIntelligenceInput } from '@/intake/intelligence-engine/types';
import { buildIntakeAgentResult } from '@/intake/agent/build-agent-result';
import type { IntakeAgentResult } from '@/intake/agent/types';

export interface RunIntakeAgentOptions {
  existingDraft?: import('@/contracts/need-intake').NeedDraft | null;
  skipCache?: boolean;
}

/**
 * Intake Agent entry: intelligence → validation → product schema.
 * Does not replace the hybrid engine; wraps it for UI/draft consumers.
 */
export async function runIntakeAgent(
  input: IntakeIntelligenceInput,
  opts?: RunIntakeAgentOptions
): Promise<IntakeAgentResult> {
  const intelligence = await runIntakeIntelligence(input, opts);
  return buildIntakeAgentResult(intelligence);
}
