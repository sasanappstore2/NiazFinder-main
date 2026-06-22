/**
 * Thin service wrappers for the read-only intake endpoints (next-question,
 * extract-slots, preview-listing). They take already-validated input (Zod at the
 * route boundary) and delegate to the existing engine functions, so the route
 * handlers shrink to parse → service → serialize.
 */
import type {
  IntentType,
  ParsedIntent,
  NeedDraft,
} from '@/contracts/need-intake';
import { getNextQuestion } from '@/lib/need-intake/question-engine';
import { extractSlotsFromRules } from '@/lib/need-intake/extract-slots-rules';
import { buildListingPreview } from '@/lib/need-intake/preview-listing';
import type {
  NextQuestionRequestBody,
  ExtractSlotsRequestBody,
  PreviewListingRequestBody,
} from '@/intake/server/validation/requestSchemas';

export function getNextQuestionService(input: NextQuestionRequestBody) {
  return getNextQuestion(
    input.intentType as IntentType,
    input.parsedIntent as unknown as ParsedIntent,
    input.answers,
  );
}

export function extractSlotsService(input: ExtractSlotsRequestBody) {
  const slots = extractSlotsFromRules(
    input.parsedIntent as unknown as ParsedIntent,
    input.answers,
    input.lastAnswer,
  );
  return { slots, meta: { engine: 'internal' as const } };
}

export async function previewListingService(input: PreviewListingRequestBody) {
  const extras = input.extras?.filter((e) => typeof e === 'string' && e.trim());
  const preview = await buildListingPreview(input.draft as unknown as NeedDraft, extras);
  return {
    title: preview.title,
    description: preview.description,
    budgetMin: preview.budgetMin,
    budgetMax: preview.budgetMax,
    suggestedExtras: preview.extras,
    titleSource: preview.titleSource,
  };
}
