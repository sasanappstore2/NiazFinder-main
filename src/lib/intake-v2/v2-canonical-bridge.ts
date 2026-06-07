import type { NeedDraft, ParsedIntent } from '@/contracts/need-intake';
import type { NeedIntelligenceProfile } from '@/contracts/need-intelligence';
import {
  patchNeedDraftEntities,
  recomputeNeedDraft,
} from '@/intake/aggregate/needDraftAggregate';
import { entitiesToRecord } from '@/intake/entities/entityRecord';
import { getIntakeIndexes } from '@/intake/dictionaries/loader';
import { analyzeNeedText } from '@/intake/engine/intakeEngine';
import { mergeParsedIntentIntoAnalysis } from '@/lib/need-intake/analysis-from-qwen';
import { mapDealTypeToTransaction } from '@/lib/need-intake/deal-type-transaction';
import type { IntakeEntities } from '@/intake/types';

function enrichParsedForMerge(draft: NeedDraft): ParsedIntent {
  const parsed = { ...draft.parsedIntent };
  const dealType = String(draft.answers.dealType ?? parsed.entities?.dealType ?? '');
  if (dealType) {
    parsed.entities = { ...parsed.entities, dealType };
  }
  const kind = String(draft.answers.propertyKind ?? parsed.entities?.propertyKind ?? '');
  if (kind) {
    parsed.entities = { ...parsed.entities, propertyKind: kind };
  }
  if (draft.answers.areaMin != null) {
    parsed.entities = { ...parsed.entities, areaMin: String(draft.answers.areaMin) };
  }
  if (draft.answers.areaMax != null) {
    parsed.entities = { ...parsed.entities, areaMax: String(draft.answers.areaMax) };
  }
  if (draft.answers.budget != null) {
    parsed.budgetMax = Number(draft.answers.budget);
  }
  if (draft.answers.deposit != null) {
    parsed.entities = { ...parsed.entities, deposit: String(draft.answers.deposit) };
  }
  if (draft.answers.monthlyRent != null) {
    parsed.entities = { ...parsed.entities, monthlyRent: String(draft.answers.monthlyRent) };
  }
  return parsed;
}

function applyAnswersToEntities(
  entities: IntakeEntities,
  draft: NeedDraft
): IntakeEntities {
  const next = { ...entities };
  const { answers } = draft;

  const dealType = String(answers.dealType ?? draft.parsedIntent.entities?.dealType ?? '');
  const tx = mapDealTypeToTransaction(dealType);
  if (tx) next.transactionType = tx;

  if (answers.areaMin != null) {
    next.area = Number(answers.areaMin);
  } else if (answers.areaMax != null) {
    next.area = Number(answers.areaMax);
  }

  if (answers.budget != null) {
    next.budgetMax = Number(answers.budget);
  }
  if (answers.rooms != null) {
    next.rooms = Number(answers.rooms);
  }

  const loc = String(answers.location ?? '').trim();
  if (loc) {
    const parts = loc.split(/[،,]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      next.neighborhood = next.neighborhood ?? parts[0] ?? null;
      next.city = next.city ?? parts[parts.length - 1] ?? null;
    } else if (!next.city) {
      next.city = loc;
    }
  }

  if (draft.parsedIntent.neighborhoodSlug && !next.neighborhoodSlug) {
    next.neighborhoodSlug = draft.parsedIntent.neighborhoodSlug;
  }
  if (draft.parsedIntent.city && !next.city) {
    next.city = draft.parsedIntent.city;
  }

  const slug = draft.parsedIntent.categorySlug;
  if (slug && slug !== 'general' && !next.categorySlug) {
    next.categorySlug = slug;
    next.subcategorySlug = draft.parsedIntent.subcategorySlug ?? null;
  }

  return next;
}

