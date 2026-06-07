import type {
  ChatTurnResponse,
  ConversationTurn,
  NeedDraft,
  NextQuestionResponse,
} from '@/contracts/need-intake';
import { recomputeNeedDraft } from '@/intake/aggregate/needDraftAggregate';
import { parseFromTextAsync } from '@/lib/need-intake/internal-orchestrator.server';
import { extractSlotsFromRules } from '@/lib/need-intake/extract-slots-rules';
import { getNextQuestion, buildSummary } from '@/lib/need-intake/question-engine';
import { seedAnswersFromParsed } from '@/lib/need-intake/seed-answers';
import {
  coerceRealEstateParse,
  extractCoerceHints,
  REAL_ESTATE_SIGNAL,
} from '@/lib/intake-v2/coerce-real-estate-parse';
import {
  inferInferredFieldKeys,
  mergeConfirmedFromMessage,
  detectDealTypeFromText,
} from '@/lib/intake-v2/field-confirmation';
import {
  isOffTopicNonRealEstate,
  isRealEstateIntent,
} from '@/lib/intake-v2/real-estate-guard';
import { buildShortV2Reply } from '@/lib/intake-v2/short-reply';
import { INTAKE_V2_OFF_TOPIC } from '@/lib/intake-v2/system-prompt';
import { resolveV2Chips } from '@/lib/intake-v2/v2-chips';
import { buildV2Readiness, type V2MissingField } from '@/lib/intake-v2/v2-readiness';
import { buildV2TurnPlan } from '@/lib/intake-v2/v2-question-driver';
import { reasonV2Turn } from '@/lib/intake-v2/v2-turn-reasoner';
import { extractV2Intelligence } from '@/lib/intake-v2/v2-intelligence-extract';
import { maybeEnrichWithMlxIntelligence } from '@/lib/intake-v2/v2-mlx-intelligence';
import { syncV2DraftToCanonicalEntities } from '@/lib/intake-v2/v2-canonical-bridge';
import type { PublishValidationResult } from '@/intake/validation/publishValidator';
import {
  applyLocationCorrectionWithEntities,
  applyCityOnlyLocationReply,
  clearDraftLocation,
  isLocationCorrectionMessage,
} from '@/lib/intake-v2/location-correction';
import { extractLocationFragment } from '@/lib/need-intake/location-fragment';
import { parseCity } from '@/lib/need-intake/intent-parser';

export interface IntakeV2TurnResult extends ChatTurnResponse {
  needDraft: NeedDraft;
  currentQuestion: NextQuestionResponse | null;
  extractedSummary: string;
  offTopic?: boolean;
  canSoftPreview?: boolean;
  missingFields?: V2MissingField[];
  confirmedCount?: number;
  requiredCount?: number;
  confirmedFields?: string[];
  inferredFields?: string[];
  activeFieldKey?: string | null;
  activeFieldLabel?: string | null;
  confirmedDelta?: string[];
  publishValidation?: PublishValidationResult;
}

function buildRawText(turns: ConversationTurn[], userMessage: string): string {
  const prior = turns.filter((t) => t.role === 'user').map((t) => t.content.trim());
  const latest = userMessage.trim();
  return [...prior, latest].filter(Boolean).join('\n');
}

function applyCoerceHintsToAnswers(
  answers: NeedDraft['answers'],
  hints: ReturnType<typeof extractCoerceHints>
): NeedDraft['answers'] {
  const next = { ...answers };
  if (hints.dealType && !next.dealType) next.dealType = hints.dealType;
  if (hints.propertyKind && !next.propertyKind) next.propertyKind = hints.propertyKind;
  if (hints.floorMin != null && next.floorMin == null) next.floorMin = hints.floorMin;
  if (hints.location && !next.location) next.location = hints.location;
  return next;
}

const COMMERCIAL_LEAVES = new Set([
  'shop-rent',
  'shop-sale',
  'office-rent',
  'office-sale',
]);

export function syncDealTypeFromCategory(
  answers: NeedDraft['answers'],
  categorySlug: string
): NeedDraft['answers'] {
  const next = { ...answers };
  const explicit = String(next.dealType ?? '');
  if (
    categorySlug.endsWith('-rent') &&
    (!explicit || explicit === 'buy' || explicit === 'sell')
  ) {
    next.dealType = 'rent_monthly';
  }
  return next;
}

