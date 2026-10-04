import { NextRequest, NextResponse } from 'next/server';
import {
  intakeAnalyzeRequestSchema,
  intakeAnalyzeResponseSchema,
} from '@/intake/api/intake.dto';
import { runIntakeIntelligence } from '@/intake/intelligence-engine';
import { formatIntakeAnalyzeResponse } from '@/lib/need-intake/intake-analyze-response';
import {
  guardIntakePayloadSize,
  guardIntakePublicApi,
} from '@/lib/need-intake/intake-api-guard';
import { resolveHybridRuntime } from '@/lib/need-intake/hybrid-runtime';
import { isRulesOnlyIntakeMode } from '@/lib/intake/rules-only-mode';
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
  const oversized = guardIntakePayloadSize(request, 96_000);
  if (oversized) return oversized;

  try {
    const body = await request.json().catch(() => null);
    const parsed = intakeAnalyzeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors.text?.[0] ?? 'Invalid request' },
        { status: 400 },
      );
    }

    const { text, draftRevision, citySlug, cityName, formHints } = parsed.data;
    const forceAi = parsed.data.forceAi === true;

    let result: IntakeIntelligenceResult;
    const intelligenceInput = {
      text,
      draftRevision,
      citySlug,
      cityName,
      formHints,
      forceAi,
    };
    // Prefer warm cache from home typing prefetch. forceAi only bypasses the
    // async queue — not a fresh memory/redis hit for the same text signature.
    if (isIntakeQueueEnabled() && !forceAi) {
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
        skipCache: false,
      });
    }

    const response = formatIntakeAnalyzeResponse(result);
    const hybridRuntime = resolveHybridRuntime({
      llmHealthy: Boolean(
        (result as { meta?: { llmHealthy?: boolean; aiInvoked?: boolean } }).meta?.llmHealthy ??
          (result as { meta?: { aiInvoked?: boolean } }).meta?.aiInvoked ??
          !isRulesOnlyIntakeMode()
      ),
      rulesOnlyForced: isRulesOnlyIntakeMode(),
    });
    const payload = {
      ...response,
      meta: {
        ...(response.meta ?? {}),
        hybridRuntime,
      },
      requestId: result.trace.traceId,
      revision: result.draft.draftRevision ?? parsed.data.draftRevision ?? 0,
    };
    const contract = intakeAnalyzeResponseSchema.safeParse(payload);
    if (!contract.success) {
      console.error('[intake/analyze] response contract violation', contract.error.flatten());
      return NextResponse.json({ error: 'Analyze response contract violation' }, { status: 500 });
    }
    return NextResponse.json(contract.data);
  } catch (err) {
    console.error('[intake/analyze]', err);
    return NextResponse.json({ error: 'Analyze failed' }, { status: 500 });
  }
}
