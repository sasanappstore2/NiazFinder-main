import { getAiSemanticConfig } from '@/ai/config/feature-flags';
import { LocalChatAiProvider } from '@/ai/providers/localChatProvider';
import { routeAiResolve } from '@/ai/router/aiRouter';
import { buildIntakeIndexesSync } from '@/intake/dictionaries/loader';
import { tokenize } from '@/intake/tokenizer/tokenize';
import { generateNgrams } from '@/intake/ngrams/generateNgrams';
import { retrieveIntakeCandidates } from '@/ai/services/candidateRetrieval';
import { analyzeNeedText } from '@/intake/engine/intakeEngine';
import type { IntakeFieldBag } from '@/intake/intelligence-engine/types';
import { applyAiPatchToFieldBag } from '@/intake/intelligence-engine/scoring/field-confidence-engine';
import { buildUnresolvedFieldsPrompt } from '@/intake/intelligence-engine/ai/unresolved-fields-prompt';

export interface AiResolverInput {
  text: string;
  normalizedText: string;
  unresolvedFields: string[];
}

export interface AiResolverResult {
  invoked: boolean;
  provider: string | null;
  latencyMs: number;
  patch: Record<string, unknown>;
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

/** AI resolves ONLY missing/low-confidence fields ? never full NeedDraft. */
export async function resolveWithAi(
  input: AiResolverInput,
  fields: IntakeFieldBag
): Promise<AiResolverResult> {
  if (!aiEnabled()) {
    return { invoked: false, provider: null, latencyMs: 0, patch: {}, fields };
  }

  if (input.unresolvedFields.length === 0) {
    return { invoked: false, provider: null, latencyMs: 0, patch: {}, fields };
  }

  const started = performance.now();
  const indexes = buildIntakeIndexesSync();
  const ruleResult = analyzeNeedText(input.text, indexes);
  const tokens = tokenize(ruleResult.normalizedText, { removeStopWords: true });
  const ngrams = generateNgrams(tokens);
  const candidates = retrieveIntakeCandidates(indexes, tokens, ngrams.all, ruleResult);

  const filteredCandidates = {
    ...candidates,
    categories: candidates.categories.filter(() =>
      input.unresolvedFields.some((f) => f.includes('category'))
    ),
    neighborhoods: candidates.neighborhoods.filter(() =>
      input.unresolvedFields.some((f) => f.includes('neighborhood'))
    ),
    transactionTypes: candidates.transactionTypes.filter(() =>
      input.unresolvedFields.some((f) => f.includes('transaction'))
    ),
  };

  const providerName = resolveProviderName();
  const providerInstance =
    providerName === 'local-llm'
      ? new LocalChatAiProvider(undefined, (text, c) =>
          buildUnresolvedFieldsPrompt(text, input.unresolvedFields, c)
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
    if (input.unresolvedFields.includes('categorySlug') && validated.categorySlug) {
      patch.categorySlug = validated.subcategorySlug ?? validated.categorySlug;
    }
    if (input.unresolvedFields.includes('city') && validated.city) patch.city = validated.city;
    if (input.unresolvedFields.includes('citySlug') && validated.citySlug) {
      patch.citySlug = validated.citySlug;
    }
    if (input.unresolvedFields.includes('neighborhoodSlug') && validated.neighborhoodSlug) {
      patch.neighborhoodSlug = validated.neighborhoodSlug;
      patch.neighborhood = validated.neighborhood;
    }
    if (input.unresolvedFields.includes('transactionType') && validated.transactionType) {
      patch.transactionType = validated.transactionType;
    }
    if (input.unresolvedFields.includes('area') && validated.area != null) {
      patch.area = validated.area;
    }
    if (input.unresolvedFields.includes('budgetMax') && validated.budgetMax != null) {
      patch.budgetMax = validated.budgetMax;
    }
    if (input.unresolvedFields.includes('rooms') && validated.rooms != null) {
      patch.rooms = validated.rooms;
    }
  }

  const merged = applyAiPatchToFieldBag({ ...fields }, patch);

  return {
    invoked: providerResult.ok || Boolean(providerResult.extraction),
    provider: providerResult.provider,
    latencyMs: Math.round(performance.now() - started),
    patch,
    fields: merged,
  };
}