/** Sync v2 parsedIntent/answers/intelligence → canonical entities for publish. */
export async function syncV2DraftToCanonicalEntities(
  draft: NeedDraft,
  rawText: string,
  intelligence?: NeedIntelligenceProfile
): Promise<NeedDraft> {
  const indexes = await getIntakeIndexes();
  const ruleResult = analyzeNeedText(rawText, indexes);
  const parsedForMerge = enrichParsedForMerge(draft);

  let { entities } = mergeParsedIntentIntoAnalysis(ruleResult, parsedForMerge, indexes);
  entities = applyAnswersToEntities(entities, draft);

  const lreBlocked =
    draft.parsedIntent.rejectLocationAutoConfirm === true ||
    (draft.parsedIntent.locationResolutionStatus != null &&
      draft.parsedIntent.locationResolutionStatus !== 'resolved');

  if (lreBlocked && !String(draft.answers.location ?? '').trim()) {
    entities.neighborhood = null;
    entities.neighborhoodSlug = null;
    entities.city = draft.parsedIntent.city ?? null;
    entities.citySlug = null;
    entities.province = draft.parsedIntent.province ?? null;
  }

  if (!lreBlocked) {
    if (intelligence?.location?.city && !entities.city) {
      entities.city = intelligence.location.city;
    }
    if (intelligence?.location?.neighborhood && !entities.neighborhood) {
      entities.neighborhood = intelligence.location.neighborhood;
    }
  }
  if (intelligence?.area?.min != null && entities.area == null) {
    entities.area = intelligence.area.min;
  }
  if (intelligence?.budget?.max != null && entities.budgetMax == null) {
    entities.budgetMax = intelligence.budget.max;
  }

  let next = patchNeedDraftEntities(draft, entitiesToRecord(entities));
  next = recomputeNeedDraft({
    ...next,
    sourceText: rawText,
    intelligenceProfile: intelligence ?? draft.intelligenceProfile,
  });

  const mergedAnswers: NeedDraft['answers'] = { ...next.answers, ...draft.answers };
  if (lreBlocked && !String(draft.answers.location ?? '').trim()) {
    delete mergedAnswers.location;
    delete mergedAnswers._neighborhoodSlug;
  }
  if (
    draft.parsedIntent.locationResolutionStatus === 'resolved' &&
    draft.parsedIntent.city &&
    draft.parsedIntent.neighborhoodSlug
  ) {
    const hood =
      draft.parsedIntent.entities?.area ??
      draft.parsedIntent.neighborhoodSlug.replace(/-/g, ' ');
    mergedAnswers.location = `${hood}، ${draft.parsedIntent.city}`;
    mergedAnswers._neighborhoodSlug = draft.parsedIntent.neighborhoodSlug;
  }
  if (draft.answers.propertyKind) {
    mergedAnswers.propertyKind = draft.answers.propertyKind;
  }

  const preservedUserArea = draft.parsedIntent.entities?.area?.trim();

  return {
    ...next,
    answers: mergedAnswers,
    parsedIntent: {
      ...next.parsedIntent,
      categorySlug: draft.parsedIntent.categorySlug || next.parsedIntent.categorySlug,
      subcategorySlug: draft.parsedIntent.subcategorySlug ?? next.parsedIntent.subcategorySlug,
      neighborhoodSlug: lreBlocked
        ? draft.parsedIntent.neighborhoodSlug
        : (draft.parsedIntent.neighborhoodSlug ?? next.parsedIntent.neighborhoodSlug),
      locationAmbiguous: lreBlocked
        ? (draft.parsedIntent.locationAmbiguous ?? true)
        : draft.parsedIntent.locationAmbiguous,
      neighborhoodCandidates: draft.parsedIntent.neighborhoodCandidates,
      locationResolutionStatus: draft.parsedIntent.locationResolutionStatus,
      rejectLocationAutoConfirm: draft.parsedIntent.rejectLocationAutoConfirm,
      cityCandidates: draft.parsedIntent.cityCandidates,
      city: lreBlocked
        ? draft.parsedIntent.city
        : (draft.parsedIntent.city ?? next.parsedIntent.city),
      entities: {
        ...next.parsedIntent.entities,
        ...draft.parsedIntent.entities,
        ...(preservedUserArea ? { area: preservedUserArea } : {}),
      },
      rawText,
    },
  };
}
