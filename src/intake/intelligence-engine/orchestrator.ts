import { unifiedNormalize } from '@/intake/intelligence-engine/normalizer/unified-normalizer';
import { extractEntities } from '@/intake/intelligence-engine/extractors/entity-extractor';
import { resolveLocationViaLre } from '@/intake/intelligence-engine/resolvers/location-lre-bridge';
import { resolveCategory } from '@/intake/intelligence-engine/resolvers/category-resolver';
import { resolveBudget } from '@/intake/intelligence-engine/resolvers/budget-resolver';
import { resolveProperty } from '@/intake/intelligence-engine/resolvers/property-resolver';
import { resolveDealTypeFields } from '@/intake/intelligence-engine/resolvers/deal-type-resolver';
import {
  mergeFieldBags,
  scoreFieldConfidence,
  fieldsNeedingAi,
  overallFieldConfidence,
} from '@/intake/intelligence-engine/scoring/field-confidence-engine';
import { detectGaps } from '@/intake/intelligence-engine/gaps/gap-detector';
import { resolveWithAi } from '@/intake/intelligence-engine/ai/ai-resolver';
import {
  runTruthVerification,
  truthVerifyEnabled,
} from '@/intake/intelligence-engine/ai/truth-verifier';
import { buildNeedFromFields } from '@/intake/intelligence-engine/need-builder/need-builder';
import {
  buildIntelligenceTrace,
  createStepTrace,
} from '@/intake/intelligence-engine/trace/intake-trace-builder';
import {
  createEmptyFieldBag,
  fieldBagToRecord,
  setField,
  type IntakeIntelligenceInput,
  type IntakeIntelligenceResult,
  type IntakeIntelligenceStepTrace,
} from '@/intake/intelligence-engine/types';
import {
  buildParseCacheKey,
  getIntelligenceCache,
  setIntelligenceCache,
} from '@/lib/need-intake/intake-parse-cache-store';
import { getNextQuestion } from '@/lib/need-intake/question-engine';
import { isIntakeAiGloballyDisabled } from '@/intake/rules/config';
import type { NeedDraft } from '@/contracts/need-intake';
import { REGISTRY_CATEGORY_OVERRIDE_THRESHOLD } from '@/intake/rules/config';
import { isHybridIntakeEnabled } from '@/intake/intelligence-engine/hybrid/config';
import { inferCriticalFilterSuggestions } from '@/intake/intelligence-engine/suggestions/critical-filter-suggestions';

const AI_CONFIDENCE_THRESHOLD = 0.6;

/** Rules sometimes assign the same amount to rahn and rent ? always verify with AI. */
function rulesSuspectDuplicateMoney(bag: ReturnType<typeof createEmptyFieldBag>): boolean {
  const rahn = bag.rahnAmount?.value;
  const rent = bag.monthlyRent?.value;
  if (rahn == null || rent == null) return false;
  return Number(rahn) === Number(rent) && Number(rahn) > 0;
}

