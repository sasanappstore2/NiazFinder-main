import type { NeedDraft, ParsedIntent } from '@/contracts/need-intake';
import { enrichParsedIntent } from '@/lib/need-intake/enrich-parsed-intent';
import { extractLocationFragment } from '@/lib/need-intake/location-fragment';
import { parseCity } from '@/lib/need-intake/intent-parser';
import {
  patchNeedDraftEntities,
} from '@/intake/aggregate/needDraftAggregate';

/** User rejects a prior location and names the intended area/city. */
export function isLocationCorrectionMessage(message: string): boolean {
  const t = message.trim();
  if (t.length < 8) return false;
  const rejects =
    /نمی\s*خو(?:ام|واه)|نمیخو(?:ام|واه)|(?:^|[\s،])نه[\s،]|اشتباه|غلط|(?:^|[\s،])نیست(?:[\s،]|$)|منظورم\s*نیست/.test(
      t
    );
  const namesPlace =
    /(?:در|تو|توی)\s+[\u0600-\u06FF\s\-]+/.test(t) ||
    /(?:مد\s*نظرم|منظورم|می\s*خو(?:ام|واه))/.test(t);
  return rejects && namesPlace;
}

/** Positive location clause after negation, e.g. «در کوهسنگی مشهد مد نظرم هست». */
export function extractPositiveLocationClause(message: string): string | undefined {
  const t = message.trim();

  const afterReject = t.match(
    /(?:نمی\s*خو(?:ام|واه)|نمیخو(?:ام|واه)|نه[\s،])[\s\S]*?(?:در|تو|توی)\s+([\u0600-\u06FF\s\-]+?)\s+مد\s*نظرم/i
  );
  if (afterReject?.[1]) {
    const clause = afterReject[1].trim().replace(/\s*(?:هست|است)$/i, '').trim();
    if (clause.length >= 2) return clause;
  }

  const modMatches = [...t.matchAll(/(?:در|تو|توی)\s+([\u0600-\u06FF\s\-]+?)\s+مد\s*نظرم/gi)];
  if (modMatches.length > 0) {
    const last = modMatches[modMatches.length - 1][1]?.trim();
    if (last && last.length >= 2) return last;
  }

  const patterns = [
    /مد\s*نظرم\s+(?:در|تو|توی)\s+([\u0600-\u06FF\s\-]+?)(?:\s+هست|\s+است|$)/i,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    const clause = m?.[1]?.trim().replace(/\s*(?:هست|است)$/i, '').trim();
    if (clause && clause.length >= 2) return clause;
  }

  const city = parseCity(t);
  if (city) {
    const inCity = t.match(
      new RegExp(`(?:در|تو|توی)\\s+([\\u0600-\\u06FF\\s\\-]+?)\\s+${city}`, 'i')
    );
    if (inCity?.[1]?.trim()) return `${inCity[1].trim()}، ${city}`;
    return city;
  }
  return undefined;
}

export function clearDraftLocation(draft: NeedDraft): NeedDraft {
  const { parsedIntent, answers } = draft;
  const nextEntities = { ...(parsedIntent.entities ?? {}) };
  delete nextEntities.area;

  const nextAnswers = { ...answers };
  delete nextAnswers.location;
  delete nextAnswers._neighborhoodSlug;

  return {
    ...draft,
    parsedIntent: {
      ...parsedIntent,
      city: undefined,
      neighborhoodSlug: undefined,
      neighborhoodCandidates: undefined,
      locationAmbiguous: false,
      entities: nextEntities,
    },
    answers: nextAnswers,
  };
}

