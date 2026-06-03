import type { NeedDraft } from '@/contracts/need-intake';
import { normalizeCategoryPair } from '@/config/categories';
import { recordToEntities } from '@/intake/entities/entityRecord';
import type { IntakeEntities } from '@/intake/types';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';
import { applyPropertySlotsToParsed } from '@/lib/need-intake/apply-property-slots-to-parsed';
import { seedAnswersFromParsed } from '@/lib/need-intake/seed-answers';

/** Map canonical transactionType → legacy dealType chip values. */
function legacyDealTypeFromEntities(entities: IntakeEntities): string | undefined {
  const raw = entities.transactionType;
  if (!raw) return undefined;
  const map: Record<string, string> = {
    BUY: 'buy',
    SELL: 'sell',
    RENT: 'rent_monthly',
    FULL_DEPOSIT: 'rent_rahn_full',
    DEPOSIT_AND_RENT: 'rent_rahn_ejare',
    DAILY_RENT: 'rent_short_term',
    HOURLY_RENT: 'rent_short_term',
  };
  return map[raw] ?? raw.toLowerCase();
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
  const normalized = normalizeCategoryPair(
    entities.categorySlug ?? parsedBase.categorySlug,
    entities.subcategorySlug ?? parsedBase.subcategorySlug
  );

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
      ...(entities.transactionType ? { dealType: entities.transactionType } : {}),
      ...(entities.area != null ? { areaMin: String(entities.area) } : {}),
      ...(entities.rooms != null ? { rooms: String(entities.rooms) } : {}),
      ...(entities.neighborhood ? { area: entities.neighborhood } : {}),
    },
  });

  const legacyDealType = legacyDealTypeFromEntities(entities);

  const answers: NeedDraft['answers'] = {
    ...seedAnswersFromParsed(parsedIntent, draft.leadPhone),
    /* User chip/select answers (advanced filters) — must survive recompute */
    ...draft.answers,
    ...(entities.neighborhood?.trim() && entities.city
      ? { location: `${entities.neighborhood.trim()}، ${entities.city}` }
      : entities.city
        ? { location: entities.city }
        : {}),
    ...(legacyDealType ? { dealType: legacyDealType } : {}),
    ...(entities.rooms != null ? { rooms: entities.rooms } : {}),
    ...(entities.area != null ? { areaMin: entities.area } : {}),
    ...(entities.budgetMax != null ? { budget: entities.budgetMax } : {}),
  };

  return { parsedIntent, answers };
}
