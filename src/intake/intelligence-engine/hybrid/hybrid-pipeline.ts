import { unifiedNormalize } from '@/intake/intelligence-engine/normalizer/unified-normalizer';
import { extractEntities } from '@/intake/intelligence-engine/extractors/entity-extractor';
import { resolveLocationViaLre } from '@/intake/intelligence-engine/resolvers/location-lre-bridge';
import { resolveBudget } from '@/intake/intelligence-engine/resolvers/budget-resolver';
import { resolveProperty } from '@/intake/intelligence-engine/resolvers/property-resolver';
import { resolveDealTypeFields } from '@/intake/intelligence-engine/resolvers/deal-type-resolver';
import {
  mergeFieldBags,
  scoreFieldConfidence,
} from '@/intake/intelligence-engine/scoring/field-confidence-engine';
import { detectGaps } from '@/intake/intelligence-engine/gaps/gap-detector';
import { buildNeedFromFields } from '@/intake/intelligence-engine/need-builder/need-builder';
import { buildIntelligenceTrace, createStepTrace } from '@/intake/intelligence-engine/trace/intake-trace-builder';
import {
  createEmptyFieldBag,
  fieldBagToRecord,
  setField,
  type IntakeIntelligenceInput,
  type IntakeIntelligenceResult,
  type IntakeIntelligenceStepTrace,
} from '@/intake/intelligence-engine/types';
import type { IntentSliceResult } from '@/intake/intelligence-engine/hybrid/intent-slice-schema';
import {
  buildRulesSourceText,
  runIntentGist,
  shouldRunIntentGist,
} from '@/intake/intelligence-engine/hybrid/intent-gist';
import { scopedMatchToFieldBag } from '@/intake/intelligence-engine/hybrid/scoped-category-bag';
import { detectPackRequiredGaps } from '@/intake/intelligence-engine/hybrid/pack-required-gaps';
import {
  collectHybridUnresolvedFields,
  runScopedFieldFill,
} from '@/intake/intelligence-engine/hybrid/scoped-field-fill';
import { isIntakeAiGloballyDisabled, REGISTRY_CATEGORY_OVERRIDE_THRESHOLD } from '@/intake/rules/config';
import { rulesCategoryToFieldBag } from '@/intake/rules/resolver/rules-category-resolver';
import { getNextQuestion } from '@/lib/need-intake/question-engine';
import type { NeedDraft } from '@/contracts/need-intake';
import type { CategoryCandidateOption } from '@/contracts/need-intake';
import { inferCriticalFilterSuggestions } from '@/intake/intelligence-engine/suggestions/critical-filter-suggestions';
import { validatePostFillFields } from '@/intake/agent/post-fill-validation';
import { AiCallBudget } from '@/intake/intelligence-engine/hybrid/ai-call-budget';
import {
  categoryCandidatesForUi,
  runCategoryIntentEngine,
  type CategoryIntentEngineResult,
} from '@/intake/intelligence-engine/category/category-intent-engine';
import {
  cityCandidatesForUi,
  runCityDisambiguation,
} from '@/intake/intelligence-engine/disambiguation/city-disambiguation';
import { COMPOSE_AUTO_APPLY_MIN_CONFIDENCE } from '@/lib/need-intake/compose-auto-apply';

export { isHybridIntakeEnabled } from '@/intake/intelligence-engine/hybrid/config';

