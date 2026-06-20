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
import { runIntentSliceWithMeta } from '@/intake/intelligence-engine/hybrid/intent-slice';
import type { IntentSliceResult } from '@/intake/intelligence-engine/hybrid/intent-slice-schema';
import {
  buildRulesSourceText,
  runIntentGist,
  shouldRunIntentGist,
} from '@/intake/intelligence-engine/hybrid/intent-gist';
import { scopedMatchToFieldBag } from '@/intake/intelligence-engine/hybrid/scoped-category-bag';
import { detectPackRequiredGaps } from '@/intake/intelligence-engine/hybrid/pack-required-gaps';
import { rulesCategoryToFieldBag } from '@/intake/rules/resolver/rules-category-resolver';
import { getNextQuestion } from '@/lib/need-intake/question-engine';
import { isIntentSliceEnabled, isIntakeAiGloballyDisabled } from '@/intake/rules/config';
import type { NeedDraft } from '@/contracts/need-intake';
import type { CategoryCandidateOption } from '@/contracts/need-intake';
import { inferCriticalFilterSuggestions } from '@/intake/intelligence-engine/suggestions/critical-filter-suggestions';
import {
  categoryCandidatesForUi,
  runCategoryDisambiguation,
} from '@/intake/intelligence-engine/disambiguation/category-disambiguation';
import {
  cityCandidatesForUi,
  runCityDisambiguation,
} from '@/intake/intelligence-engine/disambiguation/city-disambiguation';

export { isHybridIntakeEnabled } from '@/intake/intelligence-engine/hybrid/config';

