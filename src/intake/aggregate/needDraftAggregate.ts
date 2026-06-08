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
import { extractLocationFragment } from '@/lib/need-intake/location-fragment';
import { composeIntakeSourceText } from '@/lib/need-intake/compose-source-text';
import {
  inferTransactionTypeFromSlug,
  resolveTransactionType,
} from '@/lib/need-intake/resolve-transaction-type';

import { entitiesToRecord, recordToEntities } from '@/intake/entities/entityRecord';

export { entitiesToRecord, recordToEntities } from '@/intake/entities/entityRecord';

function mergeAnalysisLocationIntoParsed(
  parsed: ParsedIntent,
  entities: IntakeEntities,
  sourceText: string
): ParsedIntent {
  const fragment = extractLocationFragment(sourceText);
  const area =
    entities.neighborhood?.trim() ||
    (fragment && /[\u0600-\u06FF]{2,}/.test(fragment) ? fragment : undefined) ||
    parsed.entities?.area;

  return {
    ...parsed,
    city: entities.city ?? parsed.city,
    neighborhoodSlug: entities.neighborhoodSlug ?? parsed.neighborhoodSlug,
    entities: {
      ...parsed.entities,
      ...(area ? { area } : {}),
    },
  };
}

/** Recompute canonical fields and derive legacy read models on demand. */
export function recomputeNeedDraft(draft: NeedDraft): NeedDraft {
  const entities = recordToEntities(draft.entities);
  const needTypeDef = resolveNeedType(entities);
  const missingFields = buildPrioritizedMissingFields(entities, {
    sourceText: draft.sourceText,
    answers: draft.answers as Record<string, unknown>,
    parsedUrgency: draft.parsedIntent?.urgency ?? null,
  });
  const completionScore = computeCompletionScore(missingFields);
  const matchabilityScore = computeMatchabilityScore(entities);
  const completionState = completionStateFromScore(completionScore);
  const nextQuestion = buildNextQuestion(entities, missingFields);

  const preservedParsed = draft.parsedIntent;

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

  const { parsedIntent: legacyParsed, answers: legacyAnswers } = draftToLegacyPayload(next);

  const lreActive =
    preservedParsed.locationResolutionStatus != null ||
    preservedParsed.rejectLocationAutoConfirm === true ||
    preservedParsed.locationAmbiguous === true;

  const lreBlocked =
    preservedParsed.rejectLocationAutoConfirm === true ||
    (preservedParsed.locationResolutionStatus != null &&
      preservedParsed.locationResolutionStatus !== 'resolved');

  let parsedIntent: ParsedIntent = lreActive
    ? {
        ...legacyParsed,
        city: preservedParsed.city ?? legacyParsed.city,
        neighborhoodSlug: preservedParsed.neighborhoodSlug ?? legacyParsed.neighborhoodSlug,
        neighborhoodCandidates: preservedParsed.neighborhoodCandidates,
        cityCandidates: preservedParsed.cityCandidates,
        locationAmbiguous: preservedParsed.locationAmbiguous ?? legacyParsed.locationAmbiguous,
        locationResolutionStatus: preservedParsed.locationResolutionStatus,
        rejectLocationAutoConfirm: preservedParsed.rejectLocationAutoConfirm,
        entities: {
          ...legacyParsed.entities,
          ...(preservedParsed.entities?.area ? { area: preservedParsed.entities.area } : {}),
        },
      }
    : legacyParsed;

  const answers: NeedDraft['answers'] = { ...legacyAnswers, ...draft.answers };
  if (draft.answers._userSetDealType !== true) {
    if (legacyAnswers.dealType != null) answers.dealType = legacyAnswers.dealType;
    if (legacyAnswers.rahnAmount != null) answers.rahnAmount = legacyAnswers.rahnAmount;
    if (legacyAnswers.monthlyRent != null) answers.monthlyRent = legacyAnswers.monthlyRent;
    if (
      legacyAnswers.dealType === 'rent_rahn_ejare' ||
      legacyAnswers.dealType === 'rent_rahn_full'
    ) {
      delete answers.budget;
    }
  }
  if (lreBlocked && !String(draft.answers.location ?? '').trim()) {
    delete answers.location;
    delete answers._neighborhoodSlug;
  }

  const v2LeafCategory = /^[a-z]+-(?:sale|rent)(?:-|$)/.test(
    preservedParsed.categorySlug ?? ''
  );
  const legacyGeneric =
    !parsedIntent.categorySlug ||
    parsedIntent.categorySlug === 'general' ||
    /^residential-(?:rent|sale)$/.test(parsedIntent.categorySlug);
  if (
    v2LeafCategory &&
    legacyGeneric &&
    preservedParsed.categorySlug !== parsedIntent.categorySlug
  ) {
    parsedIntent = {
      ...parsedIntent,
      categorySlug: preservedParsed.categorySlug,
      subcategorySlug: preservedParsed.subcategorySlug ?? parsedIntent.subcategorySlug,
      intentType: preservedParsed.intentType ?? parsedIntent.intentType,
      entities: {
        ...parsedIntent.entities,
        ...(preservedParsed.entities?.propertyKind
          ? { propertyKind: preservedParsed.entities.propertyKind }
          : {}),
      },
    };
  }

  return {
    ...next,
    parsedIntent,
    answers,
    intelligenceProfile: draft.intelligenceProfile,
  };
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
  const sourceParsed = parseIntentFromText(sourceText);
  let parsedIntent = mergeAnalysisLocationIntoParsed(sourceParsed, entities, sourceText);

  if (analysis.locationHints) {
    const hints = analysis.locationHints;
    parsedIntent = {
      ...parsedIntent,
      locationAmbiguous: hints.locationAmbiguous ?? parsedIntent.locationAmbiguous,
      neighborhoodSlug: hints.neighborhoodSlug ?? parsedIntent.neighborhoodSlug,
      neighborhoodCandidates: hints.neighborhoodCandidates ?? parsedIntent.neighborhoodCandidates,
      cityCandidates: hints.cityCandidates ?? parsedIntent.cityCandidates,
      locationResolutionStatus: hints.locationResolutionStatus as ParsedIntent['locationResolutionStatus'],
      rejectLocationAutoConfirm: hints.rejectLocationAutoConfirm ?? parsedIntent.rejectLocationAutoConfirm,
      entities: {
        ...parsedIntent.entities,
        ...(hints.areaLabel ? { area: hints.areaLabel } : {}),
      },
    };
  }

  const entityRecord = { ...entitiesToRecord(entities) };
  if (parsedIntent.neighborhoodSlug?.trim()) {
    entityRecord.neighborhoodSlug = parsedIntent.neighborhoodSlug.trim();
    const catalogName =
      entities.neighborhood?.trim() ||
      parsedIntent.entities?.area?.trim() ||
      analysis.locationHints?.areaLabel?.trim();
    if (catalogName && /[^\d]/.test(catalogName)) {
      entityRecord.neighborhood = catalogName;
    } else {
      entityRecord.neighborhood =
        parsedIntent.neighborhoodSlug.replace(/-/g, ' ') || entityRecord.neighborhood;
    }
  } else if (
    !entityRecord.neighborhood &&
    parsedIntent.entities?.area?.trim() &&
    /[^\d]/.test(parsedIntent.entities.area)
  ) {
    entityRecord.neighborhood = parsedIntent.entities.area.trim();
  }

  const base: NeedDraft = {
    needType: analysis.needType ?? needTypeDef.key,
    schemaVersion: needTypeDef.schemaVersion,
    vertical: analysis.detectedVertical ?? entities.vertical ?? needTypeDef.vertical,
    category: analysis.detectedCategory ?? entities.category ?? needTypeDef.category,
    entities: entityRecord,
    completionScore: analysis.completionScore,
    matchabilityScore: analysis.matchabilityScore,
    completionState: analysis.completionState,
    sections: analysis.sections,
    missingFields: analysis.missingFields,
    nextQuestion: analysis.nextQuestion,
    sourceText,
    updatedAt: new Date().toISOString(),
    parsedIntent,
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

function inferCategoryKeyFromSlug(leafSlug: string): string | null {
  if (leafSlug.includes('apartment')) return 'apartment';
  if (leafSlug.includes('villa')) return 'villa';
  if (leafSlug.includes('shop') || leafSlug.includes('store')) return 'shop';
  if (leafSlug.includes('office')) return 'office';
  if (leafSlug.includes('land')) return 'land';
  if (leafSlug.includes('car') || leafSlug.includes('vehicle')) return 'car';
  if (leafSlug.includes('plumb')) return 'plumbing';
  return null;
}

/** Map UI category selection into intake entity fields. */
export function inferEntitiesFromCategorySlugs(
  categorySlug: string,
  subcategorySlug?: string | null,
  opts?: { sourceText?: string; userDealType?: string | null }
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

  const transactionType = opts?.sourceText
    ? resolveTransactionType({
        sourceText: opts.sourceText,
        categorySlug: normalized.categorySlug,
        subcategorySlug: normalized.subcategorySlug,
        userDealType: opts.userDealType,
      })
    : inferTransactionTypeFromSlug(leaf);

  return {
    vertical,
    category: inferCategoryKeyFromSlug(leaf),
    categorySlug: normalized.categorySlug,
    subcategorySlug: normalized.subcategorySlug,
    transactionType,
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
    neighborhoodSlug?: string | null;
  }
): NeedDraft {
  const sourceText = composeIntakeSourceText(form.needText, form.detailsText);
  const categoryPatch = form.categorySlug
    ? inferEntitiesFromCategorySlugs(form.categorySlug, form.subcategorySlug || null, {
        sourceText,
        userDealType:
          draft?.answers?.dealType != null ? String(draft.answers.dealType) : undefined,
      })
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

  const existingEntities = draft ? recordToEntities(draft.entities) : null;
  const neighborhoodSlug =
    form.neighborhoodSlug?.trim() ||
    existingEntities?.neighborhoodSlug?.trim() ||
    null;

  return recomputeNeedDraft({
    ...patchNeedDraftEntities(base, {
      ...categoryPatch,
      city: form.city.trim() || null,
      neighborhood: form.neighborhood.trim() || null,
      neighborhoodSlug,
    }),
    sourceText,
  });
}

/** Pure projection — does not mutate external store (for live preview / summary). */
export function projectNeedDraftFromForm(
  draft: NeedDraft | null,
  form: Parameters<typeof syncNeedDraftFromForm>[1]
): NeedDraft {
  return syncNeedDraftFromForm(draft, form);
}
