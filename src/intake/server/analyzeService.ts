/**
 * Service wrapper for POST /api/intake/analyze. Encapsulates the queue-vs-inline
 * decision and response formatting so the route is just: rate-limit → parse →
 * analyzeNeed → json. Response shape is unchanged (formatIntakeAnalyzeResponse).
 */
import { runIntakeIntelligence } from '@/intake/intelligence-engine';
import { formatIntakeAnalyzeResponse } from '@/lib/need-intake/intake-analyze-response';
import { isIntakeQueueEnabled } from '@/lib/need-intake/intake-queue-policy';
import {
  enqueueIntakeJobOrchestrated,
  waitForIntakeJobResult,
} from '@/lib/need-intake/intake-queue-orchestrator';
import { INTAKE_JOB_ANALYZE } from '@/lib/need-intake/intake-queue-types';
import type { IntakeIntelligenceResult } from '@/intake/intelligence-engine/types';
import type { z } from 'zod';
import type { intakeAnalyzeRequestSchema } from '@/intake/api/intake.dto';

type AnalyzeInput = z.infer<typeof intakeAnalyzeRequestSchema>;

export async function analyzeNeed(input: AnalyzeInput) {
  const intelligenceInput = {
    text: input.text,
    citySlug: input.citySlug,
    cityName: input.cityName,
    formHints: input.formHints,
    forceAi: input.forceAi,
  };

  let result: IntakeIntelligenceResult;
  if (isIntakeQueueEnabled()) {
    const enqueued = await enqueueIntakeJobOrchestrated({
      jobName: INTAKE_JOB_ANALYZE,
      payload: intelligenceInput,
    });
    if (enqueued.syncFallback && enqueued.result) {
      result = enqueued.result as IntakeIntelligenceResult;
    } else {
      result = (await waitForIntakeJobResult(enqueued.jobId)) as IntakeIntelligenceResult;
    }
  } else {
    result = await runIntakeIntelligence(intelligenceInput, {
      skipCache: input.forceAi === true,
    });
  }

  return formatIntakeAnalyzeResponse(result);
}
