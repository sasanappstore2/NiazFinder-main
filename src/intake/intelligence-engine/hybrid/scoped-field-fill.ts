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
  forceAi?: boolean;
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
  intentSlice: IntentSliceResult | null,
  opts?: { forceAi?: boolean }
): string[] {
  const vertical = intentSlice?.vertical ?? String(bag.vertical?.value ?? '');
  const fromConfidence = fieldsNeedingAi(bag, { threshold: 0.6, vertical });

  const categorySlug = String(bag.subcategorySlug?.value ?? bag.categorySlug?.value ?? '');
  const packFields = packRequiredFieldKeys(categorySlug).map(mapPackFieldToBagKey);

  const criticalPropertyKeys = [
    'budgetMax',
    'budgetMin',
    'rahnAmount',
    'monthlyRent',
    'rooms',
    'area',
    'deposit',
  ] as const;

  const weakCritical: string[] = [];
  for (const key of criticalPropertyKeys) {
    const f = bag[key];
    if (!f?.value || f.value === '' || (f.confidence ?? 0) < 0.6) {
      // Only ask AI for rent/rahn when deal type suggests it, or when forceAi.
      if (
        (key === 'rahnAmount' || key === 'monthlyRent' || key === 'deposit') &&
        !opts?.forceAi
      ) {
        const tx = String(bag.transactionType?.value ?? bag.dealType?.value ?? '');
        const rentish =
          /RENT|DEPOSIT|rahn|rent|اجاره|رهن/i.test(tx) ||
          vertical === 'real-estate';
        if (!rentish) continue;
      }
      weakCritical.push(key);
    }
  }

  // forceAi: always include weak critical property fields for scoped fill.
  const forced = opts?.forceAi ? weakCritical : weakCritical.filter((k) =>
    ['budgetMax', 'budgetMin', 'rooms', 'area'].includes(k)
  );

  return [...new Set([...fromConfidence, ...packFields, ...forced])];
}

/** Stage 5: single LLM call to fill unresolved fields with top-N candidates only. */
export async function runScopedFieldFill(
  input: ScopedFieldFillInput
): Promise<ScopedFieldFillResult> {
  const unresolved = [
    ...new Set([
      ...collectHybridUnresolvedFields(input.fields, input.intentSlice, {
        forceAi: input.forceAi,
      }),
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
  const validated = providerResult.validatedEntities as
    | (Partial<import('@/intake/types').IntakeEntities> & {
        rahnAmount?: number;
        monthlyRent?: number;
        deposit?: number;
      })
    | null;
  const extraction = providerResult.extraction;

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
    if (unresolved.includes('budgetMin') && validated.budgetMin != null) {
      patch.budgetMin = validated.budgetMin;
    }
    if (unresolved.includes('rooms') && validated.rooms != null) patch.rooms = validated.rooms;
    if (unresolved.includes('rahnAmount') && validated.rahnAmount != null) {
      patch.rahnAmount = validated.rahnAmount;
    }
    if (unresolved.includes('monthlyRent') && validated.monthlyRent != null) {
      patch.monthlyRent = validated.monthlyRent;
    }
    if (unresolved.includes('deposit') && validated.deposit != null) {
      patch.deposit = validated.deposit;
    }
  }

  // Fallback: raw extraction money fields when validator only mapped budget.
  if (extraction) {
    if (unresolved.includes('rahnAmount') && patch.rahnAmount == null && extraction.rahnAmount != null) {
      patch.rahnAmount = extraction.rahnAmount;
    }
    if (
      unresolved.includes('monthlyRent') &&
      patch.monthlyRent == null &&
      extraction.monthlyRent != null
    ) {
      patch.monthlyRent = extraction.monthlyRent;
    }
    if (unresolved.includes('deposit') && patch.deposit == null && extraction.deposit != null) {
      patch.deposit = extraction.deposit;
    }
  }

  const fieldConfidence: Record<string, number> = {};
  const fc = providerResult.fieldConfidence as Record<string, number> | undefined;
  if (fc) {
    if (typeof fc.category === 'number') fieldConfidence.categorySlug = fc.category;
    if (typeof fc.city === 'number') {
      fieldConfidence.city = fc.city;
      fieldConfidence.citySlug = fc.city;
    }
    if (typeof fc.neighborhood === 'number') {
      fieldConfidence.neighborhood = fc.neighborhood;
      fieldConfidence.neighborhoodSlug = fc.neighborhood;
    }
    if (typeof fc.transactionType === 'number') {
      fieldConfidence.transactionType = fc.transactionType;
    }
    if (typeof fc.budget === 'number') {
      fieldConfidence.budgetMax = fc.budget;
      fieldConfidence.budgetMin = fc.budget;
      fieldConfidence.rahnAmount = fc.budget;
      fieldConfidence.monthlyRent = fc.budget;
      fieldConfidence.deposit = fc.budget;
    }
    if (typeof fc.area === 'number') fieldConfidence.area = fc.area;
    if (typeof fc.rooms === 'number') fieldConfidence.rooms = fc.rooms;
  }

  const merged = applyAiPatchToFieldBag({ ...input.fields }, patch, {
    fieldConfidence,
    baseConfidence: typeof extraction?.confidence === 'number' ? extraction.confidence : 0.72,
  });

  return {
    invoked: providerResult.ok && Object.keys(patch).length > 0,
    provider: providerResult.provider,
    latencyMs: Math.round(performance.now() - started),
    unresolvedFields: unresolved,
    fields: merged,
  };
}
