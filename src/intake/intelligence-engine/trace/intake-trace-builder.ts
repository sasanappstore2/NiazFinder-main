import type {
  IntakeIntelligenceStepTrace,
  IntakeIntelligenceTrace,
} from '@/intake/intelligence-engine/types';
import { buildTraceId } from '@/intake/intelligence-engine/need-builder/need-builder';
import { fieldBagToRecord } from '@/intake/intelligence-engine/types';

export function createStepTrace(
  name: string,
  started: number,
  resolver?: string,
  summary?: string
): IntakeIntelligenceStepTrace {
  return {
    name,
    latencyMs: Math.round(performance.now() - started),
    resolver,
    summary,
  };
}

export function buildIntelligenceTrace(opts: {
  inputText: string;
  normalizedText: string;
  steps: IntakeIntelligenceStepTrace[];
  fieldMeta: ReturnType<typeof fieldBagToRecord>;
  aiInvoked: boolean;
  aiProvider?: string | null;
  aiLatencyMs?: number;
  cacheHit?: boolean;
  truthVerification?: IntakeIntelligenceTrace['truthVerification'];
}): IntakeIntelligenceTrace {
  return {
    traceId: buildTraceId(opts.inputText),
    inputText: opts.inputText,
    normalizedText: opts.normalizedText,
    steps: opts.steps,
    aiInvoked: opts.aiInvoked,
    aiProvider: opts.aiProvider ?? null,
    aiLatencyMs: opts.aiLatencyMs,
    cacheHit: opts.cacheHit,
    fieldMeta: opts.fieldMeta,
    truthVerification: opts.truthVerification,
  };
}