function mergeEngineEntities(
  bag: ReturnType<typeof createEmptyFieldBag>,
  analysis: ReturnType<typeof extractEntities>
): void {
  const e = analysis.entities;
  if (e.vertical) {
    setField(bag, 'vertical', {
      value: e.vertical,
      confidence: analysis.confidence.category ?? 0.7,
      source: 'rule',
    });
  }
  if (e.categorySlug && !bag.categorySlug?.lockedByUser) {
    const registryConf = bag.categorySlug?.confidence ?? 0;
    const engineConf = analysis.confidence.category ?? 0.75;
    if (engineConf > registryConf + 0.05 && engineConf >= REGISTRY_CATEGORY_OVERRIDE_THRESHOLD) {
      setField(bag, 'categorySlug', {
        value: e.categorySlug,
        confidence: engineConf,
        source: 'rule',
      });
    }
  }
  if (e.subcategorySlug && !bag.subcategorySlug?.lockedByUser) {
    const registryConf = bag.subcategorySlug?.confidence ?? 0;
    const engineConf = analysis.confidence.category ?? 0.75;
    if (engineConf > registryConf + 0.05 && engineConf >= REGISTRY_CATEGORY_OVERRIDE_THRESHOLD) {
      setField(bag, 'subcategorySlug', {
        value: e.subcategorySlug,
        confidence: engineConf,
        source: 'rule',
      });
    }
  }
  if (e.city && analysis.confidence.city != null) {
    setField(bag, 'city', {
      value: e.city,
      confidence: analysis.confidence.city,
      source: 'dictionary',
      evidence: 'engine-entities',
    });
  }
  if (e.citySlug && analysis.confidence.city != null) {
    setField(bag, 'citySlug', {
      value: e.citySlug,
      confidence: analysis.confidence.city,
      source: 'resolver',
      evidence: 'engine-entities',
    });
  }
  if (e.neighborhood && analysis.confidence.neighborhood != null) {
    setField(bag, 'neighborhood', {
      value: e.neighborhood,
      confidence: analysis.confidence.neighborhood,
      source: 'rule',
      evidence: 'engine-entities',
    });
  }
  if (e.neighborhoodSlug && analysis.confidence.neighborhood != null) {
    setField(bag, 'neighborhoodSlug', {
      value: e.neighborhoodSlug,
      confidence: analysis.confidence.neighborhood,
      source: 'resolver',
      evidence: 'engine-entities',
    });
  }
  if (e.area != null && analysis.confidence.area != null) {
    setField(bag, 'area', { value: e.area, confidence: analysis.confidence.area, source: 'rule', evidence: 'engine-entities' });
  }
  if (e.rooms != null && analysis.confidence.rooms != null) {
    setField(bag, 'rooms', { value: e.rooms, confidence: analysis.confidence.rooms, source: 'rule', evidence: 'engine-entities' });
  }
  if (e.budgetMax != null && analysis.confidence.budget != null) {
    setField(bag, 'budgetMax', { value: e.budgetMax, confidence: analysis.confidence.budget, source: 'rule', evidence: 'engine-entities' });
  }
  if (e.transactionType && analysis.confidence.transactionType != null) {
    setField(bag, 'transactionType', {
      value: e.transactionType,
      confidence: analysis.confidence.transactionType,
      source: 'rule',
      evidence: 'engine-entities',
    });
  }
}

