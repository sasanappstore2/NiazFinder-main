import type { NeedDraft, ParsedIntent } from '@/contracts/need-intake';
import { enrichParsedIntent } from '@/lib/need-intake/enrich-parsed-intent';
import {
  coerceRealEstateParse,
  extractCoerceHints,
} from '@/lib/intake-v2/coerce-real-estate-parse';
import { applyV2ChipToDraft } from '@/lib/intake-v2/v2-chip-apply';
import { extractPropertySlotsFromText } from '@/lib/need-intake/extract-property-slots';

export interface V2ReasonerInput {
  parsed: ParsedIntent;
  rawText: string;
  trimmed: string;
  draft: NeedDraft;
  chipFieldKey?: string;
  chipValue?: string;
  preferredCityId?: string | null;
  preferredCityName?: string | null;
}

export interface V2ReasonerResult {
  parsedIntent: ParsedIntent;
  answers: NeedDraft['answers'];
  skippedField: boolean;
  locationConfirmedByCatalog: boolean;
}

function applyCoerceHintsToAnswers(
  answers: NeedDraft['answers'],
  hints: ReturnType<typeof extractCoerceHints>
): NeedDraft['answers'] {
  const next = { ...answers };
  if (hints.dealType) next.dealType = hints.dealType;
  if (hints.propertyKind && !next.propertyKind) next.propertyKind = hints.propertyKind;
  if (hints.floorMin != null && next.floorMin == null) next.floorMin = hints.floorMin;
  if (hints.location && !next.location) next.location = hints.location;
  return next;
}

import { isAreaLikeRentConflict } from '@/lib/intake-v2/intake-logic-policy';
export function reasonV2Turn(input: V2ReasonerInput): V2ReasonerResult {
  const { rawText, trimmed, draft, chipFieldKey, chipValue } = input;

  let parsedIntent = enrichParsedIntent(
    {
      ...input.parsed,
      rawText,
    },
    {
      locationText: rawText,
      preferredCityId: input.preferredCityId,
      preferredCityName: input.preferredCityName,
    }
  );
  parsedIntent = coerceRealEstateParse(parsedIntent, rawText);
  const coerceHints = extractCoerceHints(rawText);

  let answers: NeedDraft['answers'] = {
    ...draft.answers,
    ...applyCoerceHintsToAnswers(draft.answers, coerceHints),
  };

  let skippedField = false;
  if (chipFieldKey || chipValue) {
    const chipApplied = applyV2ChipToDraft(
      { ...draft, parsedIntent, answers },
      { chipFieldKey, chipValue, message: trimmed }
    );
    answers = chipApplied.answers;
    parsedIntent = chipApplied.parsedIntent;
    skippedField = chipApplied.skippedField ?? false;
  }

  if (
    parsedIntent.locationResolutionStatus === 'resolved' &&
    parsedIntent.neighborhoodSlug &&
    parsedIntent.city &&
    !parsedIntent.locationAmbiguous &&
    !parsedIntent.rejectLocationAutoConfirm &&
    !answers.location
  ) {
    const hoodLabel =
      parsedIntent.entities?.area ??
      parsedIntent.neighborhoodSlug.replace(/-/g, ' ');
    answers.location = `${hoodLabel}، ${parsedIntent.city}`;
    answers._neighborhoodSlug = parsedIntent.neighborhoodSlug;
  }

  const locationConfirmedByCatalog =
    Boolean(parsedIntent.neighborhoodSlug && parsedIntent.city) &&
    !parsedIntent.locationAmbiguous &&
    !parsedIntent.rejectLocationAutoConfirm;

  if (/^\d+\s*متری?|\d+\s*متر|\d+\s*m\b/i.test(trimmed) && !chipFieldKey) {
    const m = trimmed.match(/(\d+)\s*متری?|(\d+)\s*متر|(\d+)\s*m\b/i);
    const n = m ? Number(m[1] ?? m[2] ?? m[3]) : null;
    if (n && n >= 15 && n <= 5000) answers.areaMin = n;
  } else if (/حدود(?:اً|ا)/.test(trimmed) && /(\d+)\s*مت/.test(trimmed)) {
    const m = trimmed.match(/(\d+)\s*مت/);
    const n = m ? Number(m[1]) : null;
    if (n && n >= 15 && n <= 5000) answers.areaMin = n;
  }

  const turnSlots = extractPropertySlotsFromText(trimmed);
  if (turnSlots.rooms && answers.rooms == null) {
    answers.rooms = Number(turnSlots.rooms);
  }

  if (/ودیعه|رهن/.test(trimmed) && !chipFieldKey && !isAreaLikeRentConflict(trimmed)) {
    const applied = applyV2ChipToDraft(
      { ...draft, parsedIntent, answers },
      { chipFieldKey: 'deposit', chipValue: trimmed, message: trimmed }
    );
    answers = applied.answers;
  } else if (/اجاره|ماهانه/.test(trimmed) && !chipFieldKey && !/متری?|متر/.test(trimmed)) {
    const applied = applyV2ChipToDraft(
      { ...draft, parsedIntent, answers },
      { chipFieldKey: 'monthlyRent', chipValue: trimmed, message: trimmed }
    );
    answers = applied.answers;
  } else if (/بودجه|میلیارد/.test(trimmed) && !chipFieldKey) {
    const applied = applyV2ChipToDraft(
      { ...draft, parsedIntent, answers },
      { chipFieldKey: 'budget', chipValue: trimmed, message: trimmed }
    );
    answers = applied.answers;
  }

  if (
    parsedIntent.budgetMax &&
    !answers.budget &&
    /میلیارد|بودجه|تا\s*\d/.test(trimmed)
  ) {
    answers.budget = parsedIntent.budgetMax;
  }

  return {
    parsedIntent,
    answers,
    skippedField,
    locationConfirmedByCatalog,
  };
}