function mergeEngineEntitiesHybrid(
  bag: ReturnType<typeof createEmptyFieldBag>,
  analysis: ReturnType<typeof extractEntities>,
  skipCategory: boolean
): void {
  const e = analysis.entities;
  // Prefer real confidence; never inflate with ??0.7+ (RFC-0004).
  if (e.city && !bag.city?.value && analysis.confidence.city != null) {
    setField(bag, 'city', {
      value: e.city,
      confidence: analysis.confidence.city,
      source: 'dictionary',
      evidence: 'engine-entities',
    });
  }
  if (e.citySlug && !bag.citySlug?.value && analysis.confidence.city != null) {
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

  if (skipCategory || bag.categorySlug?.lockedByUser) return;

  const registryConf = bag.categorySlug?.confidence ?? 0;
  const engineConf = analysis.confidence.category ?? 0;
  if (
    e.categorySlug &&
    engineConf > registryConf + 0.05 &&
    engineConf >= REGISTRY_CATEGORY_OVERRIDE_THRESHOLD
  ) {
    setField(bag, 'categorySlug', {
      value: e.categorySlug,
      confidence: engineConf,
      source: 'rule',
      evidence: 'engine-category-override',
    });
  }
}

export async function runHybridIntakePipeline(
  input: IntakeIntelligenceInput,
  opts?: { existingDraft?: NeedDraft | null }
): Promise<IntakeIntelligenceResult> {
  const started = performance.now();
  const text = input.text.trim();
  const steps: IntakeIntelligenceStepTrace[] = [];
  let t = performance.now();
  let aiInvoked = false;
  let aiProvider: string | null = null;
  let aiLatencyMs = 0;
  let categoryCandidatesUi: CategoryCandidateOption[] = [];
  const aiBudget = new AiCallBudget();

  const norm = unifiedNormalize(text);
  steps.push(createStepTrace('normalize', t, 'unified-normalizer'));

  const categoryLocked = Boolean(input.formHints?.categoryLockedByUser);
  const gistPromise =
    shouldRunIntentGist(text, { categoryLocked }) && aiBudget.tryConsume()
      ? runIntentGist(text, {
          cityName: input.cityName,
          citySlug: input.citySlug,
          categoryLocked,
        })
      : Promise.resolve(null);

  let intentSlice: IntentSliceResult | null = null;
  let intentGist: string | null = null;
  let intentGistProvider: string | null = null;

  t = performance.now();
  const gistResult = await gistPromise;

  if (gistResult) {
    intentGist = gistResult.gist;
    intentGistProvider = gistResult.provider;
    if (!gistResult.cacheHit) {
      aiInvoked = true;
      aiProvider = gistResult.provider;
      aiLatencyMs += gistResult.latencyMs;
    }
    steps.push(
      createStepTrace(
        'intent-gist',
        t,
        gistResult.provider,
        gistResult.cacheHit ? `cache:${intentGist}` : intentGist
      )
    );
  }

  const rulesSourceText = buildRulesSourceText(text, intentGist);

  t = performance.now();
  let categoryPartial: Partial<ReturnType<typeof createEmptyFieldBag>>;
  let categoryDisambigMethod = 'rules';
  let categoryAmbiguousUnresolved = false;
  /** City disambiguation result (parallel with category when city not pre-locked). */
  let cityDisambigResult: Awaited<ReturnType<typeof runCityDisambiguation>> | null = null;

  const cityPreLocked = Boolean(input.citySlug);

  const applyCategoryEngine = (engine: CategoryIntentEngineResult) => {
    intentSlice = engine.intent;
    categoryCandidatesUi = categoryCandidatesForUi(engine.candidates);
    categoryDisambigMethod = engine.method;
    categoryAmbiguousUnresolved = engine.ambiguous && !engine.match;

    if (engine.aiInvoked) {
      aiInvoked = true;
      aiProvider = engine.aiProvider;
      aiLatencyMs += engine.aiLatencyMs;
    }

    if (engine.match) {
      return scopedMatchToFieldBag(engine.match, input, intentSlice);
    }
    // Ambiguous only blocks auto-pick when the user must choose among candidates.
    if (engine.ambiguous && engine.candidates.length >= 2) {
      return {};
    }
    return rulesCategoryToFieldBag(rulesSourceText, input);
  };

  if (categoryLocked) {
    categoryPartial = rulesCategoryToFieldBag(rulesSourceText, input);
    const lockedEngine = await runCategoryIntentEngine({
      text: rulesSourceText,
      categoryLockedByUser: true,
      lockedCategorySlug: input.formHints?.categorySlug,
      lockedSubcategorySlug: input.formHints?.subcategorySlug,
    });
    intentSlice = lockedEngine.intent;
    categoryDisambigMethod = lockedEngine.method;
  } else if (!cityPreLocked) {
    const [engine, cityEarly] = await Promise.all([
      runCategoryIntentEngine({
        text: rulesSourceText,
        forceAi: input.forceAi,
      }),
      runCityDisambiguation(text),
    ]);
    cityDisambigResult = cityEarly;
    categoryPartial = applyCategoryEngine(engine);

    if (cityEarly.aiInvoked) {
      aiInvoked = true;
      aiProvider = cityEarly.aiProvider;
      aiLatencyMs += cityEarly.aiLatencyMs;
    }

    steps.push(
      createStepTrace(
        'rules-hypothesis',
        t,
        'category-intent-engine',
        `${engine.method}:${engine.candidates.length}candidates+parallel-city`
      )
    );
  } else {
    const engine = await runCategoryIntentEngine({
      text: rulesSourceText,
      forceAi: input.forceAi,
    });
    categoryPartial = applyCategoryEngine(engine);

    steps.push(
      createStepTrace(
        'rules-hypothesis',
        t,
        'category-intent-engine',
        `${engine.method}:${engine.candidates.length}candidates`
      )
    );
  }

  t = performance.now();
  // Parallel text facets: budget / property / location merge into FieldBag only.
  const [budgetPartial, propertyPartial, engineAnalysis, locationResult] = await Promise.all([
    Promise.resolve(resolveBudget(text)),
    Promise.resolve(resolveProperty(text)),
    Promise.resolve(
      extractEntities(norm.lookupKey, text, {
        preferredCityName: input.cityName,
      })
    ),
    resolveLocationViaLre(norm.lookupKey, text, input),
  ]);
  steps.push(createStepTrace('resolvers', t, 'budget+property+location|parallel'));

  let bag = createEmptyFieldBag();
  bag = mergeFieldBags(bag, categoryPartial, budgetPartial, propertyPartial);
  mergeEngineEntitiesHybrid(
    bag,
    engineAnalysis,
    Boolean(categoryPartial.categorySlug?.value || categoryPartial.subcategorySlug?.value) ||
      categoryAmbiguousUnresolved
  );
  bag = mergeFieldBags(bag, locationResult.fields);

  const cityUnresolved =
    !bag.city?.value &&
    !bag.citySlug?.value &&
    !input.citySlug &&
    !input.cityName &&
    locationResult.status !== 'resolved';

  if (cityUnresolved) {
    t = performance.now();
    if (!cityDisambigResult) {
      cityDisambigResult = await runCityDisambiguation(text);
      if (cityDisambigResult.aiInvoked) {
        aiInvoked = true;
        aiProvider = cityDisambigResult.aiProvider;
        aiLatencyMs += cityDisambigResult.aiLatencyMs;
      }
    }
    if (
      cityDisambigResult.citySlug &&
      cityDisambigResult.cityName &&
      !cityDisambigResult.ambiguous
    ) {
      const raw = cityDisambigResult.candidates[0]?.score ?? 0;
      const confidence = Math.max(raw, COMPOSE_AUTO_APPLY_MIN_CONFIDENCE);
      setField(bag, 'citySlug', {
        value: cityDisambigResult.citySlug,
        confidence,
        source: cityDisambigResult.aiInvoked ? 'ai' : 'resolver',
        evidence: `city-disambig:${cityDisambigResult.method}`,
      });
      setField(bag, 'city', {
        value: cityDisambigResult.cityName,
        confidence,
        source: cityDisambigResult.aiInvoked ? 'ai' : 'dictionary',
        evidence: `city-disambig:${cityDisambigResult.method}`,
      });
    }
    steps.push(
      createStepTrace(
        'city-disambig',
        t,
        'disambiguation',
        `${cityDisambigResult.method}:${cityDisambigResult.candidates.length}`
      )
    );
  }

  t = performance.now();
  const dealPartial = resolveDealTypeFields(text, bag);
  bag = mergeFieldBags(bag, dealPartial);
  scoreFieldConfidence(bag);
  steps.push(createStepTrace('deal-type', t, 'resolveTransactionType'));

  const unresolvedForFill = collectHybridUnresolvedFields(bag, intentSlice, {
    forceAi: input.forceAi,
  });
  const shouldScopedFill =
    !isIntakeAiGloballyDisabled() &&
    !aiBudget.exhausted &&
    (Boolean(input.forceAi) || unresolvedForFill.length > 0);

  if (shouldScopedFill && aiBudget.tryConsume()) {
    t = performance.now();
    const fill = await runScopedFieldFill({
      text,
      normalizedText: norm.lookupKey,
      fields: bag,
      intentSlice,
      forceAi: input.forceAi,
      extraUnresolved: input.forceAi ? unresolvedForFill : undefined,
    });
    bag = fill.fields;
    if (fill.invoked) {
      aiInvoked = true;
      aiProvider = fill.provider;
      aiLatencyMs += fill.latencyMs;
    }
    scoreFieldConfidence(bag);
    steps.push(
      createStepTrace(
        'scoped-field-fill',
        t,
        fill.provider ?? 'none',
        fill.invoked
          ? `filled:${fill.unresolvedFields.slice(0, 6).join(',')}`
          : `skip:${fill.unresolvedFields.length}`
      )
    );
  }

  t = performance.now();
  const postFill = validatePostFillFields(bag);
  bag = postFill.fields;
  scoreFieldConfidence(bag);
  steps.push(
    createStepTrace(
      'post-fill-validation',
      t,
      'validatePostFillFields',
      postFill.rejectedKeys.length
        ? `rejected:${postFill.rejectedKeys.slice(0, 8).join(',')}`
        : `ok:warn=${postFill.warnings.length}`
    )
  );

  const parsedLocationPatch = {
    ...locationResult.parsedLocationPatch,
    ...(intentSlice?.intentType ? { intentType: intentSlice.intentType } : {}),
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

  const categorySlug = String(bag.subcategorySlug?.value ?? bag.categorySlug?.value ?? '');
  const packGaps = detectPackRequiredGaps(bag, categorySlug);
  const gaps = [
    ...detectGaps(bag, built.parsedIntent, built.missingFields, text),
    ...packGaps,
  ];

  if (categoryCandidatesUi.length >= 2 && !categorySlug) {
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
        categoryCandidatesUi.length >= 2 ? categoryCandidatesUi : built.parsedIntent.categoryCandidates,
      cityCandidates:
        built.parsedIntent.cityCandidates ??
        (cityDisambigResult?.ambiguous
          ? cityCandidatesForUi(cityDisambigResult.candidates)
          : undefined),
    },
  }).draft;

  steps.push(createStepTrace('need-builder', t, 'need-builder', categoryDisambigMethod));

  const nextQ = getNextQuestion(
    draft.parsedIntent.intentType,
    draft.parsedIntent,
    draft.answers as Record<string, unknown>
  );
  const recommendedQuestions = nextQ.done
    ? (gaps.map((g) => g.messageFa).filter(Boolean) as string[])
    : [
        nextQ.question ?? nextQ.disambiguation?.question ?? nextQ.field?.label ?? '',
      ].filter(Boolean);

  if (categoryCandidatesUi.length >= 2 && !categorySlug) {
    recommendedQuestions.unshift('کدام دسته‌بندی به نیاز شما نزدیک‌تر است؟');
  }

  const trace = buildIntelligenceTrace({
    inputText: text,
    normalizedText: norm.lookupKey,
    steps,
    fieldMeta: fieldBagToRecord(bag),
    aiInvoked,
    aiProvider,
    aiLatencyMs,
    intentGist,
    intentGistProvider,
  });

  const suggestedFilters = inferCriticalFilterSuggestions({
    categorySlug,
    fieldBag: bag,
    existingAnswers: draft.answers as Record<string, unknown>,
  });

  return {
    fields: bag,
    gaps,
    trace,
    draft,
    missingFields: draft.missingFields,
    nextQuestion: draft.nextQuestion ?? null,
    recommendedQuestions,
    parsedIntent: draft.parsedIntent,
    categoryCandidates: categoryCandidatesUi.length >= 2 ? categoryCandidatesUi : undefined,
    suggestedFilters,
    validationWarnings: postFill.warnings,
    meta: {
      engine: aiInvoked ? 'hybrid-intake+gemma4' : 'hybrid-intake-rules',
      aiInvoked,
      latencyMs: Math.round(performance.now() - started),
      textSignature: norm.lookupKey || text,
    },
  };
}