/** Re-parse neighborhood/city from a correction clause and merge into draft. */
export function applyLocationCorrection(
  draft: NeedDraft,
  message: string
): NeedDraft {
  const clause = extractPositiveLocationClause(message);
  if (!clause) return draft;

  const city = parseCity(clause) ?? parseCity(message);
  const parseText = city && !clause.includes(city) ? `${clause} ${city}` : clause;

  const baseEntities = { ...(draft.parsedIntent.entities ?? {}) };
  delete baseEntities.area;

  let parsed: ParsedIntent = enrichParsedIntent(
    {
      ...draft.parsedIntent,
      rawText: parseText,
      city,
      neighborhoodSlug: undefined,
      neighborhoodCandidates: undefined,
      locationAmbiguous: false,
      entities: baseEntities,
    },
    { locationText: parseText }
  );

  if (!parsed.city && city) parsed = { ...parsed, city };

  const answers = { ...draft.answers };
  if (parsed.neighborhoodSlug && parsed.city) {
    const hoodLabel =
      parsed.entities?.area ?? parsed.neighborhoodSlug.replace(/-/g, ' ');
    answers.location = `${hoodLabel}، ${parsed.city}`;
    answers._neighborhoodSlug = parsed.neighborhoodSlug;
  } else if (parsed.city) {
    answers.location = parsed.entities?.area
      ? `${parsed.entities.area}، ${parsed.city}`
      : parsed.city;
  } else if (clause) {
    answers.location = clause;
  }

  return {
    ...draft,
    parsedIntent: parsed,
    answers,
  };
}

/** User gave only a city name while a neighborhood was already stated earlier. */
export function applyCityOnlyLocationReply(
  draft: NeedDraft,
  message: string,
  opts?: { preferredCityId?: string | null; preferredCityName?: string | null }
): NeedDraft {
  const trimmed = message.trim();
  const city = parseCity(trimmed);
  if (!city) return draft;
  const withoutCity = trimmed.replace(city, '').replace(/^[،,\s]+|[،,\s]+$/g, '').trim();
  if (withoutCity.length > 2) return draft;

  const priorArea =
    draft.parsedIntent.entities?.area?.trim() ||
    extractPositiveLocationClause(draft.sourceText ?? '') ||
    undefined;
  const priorFrag =
    priorArea?.replace(/^منطقه\s+/iu, '').trim() ||
    extractLocationFragment(draft.sourceText ?? '')?.replace(/^منطقه\s+/iu, '').trim();
  if (!priorFrag || priorFrag === city) return draft;

  const parseText = `${priorFrag} ${city}`;
  let parsed: ParsedIntent = enrichParsedIntent(
    {
      ...draft.parsedIntent,
      rawText: parseText,
      city,
      neighborhoodSlug: undefined,
      neighborhoodCandidates: undefined,
      locationAmbiguous: false,
    },
    {
      locationText: parseText,
      preferredCityId: opts?.preferredCityId,
      preferredCityName: opts?.preferredCityName ?? city,
    }
  );

  if (!parsed.city) parsed = { ...parsed, city };

  const hoodLabel =
    parsed.entities?.area ??
    (parsed.neighborhoodSlug ? parsed.neighborhoodSlug.replace(/-/g, ' ') : priorFrag);
  const location = `${hoodLabel}، ${parsed.city ?? city}`;

  const nextAnswers: NeedDraft['answers'] = {
    ...draft.answers,
    location,
  };
  if (parsed.neighborhoodSlug) {
    nextAnswers._neighborhoodSlug = parsed.neighborhoodSlug;
  } else {
    delete nextAnswers._neighborhoodSlug;
  }

  return {
    ...draft,
    parsedIntent: parsed,
    answers: nextAnswers,
  };
}

/** Apply correction and sync canonical entity fields for publish/readiness. */
export function applyLocationCorrectionWithEntities(
  draft: NeedDraft,
  message: string
): NeedDraft {
  const corrected = applyLocationCorrection(draft, message);
  const { parsedIntent, answers } = corrected;
  const hood =
    parsedIntent.entities?.area ??
    (parsedIntent.neighborhoodSlug
      ? parsedIntent.neighborhoodSlug.replace(/-/g, ' ')
      : null);

  return patchNeedDraftEntities(corrected, {
    city: parsedIntent.city ?? null,
    neighborhood: hood,
    neighborhoodSlug: parsedIntent.neighborhoodSlug ?? null,
  });
}
