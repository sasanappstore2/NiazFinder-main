import type {
  NeedDraft,
  NextQuestionResponse,
  ParsedIntent,
} from '@/contracts/need-intake';
import type { TypingAnalysisResult } from '@/contracts/typing-analysis';
import { mergeTypingIntoParsed } from '@/lib/typing-analysis/merge-typing-seed';
import {
  countAnsweredRequiredFields,
  isCoreIntakeComplete,
  isStructuredQuestionsDone,
} from '@/lib/need-intake/core-progress';
import { enrichParsedIntent } from '@/lib/need-intake/enrich-parsed-intent';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';
import { getNextQuestion } from '@/lib/need-intake/question-engine';
import { getSchemaForIntake } from '@/config/need-schemas/resolve-schema';

export interface IntakeReadiness {
  readinessScore: number;
  readyToPreview: boolean;
  coreComplete: boolean;
  structuredDone: boolean;
  answeredRequired: number;
  totalRequired: number;
}

const MIN_PROCESSING_MS = 250;

/** Optional short delay so UX feels responsive without blocking on external AI. */
export async function withProcessingDelay<T>(
  fn: () => T | Promise<T>,
  minMs = MIN_PROCESSING_MS
): Promise<T> {
  if (process.env.NEED_INTAKE_SKIP_PROCESSING_DELAY === 'true') {
    return fn();
  }
  const started = Date.now();
  const result = await fn();
  const elapsed = Date.now() - started;
  if (elapsed < minMs) {
    await new Promise((r) => setTimeout(r, minMs - elapsed));
  }
  return result;
}

export function parseFromText(text: string): ParsedIntent {
  return enrichParsedIntent(parseIntentFromText(text));
}

export function mergeTypingHints(
  parsed: ParsedIntent,
  typing: TypingAnalysisResult | null
): ParsedIntent {
  return enrichParsedIntent(mergeTypingIntoParsed(parsed, typing));
}

export function getNextStep(draft: NeedDraft): NextQuestionResponse {
  const { parsedIntent, answers } = draft;
  return getNextQuestion(parsedIntent.intentType, parsedIntent, answers);
}

export function buildReadiness(draft: NeedDraft): IntakeReadiness {
  const { parsedIntent, answers } = draft;
  const schema = getSchemaForIntake(parsedIntent.intentType, parsedIntent.categorySlug);
  const totalRequired = schema.fields.filter((f) => f.required).length;
  const answeredRequired = countAnsweredRequiredFields(parsedIntent, answers);
  const coreComplete = isCoreIntakeComplete(parsedIntent, answers);
  const structuredDone = isStructuredQuestionsDone(parsedIntent, answers);

  let readinessScore = 0.35;
  if (totalRequired > 0) {
    readinessScore = Math.min(0.95, 0.35 + (answeredRequired / totalRequired) * 0.55);
  } else if (answeredRequired >= 2) {
    readinessScore = 0.75;
  }
  if (coreComplete) readinessScore = Math.max(readinessScore, 0.85);
  if (structuredDone && coreComplete) readinessScore = Math.max(readinessScore, 0.92);

  return {
    readinessScore,
    readyToPreview: readinessScore >= 0.85,
    coreComplete,
    structuredDone,
    answeredRequired,
    totalRequired,
  };
}
