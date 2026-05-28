import type { NeedDraft, ParsedIntent } from '@/contracts/need-intake';
import { getCategoryPath, normalizeCategoryPair } from '@/config/categories';
import type { IntakeAnalysisResult, IntakeEntities, TransactionType } from '@/intake/types';
import { buildNextQuestion } from '@/intake/wizard/wizardBuilder';
import {
  buildPrioritizedMissingFields,
  completionStateFromScore,
  computeCompletionScore,
} from '@/intake/schema/needSchema';
import { computeMatchabilityScore } from '@/intake/scoring/matchabilityEngine';
import { resolveNeedType } from '@/intake/schema/needTypes';
import { draftToLegacyPayload } from '@/intake/legacy/draftToLegacyPayload';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';

import { entitiesToRecord, recordToEntities } from '@/intake/entities/entityRecord';

export { entitiesToRecord, recordToEntities } from '@/intake/entities/entityRecord';

/** Recompute canonical fields and derive legacy read models on demand. */
export function recomputeNeedDraft(draft: NeedDraft): NeedDraft {
  const entities = recordToEntities(draft.entities);
  const needTypeDef = resolveNeedType(entities);
  const missingFields = buildPrioritizedMissingFields(entities);
  const completionScore = computeCompletionScore(missingFields);
  const matchabilityScore = computeMatchabilityScore(entities);
  const completionState = completionStateFromScore(completionScore);
  const nextQuestion = buildNextQuestion(entities, missingFields);

  const next: NeedDraft = {
    ...draft,
    needType: needTypeDef.key,
    schemaVersion: needTypeDef.schemaVersion,
    vertical: entities.vertical ?? needTypeDef.vertical,
    category: entities.category ?? needTypeDef.category,
    entities: entitiesToRecord(entities),
    completionScore,
    matchabilityScore,
    completionState,
    sections: needTypeDef.sections.map((s) => ({
      key: s.key,
      label: s.label,
      fields: [...s.fields],
    })),
    missingFields,
    nextQuestion,
    updatedAt: new Date().toISOString(),
    parsedIntent: draft.parsedIntent,
    answers: draft.answers,
  };

  const { parsedIntent, answers } = draftToLegacyPayload(next);
  return { ...next, parsedIntent, answers };
}

export function legacyNeedDraftFromParsed(
  parsedIntent: ParsedIntent,
  answers: NeedDraft['answers'],
  turns: NeedDraft['turns'] = []
): NeedDraft {
  return recomputeNeedDraft({
    needType: 'general-seeking',
    schemaVersion: 1,
    vertical: 'general',
    category: 'general',
    entities: {},
    completionScore: 0,
    matchabilityScore: 0,
    completionState: 'VERY_INCOMPLETE',
    sections: [],
    missingFields: [],
    nextQuestion: null,
    sourceText: parsedIntent.rawText,
    updatedAt: new Date().toISOString(),
    parsedIntent,
    answers,
    turns,
  });
}

export function createNeedDraftFromAnalysis(
  analysis: IntakeAnalysisResult,
  sourceText: string,
  opts?: {
    leadPhone?: string | null;
    existing?: Partial<NeedDraft>;
    intakeTrace?: NeedDraft['intakeTrace'];
  }
): NeedDraft {
  const entities = analysis.entities;
  const needTypeDef = resolveNeedType(entities);
  const base: NeedDraft = {
    needType: analysis.needType ?? needTypeDef.key,
    schemaVersion: needTypeDef.schemaVersion,
    vertical: analysis.detectedVertical ?? entities.vertical ?? needTypeDef.vertical,
    category: analysis.detectedCategory ?? entities.category ?? needTypeDef.category,
    entities: entitiesToRecord(entities),
    completionScore: analysis.completionScore,
    matchabilityScore: analysis.matchabilityScore,
    completionState: analysis.completionState,
    sections: analysis.sections,
    missingFields: analysis.missingFields,
    nextQuestion: analysis.nextQuestion,
    sourceText,
    updatedAt: new Date().toISOString(),
    parsedIntent: parseIntentFromText(sourceText),
    answers: {},
    turns: opts?.existing?.turns ?? [],
    leadPhone: opts?.leadPhone ?? opts?.existing?.leadPhone,
    listingPreview: opts?.existing?.listingPreview,
    intakeTrace: opts?.intakeTrace ?? opts?.existing?.intakeTrace,
  };

  return recomputeNeedDraft(base);
}

export function patchNeedDraftEntities(
  draft: NeedDraft,
  patch: Partial<Record<string, unknown>>
): NeedDraft {
  const merged = { ...draft.entities, ...patch };
  return recomputeNeedDraft({
    ...draft,
    entities: merged,
  });
}

function inferTransactionTypeFromSlug(leafSlug: string): TransactionType | null {
  if (leafSlug.includes('rent')) return 'RENT';
  if (leafSlug.includes('sale')) return 'BUY';
  return null;
}

function inferCategoryKeyFromSlug(leafSlug: string): string | null {
  if (leafSlug.includes('apartment')) return 'apartment';
  if (leafSlug.includes('villa')) return 'villa';
  if (leafSlug.includes('car') || leafSlug.includes('vehicle')) return 'car';
  if (leafSlug.includes('plumb')) return 'plumbing';
  return null;
}

/** Map UI category selection into intake entity fields. */
export function inferEntitiesFromCategorySlugs(
  categorySlug: string,
  subcategorySlug?: string | null
): Partial<Record<string, unknown>> {
  const normalized = normalizeCategoryPair(categorySlug, subcategorySlug ?? undefined);
  const leaf = normalized.subcategorySlug ?? normalized.categorySlug;
  const path = getCategoryPath(leaf);
  const root = path[0]?.slug ?? null;

  const vertical =
    root === 'real-estate'
      ? 'real-estate'
      : root === 'vehicles'
        ? 'vehicles'
        : root === 'services'
          ? 'services'
          : root === 'jobs'
            ? 'jobs'
            : root === 'personal-items' || root === 'electronics' || root === 'entertainment'
              ? 'products'
              : null;

  return {
    vertical,
    category: inferCategoryKeyFromSlug(leaf),
    categorySlug: normalized.categorySlug,
    subcategorySlug: normalized.subcategorySlug,
    transactionType: inferTransactionTypeFromSlug(leaf),
  };
}

export function syncNeedDraftFromForm(
  draft: NeedDraft | null,
  form: {
    needText: string;
    detailsText: string;
    categorySlug: string;
    subcategorySlug: string;
    city: string;
    neighborhood: string;
  }
): NeedDraft {
  const sourceText = `${form.needText.trim()}\n\n${form.detailsText.trim()}`.trim();
  const categoryPatch = form.categorySlug
    ? inferEntitiesFromCategorySlugs(form.categorySlug, form.subcategorySlug || null)
    : {};

  const base =
    draft ??
    recomputeNeedDraft({
      needType: 'general-seeking',
      schemaVersion: 1,
      vertical: 'general',
      category: 'general',
      entities: {},
      completionScore: 0,
      matchabilityScore: 0,
      completionState: 'VERY_INCOMPLETE',
      sections: [],
      missingFields: [],
      nextQuestion: null,
      sourceText,
      updatedAt: new Date().toISOString(),
      parsedIntent: parseIntentFromText(sourceText),
      answers: {},
      turns: [],
    });

  return recomputeNeedDraft({
    ...patchNeedDraftEntities(base, {
      ...categoryPatch,
      city: form.city.trim() || null,
      neighborhood: form.neighborhood.trim() || null,
    }),
    sourceText,
  });
}