export async function runIntakeIntelligence(
  input: IntakeIntelligenceInput,
  opts?: { existingDraft?: NeedDraft | null; skipCache?: boolean }
): Promise<IntakeIntelligenceResult> {
  const started = performance.now();
  const text = input.text.trim();
  if (text.length < 3) {
    throw new Error('text too short');
  }

  const cacheKey = buildParseCacheKey(
    text,
    input.citySlug,
    input.cityName,
    input.formHints,
    Boolean(input.forceAi)
  );
  if (!opts?.skipCache) {
    const cached = await getIntelligenceCache(cacheKey);
    if (cached) {
      cached.trace.cacheHit = true;
      cached.meta.latencyMs = Math.round(performance.now() - started);
      return cached;
    }
  }

  if (isHybridIntakeEnabled()) {
    const { runHybridIntakePipeline } = await import(
      '@/intake/intelligence-engine/hybrid/hybrid-pipeline'
    );
    const result = await runHybridIntakePipeline(input, { existingDraft: opts?.existingDraft });
    await setIntelligenceCache(cacheKey, result);
    return result;
  }

  const steps: IntakeIntelligenceStepTrace[] = [];
  let t = performance.now();

  const norm = unifiedNormalize(text);
  steps.push(createStepTrace('normalize', t, 'unified-normalizer'));

  t = performance.now();
  const categoryResolved = await resolveCategory(text, input);
  const categoryPartial = categoryResolved.fields;
  const budgetPartial = resolveBudget(text);
  const propertyPartial = resolveProperty(text);
  steps.push(
    createStepTrace(
      'property-budget-category',
      t,
      'category-intent-engine',
      categoryResolved.method
    )
  );

  t = performance.now();
  const engineAnalysis = extractEntities(norm.lookupKey, text, {
    preferredCityName: input.cityName,
  });
  steps.push(createStepTrace('entity-extractor', t, 'intakeEngine'));

  t = performance.now();
  const locationResult = await resolveLocationViaLre(norm.lookupKey, text, input);
  steps.push(createStepTrace('location', t, 'lre+scope', locationResult.status));

  let bag = createEmptyFieldBag();
  bag = mergeFieldBags(bag, categoryPartial, budgetPartial, propertyPartial);
  mergeEngineEntities(bag, engineAnalysis);
  bag = mergeFieldBags(bag, locationResult.fields);

  t = performance.now();
  const dealPartial = resolveDealTypeFields(text, bag);
  bag = mergeFieldBags(bag, dealPartial);
  scoreFieldConfidence(bag);
  steps.push(createStepTrace('deal-type', t, 'resolveTransactionType'));

  let aiInvoked = categoryResolved.aiInvoked;
  let aiProvider: string | null = categoryResolved.aiProvider;
  let aiLatencyMs = categoryResolved.aiLatencyMs;
  let truthVerification: IntakeIntelligenceResult['trace']['truthVerification'];

  const aiDisabled = isIntakeAiGloballyDisabled();

  const unresolved = aiDisabled
    ? []
    : fieldsNeedingAi(bag, {
        threshold: AI_CONFIDENCE_THRESHOLD,
        vertical: String(bag.vertical?.value ?? ''),
      });

  const shouldAi =
    !aiDisabled &&
    (input.forceAi ||
      process.env.NEED_INTAKE_TRUTH_VERIFY_ALWAYS === 'true' ||
      rulesSuspectDuplicateMoney(bag) ||
      (unresolved.length > 0 && overallFieldConfidence(bag) < 0.82));

  if (
    shouldAi &&
    !aiDisabled &&
    (unresolved.length > 0 ||
      input.forceAi ||
      process.env.NEED_INTAKE_TRUTH_VERIFY_ALWAYS === 'true')
  ) {
    t = performance.now();

    if (truthVerifyEnabled()) {
      const verifyResult = await runTruthVerification({
        text,
        normalizedText: norm.lookupKey,
        fields: bag,
        unresolvedFields: unresolved,
        categoryLockedByUser: input.formHints?.categoryLockedByUser,
      });
      bag = verifyResult.fields;
      aiProvider = verifyResult.provider;
      aiLatencyMs += verifyResult.latencyMs;
      truthVerification = {
        invoked: verifyResult.invoked,
        fieldsChecked: verifyResult.fieldsChecked,
        corrected: verifyResult.corrected,
        confirmed: verifyResult.confirmed,
        skipped: verifyResult.skipped,
        latencyMs: verifyResult.latencyMs,
      };
      aiInvoked = verifyResult.invoked || verifyResult.fieldsChecked.length > 0 || aiInvoked;
      scoreFieldConfidence(bag);
      steps.push(
        createStepTrace(
          'truth-verifier',
          t,
          aiProvider ?? 'none',
          [
            verifyResult.corrected.length
              ? `corrected:${verifyResult.corrected.join(',')}`
              : 'no-corrections',
            verifyResult.confirmed.length
              ? `confirmed:${verifyResult.confirmed.length}`
              : '',
          ]
            .filter(Boolean)
            .join(' ')
        )
      );
    } else if (unresolved.length > 0) {
      const aiResult = await resolveWithAi(
        { text, normalizedText: norm.lookupKey, unresolvedFields: unresolved },
        bag
      );
      bag = aiResult.fields;
      aiInvoked = aiResult.invoked || aiInvoked;
      aiProvider = aiResult.provider ?? aiProvider;
      aiLatencyMs += aiResult.latencyMs;
      steps.push(createStepTrace('ai-resolver', t, aiProvider ?? 'none', unresolved.join(',')));
    }
  }

  const categoryCandidatesUi = categoryResolved.candidates;
  const parsedLocationPatch = {
    ...locationResult.parsedLocationPatch,
    ...(categoryResolved.intent?.intentType
      ? { intentType: categoryResolved.intent.intentType }
      : {}),
    ...(categoryCandidatesUi.length >= 2 && !bag.categorySlug?.value
      ? { categoryCandidates: categoryCandidatesUi }
      : {}),
  };

  t = performance.now();
  const built = buildNeedFromFields({
    sourceText: text,
    fields: bag,
    gaps: [],
    formHints: input.formHints,
    existingDraft: opts?.existingDraft,
    locationScope: { citySlug: input.citySlug, cityName: input.cityName },
    parsedLocationPatch,
  });
  const gaps = detectGaps(bag, built.parsedIntent, built.missingFields, text);
  if (categoryResolved.ambiguousUnresolved && categoryCandidatesUi.length >= 2) {
    gaps.push({
      id: 'category_ambiguous',
      kind: 'uncertain',
      fieldKey: 'categorySlug',
      messageFa: 'دسته‌بندی دقیق مشخص نیست — یکی از گزینه‌ها را انتخاب کنید.',
    });
  }
  const draft = buildNeedFromFields({
    sourceText: text,
    fields: bag,
    gaps,
    formHints: input.formHints,
    existingDraft: opts?.existingDraft,
    locationScope: { citySlug: input.citySlug, cityName: input.cityName },
    parsedLocationPatch: {
      ...parsedLocationPatch,
      categoryCandidates:
        categoryCandidatesUi.length >= 2
          ? categoryCandidatesUi
          : built.parsedIntent.categoryCandidates,
    },
  }).draft;
  steps.push(createStepTrace('need-builder', t, 'need-builder', categoryResolved.method));

  const nextQ = getNextQuestion(
    draft.parsedIntent.intentType,
    draft.parsedIntent,
    draft.answers as Record<string, unknown>
  );
  const recommendedQuestions = nextQ.done
    ? (gaps.map((g) => g.messageFa).filter(Boolean) as string[])
    : [
        nextQ.question ??
          nextQ.disambiguation?.question ??
          nextQ.field?.label ??
          '',
      ].filter(Boolean);

  if (categoryResolved.ambiguousUnresolved && categoryCandidatesUi.length >= 2) {
    recommendedQuestions.unshift('کدام دسته‌بندی به نیاز شما نزدیک‌تر است؟');
  }

  const intelligenceTrace = buildIntelligenceTrace({
    inputText: text,
    normalizedText: norm.lookupKey,
    steps,
    fieldMeta: fieldBagToRecord(bag),
    aiInvoked,
    aiProvider,
    aiLatencyMs,
    truthVerification,
  });

  const suggestedFilters = inferCriticalFilterSuggestions({
    categorySlug: String(bag.subcategorySlug?.value ?? bag.categorySlug?.value ?? ''),
    fieldBag: bag,
    existingAnswers: draft.answers as Record<string, unknown>,
  });

  const result: IntakeIntelligenceResult = {
    fields: bag,
    gaps,
    trace: intelligenceTrace,
    draft,
    missingFields: draft.missingFields,
    nextQuestion: draft.nextQuestion ?? null,
    recommendedQuestions,
    parsedIntent: draft.parsedIntent,
    categoryCandidates: categoryCandidatesUi.length >= 2 ? categoryCandidatesUi : undefined,
    suggestedFilters,
    meta: {
      engine: truthVerification?.invoked
        ? 'intake-intelligence+truth-verify'
        : aiInvoked
          ? 'intake-intelligence+ai'
          : 'intake-intelligence',
      aiInvoked,
      latencyMs: Math.round(performance.now() - started),
      truthVerifyCorrected: truthVerification?.corrected,
    },
  };

  await setIntelligenceCache(cacheKey, result);
  return result;
}
