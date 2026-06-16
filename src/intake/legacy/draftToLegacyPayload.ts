import type { NeedDraft } from '@/contracts/need-intake';
import { normalizeCategoryPair } from '@/config/categories';
import { recordToEntities } from '@/intake/entities/entityRecord';
import type { IntakeEntities } from '@/intake/types';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';
import { applyPropertySlotsToParsed } from '@/lib/need-intake/apply-property-slots-to-parsed';
import { seedAnswersFromParsed } from '@/lib/need-intake/seed-answers';
import {
  resolveLegacyDealType,
  resolveTransactionType,
} from '@/lib/need-intake/resolve-transaction-type';
import { isCategoryVerticalCoherent } from '@/lib/need-intake/parse-coherence';
import {
  classifyVertical,
  isVerticalConfident,
} from '@/lib/need-intake/vertical-classifier';

function resolveLegacyCategorySlug(
  draft: NeedDraft,
  entities: ReturnType<typeof recordToEntities>,
  parsedBase: ReturnType<typeof parseIntentFromText>
): string {
  const userSetCategory = draft.answers._userSetCategory === true;
  const entityCat = entities.categorySlug?.trim();
  const parsedCat = parsedBase.categorySlug?.trim();

  if (!entityCat) return parsedCat ?? 'general';
  if (!parsedCat || entityCat === parsedCat || userSetCategory) return entityCat;

  const classification = classifyVertical(draft.sourceText);
  if (
    isVerticalConfident(classification) &&
    isCategoryVerticalCoherent(parsedCat, classification.vertical) &&
    !isCategoryVerticalCoherent(entityCat, classification.vertical)
  ) {
    return parsedCat;
  }

  return entityCat;
}

export interface LegacyNeedPayload {
  parsedIntent: NeedDraft['parsedIntent'];
  answers: NeedDraft['answers'];
}

/**
 * On-demand legacy projection from canonical NeedDraft.entities.
 * Single adapter for all legacy consumers — never the write model.
 */
export function draftToLegacyPayload(draft: NeedDraft): LegacyNeedPayload {
  const entities = recordToEntities(draft.entities);
  const parsedBase = parseIntentFromText(draft.sourceText);
  const categorySlug = resolveLegacyCategorySlug(draft, entities, parsedBase);
  const parsedCategorySlug = parsedBase.categorySlug?.trim() ?? '';
  const subcategorySlug =
    categorySlug === parsedCategorySlug
      ? parsedBase.subcategorySlug
      : entities.subcategorySlug ?? parsedBase.subcategorySlug;
  const normalized = normalizeCategoryPair(categorySlug, subcategorySlug);

  const resolvedTransaction = resolveTransactionType({
    sourceText: draft.sourceText,
    categorySlug: normalized.categorySlug,
    subcategorySlug: normalized.subcategorySlug,
    userDealType:
      draft.answers._userSetDealType === true && draft.answers.dealType != null
        ? String(draft.answers.dealType)
        : undefined,
    existingTransactionType: entities.transactionType,
  });

  const entitiesForLegacy: IntakeEntities = {
    ...entities,
    transactionType: resolvedTransaction ?? entities.transactionType,
  };

  const textDeal = parsedBase.entities?.dealType;
  const legacyDeal = resolveLegacyDealType(textDeal, entitiesForLegacy.transactionType);

  const parsedIntent: NeedDraft['parsedIntent'] = applyPropertySlotsToParsed({
    ...parsedBase,
    categorySlug: normalized.categorySlug,
    subcategorySlug: normalized.subcategorySlug,
    city: entities.city ?? parsedBase.city,
    province: entities.province ?? parsedBase.province,
    budgetMin: entities.budgetMin ?? parsedBase.budgetMin,
    budgetMax: entities.budgetMax ?? parsedBase.budgetMax,
    neighborhoodSlug: entities.neighborhoodSlug ?? undefined,
    rawText: draft.sourceText,
    entities: {
      ...parsedBase.entities,
      ...(legacyDeal ? { dealType: legacyDeal } : {}),
      ...(entities.area != null ? { areaMin: String(entities.area) } : {}),
      ...(entities.rooms != null ? { rooms: String(entities.rooms) } : {}),
      ...(entities.neighborhood ? { area: entities.neighborhood } : {}),
    },
  });

  const answers: NeedDraft['answers'] = {
    ...seedAnswersFromParsed(parsedIntent, draft.leadPhone),
    ...(entities.neighborhood?.trim() && entities.city
      ? { location: `${entities.neighborhood.trim()}، ${entities.city}` }
      : entities.city
        ? { location: entities.city }
        : {}),
    ...(legacyDeal && draft.answers.dealType == null ? { dealType: legacyDeal } : {}),
    ...(entities.rooms != null ? { rooms: entities.rooms } : {}),
    ...(entities.area != null && draft.answers.areaMin == null ? { areaMin: entities.area } : {}),
    ...(entities.budgetMax != null &&
    draft.answers.budget == null &&
    legacyDeal !== 'rent_rahn_ejare' &&
    legacyDeal !== 'rent_rahn_full'
      ? { budget: entities.budgetMax }
      : {}),
    ...(entities.neighborhoodSlug?.trim()
      ? { _neighborhoodSlug: entities.neighborhoodSlug.trim() }
      : {}),
    /* User chip/select answers (advanced filters) — must survive recompute */
    ...draft.answers,
  };

  return { parsedIntent, answers };
}
