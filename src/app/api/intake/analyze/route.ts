import { NextRequest, NextResponse } from 'next/server';
import { intakeAnalyzeRequestSchema } from '@/intake/api/intake.dto';
import { runIntakeIntelligence } from '@/intake/intelligence-engine';
import { formatIntakeAnalyzeResponse } from '@/lib/need-intake/intake-analyze-response';
import { guardIntakePublicApi } from '@/lib/need-intake/intake-api-guard';
import { isIntakeQueueEnabled } from '@/lib/need-intake/intake-queue-policy';
import {
  enqueueIntakeJobOrchestrated,
  waitForIntakeJobResult,
} from '@/lib/need-intake/intake-queue-orchestrator';
import { INTAKE_JOB_ANALYZE } from '@/lib/need-intake/intake-queue-types';
import type { IntakeIntelligenceResult } from '@/intake/intelligence-engine/types';

export const runtime = 'nodejs';

/** Rules-first intake analyze — Intelligence Engine v1 (queue-backed when enabled). */
export async function POST(request: NextRequest) {
  const rateLimited = guardIntakePublicApi(request, 'analyze', 120);
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json().catch(() => null);
    const parsed = intakeAnalyzeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors.text?.[0] ?? 'Invalid request' },
        { status: 400 },
      );
    }

    const { text, citySlug, cityName, formHints } = parsed.data;

    let result: IntakeIntelligenceResult;
    const intelligenceInput = {
      text,
      citySlug,
      cityName,
      formHints,
      forceAi: parsed.data.forceAi,
    };
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
        skipCache: parsed.data.forceAi === true,
      });
    }

    return NextResponse.json(formatIntakeAnalyzeResponse(result));
  } catch (err) {
    console.error('[intake/analyze]', err);
    return NextResponse.json({ error: 'Analyze failed' }, { status: 500 });
  }
}
