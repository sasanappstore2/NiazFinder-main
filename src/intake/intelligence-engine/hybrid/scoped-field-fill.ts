import { getAiSemanticConfig } from '@/ai/config/feature-flags';
import { LocalChatAiProvider } from '@/ai/providers/localChatProvider';
import { routeAiResolve } from '@/ai/router/aiRouter';
import { retrieveIntakeCandidates } from '@/ai/services/candidateRetrieval';
import { buildIntakeIndexesSync } from '@/intake/dictionaries/loader';
import { analyzeNeedText } from '@/intake/engine/intakeEngine';
import type { IntentSliceResult } from '@/intake/intelligence-engine/hybrid/intent-slice-schema';
import { buildUnresolvedFieldsPrompt } from '@/intake/intelligence-engine/ai/unresolved-fields-prompt';
import {
  applyAiPatchToFieldBag,
  fieldsNeedingAi,
} from '@/intake/intelligence-engine/scoring/field-confidence-engine';
import type { IntakeFieldBag } from '@/intake/intelligence-engine/types';
import { packRequiredFieldKeys } from '@/intake/intelligence-engine/hybrid/pack-required-gaps';
import { generateNgrams } from '@/intake/ngrams/generateNgrams';
import { tokenize } from '@/intake/tokenizer/tokenize';
import { isIntakeAiGloballyDisabled } from '@/intake/rules/config';

export interface ScopedFieldFillInput {
  text: string;
  normalizedText: string;
  fields: IntakeFieldBag;
  intentSlice: IntentSliceResult | null;
  extraUnresolved?: string[];
}

export interface ScopedFieldFillResult {
  invoked: boolean;
  provider: string | null;
  latencyMs: number;
  unresolvedFields: string[];
  fields: IntakeFieldBag;
}

function aiEnabled(): boolean {
  const config = getAiSemanticConfig();
  return config.enabled || process.env.NEED_INTAKE_LLM_ENABLED === 'true';
}

function resolveProviderName(): string {
  if (process.env.AI_PROVIDER?.trim()) return process.env.AI_PROVIDER.trim();
  if (process.env.NEED_INTAKE_LLM_ENABLED === 'true') return 'local-llm';
  return getAiSemanticConfig().provider;
}

function mapPackFieldToBagKey(field: string): string {
  const map: Record<string, string> = {
    city: 'city',
    dealType: 'transactionType',
    transactionType: 'transactionType',
    budget: 'budgetMax',
    neighborhood: 'neighborhoodSlug',
    categorySlug: 'categorySlug',
  };
  return map[field] ?? field;
}

export function collectHybridUnresolvedFields(
  bag: IntakeFieldBag,
  intentSlice: IntentSliceResult | null
): string[] {
  const vertical = intentSlice?.vertical ?? String(bag.vertical?.value ?? '');
  const fromConfidence = fieldsNeedingAi(bag, { threshold: 0.6, vertical });

  const categorySlug = String(bag.subcategorySlug?.value ?? bag.categorySlug?.value ?? '');
  const packFields = packRequiredFieldKeys(categorySlug).map(mapPackFieldToBagKey);

  return [...new Set([...fromConfidence, ...packFields])];
}

/** Stage 5: single LLM call to fill unresolved fields with top-N candidates only. */
export async function runScopedFieldFill(
  input: ScopedFieldFillInput
): Promise<ScopedFieldFillResult> {
  const unresolved = [
    ...new Set([
      ...collectHybridUnresolvedFields(input.fields, input.intentSlice),
      ...(input.extraUnresolved ?? []),
    ]),
  ];

  if (isIntakeAiGloballyDisabled() || !aiEnabled() || unresolved.length === 0) {
    return {
      invoked: false,
      provider: null,
      latencyMs: 0,
      unresolvedFields: unresolved,
      fields: input.fields,
    };
  }

  const started = performance.now();
  const indexes = buildIntakeIndexesSync();
  const ruleResult = analyzeNeedText(input.text, indexes);
  const tokens = tokenize(ruleResult.normalizedText, { removeStopWords: true });
  const ngrams = generateNgrams(tokens);

  const verticalFilter = input.intentSlice ? [input.intentSlice.vertical] : undefined;
  const candidates = retrieveIntakeCandidates(indexes, tokens, ngrams.all, ruleResult, {
    verticalFilter,
    maxCategories: 8,
  });

  const filteredCandidates = {
    ...candidates,
    categories: unresolved.some((f) => f.includes('category'))
      ? candidates.categories
      : [],
    cities: unresolved.some((f) => f.includes('city')) ? candidates.cities : [],
    neighborhoods: unresolved.some((f) => f.includes('neighborhood'))
      ? candidates.neighborhoods
      : [],
    transactionTypes: unresolved.some((f) => f.includes('transaction'))
      ? candidates.transactionTypes
      : [],
  };

  const providerName = resolveProviderName();
  const providerInstance =
    providerName === 'local-llm'
      ? new LocalChatAiProvider(undefined, (text, c) =>
          buildUnresolvedFieldsPrompt(text, unresolved, c)
        )
      : undefined;

  const providerResult = await routeAiResolve(
    {
      text: input.text,
      normalizedText: input.normalizedText,
      ruleResult,
      candidates: filteredCandidates,
    },
    providerInstance ?? providerName
  );

  const patch: Record<string, unknown> = {};
  const validated = providerResult.validatedEntities;
  if (validated) {
    if (unresolved.includes('categorySlug') && validated.categorySlug) {
      patch.categorySlug = validated.subcategorySlug ?? validated.categorySlug;
    }
    if (unresolved.includes('city') && validated.city) patch.city = validated.city;
    if (unresolved.includes('citySlug') && validated.citySlug) {
      patch.citySlug = validated.citySlug;
    }
    if (unresolved.includes('neighborhoodSlug') && validated.neighborhoodSlug) {
      patch.neighborhoodSlug = validated.neighborhoodSlug;
      patch.neighborhood = validated.neighborhood;
    }
    if (unresolved.includes('transactionType') && validated.transactionType) {
      patch.transactionType = validated.transactionType;
    }
    if (unresolved.includes('area') && validated.area != null) patch.area = validated.area;
    if (unresolved.includes('budgetMax') && validated.budgetMax != null) {
      patch.budgetMax = validated.budgetMax;
    }
    if (unresolved.includes('rooms') && validated.rooms != null) patch.rooms = validated.rooms;
  }

  const merged = applyAiPatchToFieldBag({ ...input.fields }, patch);

  return {
    invoked: providerResult.ok || Boolean(providerResult.extraction),
    provider: providerResult.provider,
    latencyMs: Math.round(performance.now() - started),
    unresolvedFields: unresolved,
    fields: merged,
  };
}