function mergeEngineEntitiesHybrid(
  bag: ReturnType<typeof createEmptyFieldBag>,
  analysis: ReturnType<typeof extractEntities>,
  skipCategory: boolean
): void {
  const e = analysis.entities;
  if (e.city && !bag.city?.value) {
    setField(bag, 'city', { value: e.city, confidence: analysis.confidence.city ?? 0.8, source: 'dictionary' });
  }
  if (e.citySlug && !bag.citySlug?.value) {
    setField(bag, 'citySlug', { value: e.citySlug, confidence: analysis.confidence.city ?? 0.8, source: 'resolver' });
  }
  if (e.neighborhood) {
    setField(bag, 'neighborhood', { value: e.neighborhood, confidence: analysis.confidence.neighborhood ?? 0.7, source: 'rule' });
  }
  if (e.neighborhoodSlug) {
    setField(bag, 'neighborhoodSlug', { value: e.neighborhoodSlug, confidence: analysis.confidence.neighborhood ?? 0.75, source: 'resolver' });
  }
  if (e.area != null) setField(bag, 'area', { value: e.area, confidence: analysis.confidence.area ?? 0.8, source: 'rule' });
  if (e.rooms != null) setField(bag, 'rooms', { value: e.rooms, confidence: analysis.confidence.rooms ?? 0.8, source: 'rule' });
  if (e.budgetMax != null) setField(bag, 'budgetMax', { value: e.budgetMax, confidence: analysis.confidence.budget ?? 0.75, source: 'rule' });
  if (e.transactionType) {
    setField(bag, 'transactionType', { value: e.transactionType, confidence: analysis.confidence.transactionType ?? 0.85, source: 'rule' });
  }

  if (skipCategory || bag.categorySlug?.lockedByUser) return;

  const registryConf = bag.categorySlug?.confidence ?? 0;
  const engineConf = analysis.confidence.category ?? 0;
  if (e.categorySlug && engineConf > registryConf + 0.05 && engineConf >= 0.78) {
    setField(bag, 'categorySlug', { value: e.categorySlug, confidence: engineConf, source: 'rule' });
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

  const norm = unifiedNormalize(text);
  steps.push(createStepTrace('normalize', t, 'unified-normalizer'));

  const categoryLocked = Boolean(input.formHints?.categoryLockedByUser);
  const gistPromise = shouldRunIntentGist(text, { categoryLocked })
    ? runIntentGist(text, {
        cityName: input.cityName,
        citySlug: input.citySlug,
        categoryLocked,
      })
    : Promise.resolve(null);
  const intentSlicePromise =
    !isIntakeAiGloballyDisabled() && (isIntentSliceEnabled() || input.forceAi)
      ? runIntentSliceWithMeta(text)
      : Promise.resolve(null);

  let intentSlice: IntentSliceResult | null = null;
  let intentGist: string | null = null;
  let intentGistProvider: string | null = null;

  t = performance.now();
  const [gistResult, intentResult] = await Promise.all([gistPromise, intentSlicePromise]);

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

  if (intentResult) {
    intentSlice = intentResult.slice;
    aiLatencyMs += intentResult.latencyMs;
    if (intentSlice) {
      aiInvoked = true;
      aiProvider = aiProvider ?? 'local-llm';
    }
    steps.push(
      createStepTrace(
        'intent-slice',
        t,
        'optional-legacy',
        intentSlice ? `${intentSlice.vertical}/${intentSlice.intentType}` : 'skipped'
      )
    );
  }

  const rulesSourceText = buildRulesSourceText(text, intentGist);

  t = performance.now();
  let categoryPartial: Partial<ReturnType<typeof createEmptyFieldBag>>;
  let categoryDisambigMethod = 'rules';
  let categoryAmbiguousUnresolved = false;
  let cityDisambigResult: Awaited<ReturnType<typeof runCityDisambiguation>> | null = null;

  const cityPreLocked = Boolean(input.citySlug);

  if (categoryLocked) {
    categoryPartial = rulesCategoryToFieldBag(rulesSourceText, input);
  } else if (!cityPreLocked) {
    const [disambig, cityEarly] = await Promise.all([
      runCategoryDisambiguation(rulesSourceText, {
        slugHints: intentSlice?.keywords,
      }),
      runCityDisambiguation(text),
    ]);
    cityDisambigResult = cityEarly;

    categoryCandidatesUi = categoryCandidatesForUi(disambig.candidates);
    categoryDisambigMethod = disambig.method;
    categoryAmbiguousUnresolved = disambig.ambiguous && !disambig.match;

    if (disambig.aiInvoked) {
      aiInvoked = true;
      aiProvider = disambig.aiProvider;
      aiLatencyMs += disambig.aiLatencyMs;
    }
    if (cityEarly.aiInvoked) {
      aiInvoked = true;
      aiProvider = cityEarly.aiProvider;
      aiLatencyMs += cityEarly.aiLatencyMs;
    }

    if (disambig.match) {
      categoryPartial = scopedMatchToFieldBag(disambig.match, input, intentSlice);
    } else if (disambig.ambiguous) {
      categoryPartial = {};
    } else {
      categoryPartial = rulesCategoryToFieldBag(rulesSourceText, input);
    }

    steps.push(
      createStepTrace(
        'rules-hypothesis',
        t,
        'disambiguation',
        `${disambig.method}:${disambig.candidates.length}candidates+parallel-city`
      )
    );
  } else {
    const disambig = await runCategoryDisambiguation(rulesSourceText, {
      slugHints: intentSlice?.keywords,
    });
    categoryCandidatesUi = categoryCandidatesForUi(disambig.candidates);
    categoryDisambigMethod = disambig.method;
    categoryAmbiguousUnresolved = disambig.ambiguous && !disambig.match;

    if (disambig.aiInvoked) {
      aiInvoked = true;
      aiProvider = disambig.aiProvider;
      aiLatencyMs += disambig.aiLatencyMs;
    }

    if (disambig.match) {
      categoryPartial = scopedMatchToFieldBag(disambig.match, input, intentSlice);
    } else if (disambig.ambiguous) {
      categoryPartial = {};
    } else {
      categoryPartial = rulesCategoryToFieldBag(rulesSourceText, input);
    }

    steps.push(
      createStepTrace(
        'rules-hypothesis',
        t,
        'disambiguation',
        `${disambig.method}:${disambig.candidates.length}candidates`
      )
    );
  }

  t = performance.now();
  const budgetPartial = resolveBudget(text);
  const propertyPartial = resolveProperty(text);
  const engineAnalysis = extractEntities(norm.lookupKey, text, {
    preferredCityName: input.cityName,
  });
  const locationResult = await resolveLocationViaLre(norm.lookupKey, text, input);
  steps.push(createStepTrace('resolvers', t, 'budget+property+location'));

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
    !bag.citySlug?.value &&
    !input.citySlug &&
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
    if (cityDisambigResult.citySlug && cityDisambigResult.cityName) {
      setField(bag, 'citySlug', {
        value: cityDisambigResult.citySlug,
        confidence: 0.82,
        source: cityDisambigResult.aiInvoked ? 'ai' : 'resolver',
      });
      setField(bag, 'city', {
        value: cityDisambigResult.cityName,
        confidence: 0.82,
        source: cityDisambigResult.aiInvoked ? 'ai' : 'dictionary',
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

  const parsedLocationPatch = {
    ...locationResult.parsedLocationPatch,
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
    meta: {
      engine: aiInvoked ? 'hybrid-intake+gemma4' : 'hybrid-intake-rules',
      aiInvoked,
      latencyMs: Math.round(performance.now() - started),
    },
  };
}
