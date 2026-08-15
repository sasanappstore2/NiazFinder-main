import {
  categoryCandidatesForUi,
  runCategoryIntentEngine,
} from '@/intake/intelligence-engine/category/category-intent-engine';
import { scopedMatchToFieldBag } from '@/intake/intelligence-engine/hybrid/scoped-category-bag';
import { rulesCategoryToFieldBag } from '@/intake/rules/resolver/rules-category-resolver';
import type {
  IntakeFieldBag,
  IntakeIntelligenceInput,
} from '@/intake/intelligence-engine/types';
import type { CategoryCandidateOption } from '@/contracts/need-intake';
import type { IntentSliceResult } from '@/intake/intelligence-engine/hybrid/intent-slice-schema';
import { isIntakeAiPassRequested } from '@/intake/intelligence-engine/hybrid/ai-gate';

export interface ResolveCategoryResult {
  fields: Partial<IntakeFieldBag>;
  candidates: CategoryCandidateOption[];
  intent: IntentSliceResult | null;
  method: string;
  aiInvoked: boolean;
  aiProvider: string | null;
  aiLatencyMs: number;
  ambiguousUnresolved: boolean;
}

/**
 * Classic + hybrid share the same category+intent engine.
 */
export async function resolveCategory(
  sourceText: string,
  input: IntakeIntelligenceInput
): Promise<ResolveCategoryResult> {
  const locked = Boolean(input.formHints?.categoryLockedByUser);

  if (locked) {
    const engine = await runCategoryIntentEngine({
      text: sourceText,
      categoryLockedByUser: true,
      lockedCategorySlug: input.formHints?.categorySlug,
      lockedSubcategorySlug: input.formHints?.subcategorySlug,
    });
    return {
      fields: rulesCategoryToFieldBag(sourceText, input),
      candidates: [],
      intent: engine.intent,
      method: engine.method,
      aiInvoked: false,
      aiProvider: null,
      aiLatencyMs: 0,
      ambiguousUnresolved: false,
    };
  }

  const engine = await runCategoryIntentEngine({
    text: sourceText,
    forceAi: input.forceAi,
    allowAi: isIntakeAiPassRequested(input),
  });

  let fields: Partial<IntakeFieldBag>;
  if (engine.match) {
    fields = scopedMatchToFieldBag(engine.match, input, engine.intent);
  } else if (engine.ambiguous) {
    fields = {};
  } else {
    fields = rulesCategoryToFieldBag(sourceText, input);
  }

  return {
    fields,
    candidates: categoryCandidatesForUi(engine.candidates),
    intent: engine.intent,
    method: engine.method,
    aiInvoked: engine.aiInvoked,
    aiProvider: engine.aiProvider,
    aiLatencyMs: engine.aiLatencyMs,
    ambiguousUnresolved: engine.ambiguous && !engine.match,
  };
}