function diffConfirmed(before: Set<string>, after: Set<string>): string[] {
  const delta: string[] = [];
  for (const k of after) {
    if (!before.has(k)) delta.push(k);
  }
  return delta;
}

export async function orchestrateIntakeV2Turn(
  draft: NeedDraft,
  turns: ConversationTurn[],
  userMessage: string,
  opts?: {
    confirmedFields?: string[];
    chipFieldKey?: string;
    chipValue?: string;
    lastAskedField?: string | null;
    preferredCityId?: string | null;
    preferredCityName?: string | null;
  }
): Promise<IntakeV2TurnResult> {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return {
      assistantMessage: 'پیام خود را بنویسید.',
      readinessScore: 0,
      readyToPreview: false,
      needDraft: draft,
      currentQuestion: null,
      extractedSummary: '',
      confirmedFields: opts?.confirmedFields ?? [],
      inferredFields: [],
      activeFieldKey: null,
    };
  }

  const priorConfirmed = new Set(opts?.confirmedFields ?? []);
  const rawText = buildRawText(turns, trimmed);
  let reParsed = await parseFromTextAsync(rawText);
  reParsed.rawText = rawText;

  if (
    /ماشین|خودرو|پژو|موتور|وانت|suv/i.test(trimmed) &&
    !REAL_ESTATE_SIGNAL.test(trimmed)
  ) {
    return {
      assistantMessage: INTAKE_V2_OFF_TOPIC,
      readinessScore: 0,
      readyToPreview: false,
      needDraft: draft,
      currentQuestion: null,
      extractedSummary: '',
      offTopic: true,
      confirmedFields: [...priorConfirmed],
      inferredFields: [],
      activeFieldKey: null,
    };
  }

  const hasPriorRealEstate =
    isRealEstateIntent(draft.parsedIntent) || draft.vertical === 'real-estate';
  reParsed = coerceRealEstateParse(reParsed, rawText);
  if (
    !hasPriorRealEstate &&
    isOffTopicNonRealEstate(reParsed) &&
    !isRealEstateIntent(reParsed)
  ) {
    return {
      assistantMessage: INTAKE_V2_OFF_TOPIC,
      readinessScore: 0,
      readyToPreview: false,
      needDraft: draft,
      currentQuestion: null,
      extractedSummary: '',
      offTopic: true,
      confirmedFields: [...priorConfirmed],
      inferredFields: [],
      activeFieldKey: null,
    };
  }

  const reasoned = reasonV2Turn({
    parsed: reParsed,
    rawText,
    trimmed,
    draft,
    chipFieldKey: opts?.chipFieldKey,
    chipValue: opts?.chipValue,
    preferredCityId: opts?.preferredCityId,
    preferredCityName: opts?.preferredCityName,
  });

  const seeded = seedAnswersFromParsed(reasoned.parsedIntent, draft.leadPhone);
  const slotUpdates = extractSlotsFromRules(reasoned.parsedIntent, {
    ...reasoned.answers,
    ...seeded,
  });

  let mergedAnswers: NeedDraft['answers'] = {
    ...seeded,
    ...(slotUpdates as NeedDraft['answers']),
    ...reasoned.answers,
  };

  const coerceHints = extractCoerceHints(rawText);
  mergedAnswers = applyCoerceHintsToAnswers(mergedAnswers, coerceHints);

  if (reasoned.parsedIntent.entities?.propertyKind) {
    mergedAnswers.propertyKind = reasoned.parsedIntent.entities.propertyKind;
  }
  if (coerceHints.propertyKind) {
    mergedAnswers.propertyKind = coerceHints.propertyKind;
  }

  const dealFromMessage = detectDealTypeFromText(trimmed);
  if (dealFromMessage) {
    const current = String(mergedAnswers.dealType ?? '');
    const lockedRahn = current === 'rent_rahn_ejare' || current === 'rent_rahn_full';
    if (!lockedRahn || dealFromMessage !== 'rent_monthly') {
      mergedAnswers.dealType = dealFromMessage;
    }
  }

  const mergedIntent = reasoned.parsedIntent;

  const updatedTurns: ConversationTurn[] = [
    ...turns,
    { role: 'user', content: trimmed },
  ];

  let needDraft = recomputeNeedDraft({
    ...draft,
    parsedIntent: mergedIntent,
    answers: mergedAnswers,
    sourceText: rawText,
    turns: updatedTurns,
  });

  const coerced = coerceRealEstateParse(needDraft.parsedIntent, rawText);
  const shortContextReply =
    trimmed.length <= 24 && !REAL_ESTATE_SIGNAL.test(trimmed);
  const preservedCategory =
    COMMERCIAL_LEAVES.has(draft.parsedIntent.categorySlug) &&
    !COMMERCIAL_LEAVES.has(coerced.categorySlug)
      ? draft.parsedIntent.categorySlug
      : shortContextReply &&
          (draft.parsedIntent.categorySlug.startsWith('land-') ||
            draft.parsedIntent.categorySlug.startsWith('villa-'))
        ? draft.parsedIntent.categorySlug
        : coerced.categorySlug;
  const coercedIntent = {
    ...coerced,
    categorySlug: preservedCategory,
  };

  if (isRealEstateIntent(coercedIntent)) {
    needDraft = {
      ...needDraft,
      vertical: 'real-estate',
      parsedIntent: {
        ...needDraft.parsedIntent,
        intentType: coercedIntent.intentType,
        categorySlug: coercedIntent.categorySlug,
        subcategorySlug: coercedIntent.subcategorySlug,
        confidence: Math.max(needDraft.parsedIntent.confidence, coercedIntent.confidence),
        entities: {
          ...needDraft.parsedIntent.entities,
          ...coercedIntent.entities,
        },
        neighborhoodSlug:
          needDraft.parsedIntent.neighborhoodSlug ?? coercedIntent.neighborhoodSlug,
        neighborhoodCandidates:
          needDraft.parsedIntent.neighborhoodCandidates ??
          coercedIntent.neighborhoodCandidates,
        locationAmbiguous:
          needDraft.parsedIntent.locationAmbiguous ?? coercedIntent.locationAmbiguous,
        locationResolutionStatus: needDraft.parsedIntent.locationResolutionStatus,
        rejectLocationAutoConfirm: needDraft.parsedIntent.rejectLocationAutoConfirm,
        cityCandidates: needDraft.parsedIntent.cityCandidates,
        city: needDraft.parsedIntent.city ?? coercedIntent.city,
      },
      answers: applyCoerceHintsToAnswers(
        syncDealTypeFromCategory(needDraft.answers, coercedIntent.categorySlug),
        coerceHints
      ),
    };
  } else {
    needDraft = {
      ...needDraft,
      answers: syncDealTypeFromCategory(needDraft.answers, mergedIntent.categorySlug),
    };
  }

  const locationCorrected = isLocationCorrectionMessage(trimmed);

  let confirmedFields = mergeConfirmedFromMessage(trimmed, needDraft, priorConfirmed, {
    chipFieldKey: opts?.chipFieldKey,
    chipValue: opts?.chipValue,
  });

  if (reasoned.locationConfirmedByCatalog && !locationCorrected) {
    if (!needDraft.parsedIntent.rejectLocationAutoConfirm) {
      confirmedFields.add('location');
    }
  }

  if (
    coercedIntent.categorySlug.endsWith('-rent') &&
    needDraft.answers.dealType === 'rent_monthly' &&
    /اجاره|رهن|ودیعه|مستاجر|رنت|دانشجو|برای\s*دانشجو/i.test(rawText) &&
    !/زمین|کلنگی|پروانه\s*ساخت/.test(rawText)
  ) {
    confirmedFields.add('dealType');
  }

  let intelligence = extractV2Intelligence(rawText, needDraft);
  intelligence = await maybeEnrichWithMlxIntelligence(rawText, needDraft, intelligence);
  needDraft = await syncV2DraftToCanonicalEntities(needDraft, rawText, intelligence);

  const userStatedLocationThisTurn =
    Boolean(extractLocationFragment(trimmed)) ||
    /(?:^|\s)(?:در|محله)\s+[^\s،]{2,}/.test(trimmed) ||
    /مشهد|تهران|اصفهان|شیراز|کرج|تبریز/.test(trimmed) ||
    opts?.chipValue?.startsWith('__hood__:') ||
    opts?.chipValue?.startsWith('__city__:') ||
    locationCorrected;

  if (
    needDraft.parsedIntent.rejectLocationAutoConfirm &&
    !userStatedLocationThisTurn &&
    !priorConfirmed.has('location')
  ) {
    confirmedFields.delete('location');
  }

  const turnCoerce = coerceRealEstateParse(
    { ...needDraft.parsedIntent, rawText: trimmed },
    trimmed
  );
  const turnHints = extractCoerceHints(trimmed);
  if (turnHints.propertyKind || turnCoerce.categorySlug !== 'general') {
    needDraft = {
      ...needDraft,
      answers: {
        ...needDraft.answers,
        ...(turnHints.propertyKind ? { propertyKind: turnHints.propertyKind } : {}),
      },
      parsedIntent: {
        ...needDraft.parsedIntent,
        categorySlug:
          turnCoerce.categorySlug !== 'general' &&
          turnCoerce.categorySlug !== needDraft.parsedIntent.categorySlug
            ? turnCoerce.categorySlug
            : needDraft.parsedIntent.categorySlug,
        entities: {
          ...needDraft.parsedIntent.entities,
          ...(turnHints.propertyKind ? { propertyKind: turnHints.propertyKind } : {}),
        },
      },
    };
  }

  if (
    needDraft.parsedIntent.locationResolutionStatus === 'resolved' &&
    needDraft.parsedIntent.city &&
    needDraft.parsedIntent.neighborhoodSlug
  ) {
    const hood =
      needDraft.parsedIntent.entities?.area ??
      needDraft.parsedIntent.neighborhoodSlug.replace(/-/g, ' ');
    needDraft = {
      ...needDraft,
      answers: {
        ...needDraft.answers,
        location: `${hood}، ${needDraft.parsedIntent.city}`,
        _neighborhoodSlug: needDraft.parsedIntent.neighborhoodSlug,
      },
    };
  }

  if (locationCorrected) {
    confirmedFields.delete('location');
    needDraft = applyLocationCorrectionWithEntities(clearDraftLocation(needDraft), trimmed);
    if (
      needDraft.parsedIntent.neighborhoodSlug &&
      needDraft.parsedIntent.city &&
      !needDraft.parsedIntent.locationAmbiguous
    ) {
      confirmedFields.add('location');
    }
  } else if (
    opts?.lastAskedField === 'location' &&
    parseCity(trimmed) &&
    !extractLocationFragment(trimmed)
  ) {
    needDraft = applyCityOnlyLocationReply(needDraft, trimmed, {
      preferredCityId: opts?.preferredCityId,
      preferredCityName: opts?.preferredCityName,
    });
    if (
      needDraft.parsedIntent.neighborhoodSlug &&
      needDraft.parsedIntent.city &&
      !needDraft.parsedIntent.rejectLocationAutoConfirm
    ) {
      confirmedFields.add('location');
    }
  }

  const confirmedDelta = diffConfirmed(priorConfirmed, confirmedFields);
  const readiness = buildV2Readiness(needDraft, confirmedFields);
  const turnPlan = buildV2TurnPlan(needDraft, confirmedFields, readiness);
  const inferredFields = inferInferredFieldKeys(needDraft, confirmedFields);

  const assistantMessage = buildShortV2Reply(
    needDraft,
    trimmed,
    readiness,
    turnPlan,
    {
      confirmedDelta,
      lastAskedField: opts?.lastAskedField,
    }
  );

  const finalTurns: ConversationTurn[] = [
    ...updatedTurns,
    { role: 'assistant', content: assistantMessage },
  ];
  needDraft = { ...needDraft, turns: finalTurns };

  const extractedSummary = buildSummary(
    needDraft.parsedIntent,
    needDraft.answers,
    rawText
  );

  const suggestedChips = resolveV2Chips(needDraft, turnPlan);

  const currentQuestion = getNextQuestion(
    needDraft.parsedIntent.intentType,
    needDraft.parsedIntent,
    needDraft.answers
  );

  return {
    assistantMessage,
    slotUpdates,
    readinessScore: readiness.readinessScore,
    readyToPreview: readiness.readyToPreview,
    canSoftPreview: readiness.canSoftPreview,
    missingFields: readiness.missingFields,
    confirmedCount: readiness.confirmedCount,
    requiredCount: readiness.requiredCount,
    confirmedFields: [...confirmedFields],
    inferredFields,
    suggestedChips,
    needDraft,
    currentQuestion,
    extractedSummary,
    activeFieldKey: turnPlan.activeFieldKey,
    activeFieldLabel: turnPlan.activeFieldLabel,
    confirmedDelta,
    publishValidation: {
      success: readiness.publishValid,
      errors: readiness.publishErrors.map((message) => ({ field: 'publish', message })),
    },
  };
}
