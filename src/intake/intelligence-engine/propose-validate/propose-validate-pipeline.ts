/**
 * Propose→Validate pipeline (full replacement for category+location resolution).
 *
 * Need Text → Gemma proposes top-5 category slugs + top-5 neighborhood names
 * (+ city/province) → validated against the real category tree + location catalog
 * → final / candidate chips. Budget/area/rooms/transaction keep the existing
 * rules resolvers (mirrors the hybrid pipeline). One LLM call per analyze.
 *
 * Graceful degradation: if the LLM is unreachable / returns junk, delegate to the
 * proven hybrid pipeline for the whole request (so /post never breaks).
 */
import { unifiedNormalize } from '@/intake/intelligence-engine/normalizer/unified-normalizer';
import { extractEntities } from '@/intake/intelligence-engine/extractors/entity-extractor';
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
import { detectPackRequiredGaps } from '@/intake/intelligence-engine/hybrid/pack-required-gaps';
import { rulesCategoryToFieldBag } from '@/intake/rules/resolver/rules-category-resolver';
import { getNextQuestion } from '@/lib/need-intake/question-engine';
import type { NeedDraft } from '@/contracts/need-intake';
import { inferCriticalFilterSuggestions } from '@/intake/intelligence-engine/suggestions/critical-filter-suggestions';
import { runHybridIntakePipeline } from '@/intake/intelligence-engine/hybrid/hybrid-pipeline';
import { proposeCategoriesAndLocation } from '@/intake/intelligence-engine/propose-validate/propose-llm';
import { validateProposedCategories } from '@/intake/intelligence-engine/propose-validate/validate-categories';
import { validateProposedLocation } from '@/intake/intelligence-engine/propose-validate/validate-location';
import { applyProposeValidateToFieldBag } from '@/intake/intelligence-engine/propose-validate/finalize';
import { semanticCategoryCandidates } from '@/intake/intelligence-engine/semantic/category-embedding-index';

/** Merge only the NON-location/NON-category engine entities (we own those). */
function mergeOtherEntities(
  bag: ReturnType<typeof createEmptyFieldBag>,
  analysis: ReturnType<typeof extractEntities>,
): void {
  const e = analysis.entities;
  if (e.area != null) setField(bag, 'area', { value: e.area, confidence: analysis.confidence.area ?? 0.8, source: 'rule' });
  if (e.rooms != null) setField(bag, 'rooms', { value: e.rooms, confidence: analysis.confidence.rooms ?? 0.8, source: 'rule' });
  if (e.budgetMax != null) setField(bag, 'budgetMax', { value: e.budgetMax, confidence: analysis.confidence.budget ?? 0.75, source: 'rule' });
  if (e.transactionType) {
    setField(bag, 'transactionType', { value: e.transactionType, confidence: analysis.confidence.transactionType ?? 0.85, source: 'rule' });
  }
}

export async function runProposeValidatePipeline(
  input: IntakeIntelligenceInput,
  opts?: { existingDraft?: NeedDraft | null },
): Promise<IntakeIntelligenceResult> {
  const started = performance.now();
  const text = input.text.trim();

  // ── Stage 1: LLM proposal (the only LLM call) ──
  const proposeOutcome = await proposeCategoriesAndLocation(text);
  if (!proposeOutcome.proposal) {
    // Graceful degradation → proven deterministic/hybrid engine.
    return runHybridIntakePipeline(input, opts);
  }
  const proposal = proposeOutcome.proposal;

  const steps: IntakeIntelligenceStepTrace[] = [];
  let t = performance.now();
  const norm = unifiedNormalize(text);
  steps.push(createStepTrace('normalize', t, 'unified-normalizer'));

  const categoryLocked = Boolean(input.formHints?.categoryLockedByUser);

  // ── Stage 2: validate proposals against real data ──
  // Fuse the LLM proposals with bge-m3 semantic candidates (recall for OOV items
  // the small model mis-ranks) + run location validation, in parallel.
  t = performance.now();
  const [semCands, validatedLoc] = await Promise.all([
    semanticCategoryCandidates(text, 5).catch(() => []),
    validateProposedLocation(text, proposal, {
      citySlug: input.citySlug,
      cityName: input.cityName ?? input.formHints?.city ?? null,
    }),
  ]);
  const validatedCat = validateProposedCategories(
    text,
    proposal.categories,
    semCands.map((c) => ({ slug: c.slug, score: c.score })),
  );
  steps.push(
    createStepTrace(
      'propose-validate',
      t,
      proposeOutcome.provider ?? undefined,
      `cat:${validatedCat.candidates.length} city:${validatedLoc.citySource} hood:${validatedLoc.neighborhoodCandidates.length} llm:${proposeOutcome.latencyMs}ms`,
    ),
  );

  // ── Other fields via the existing rules resolvers (unchanged) ──
  t = performance.now();
  const budgetPartial = resolveBudget(text);
  const propertyPartial = resolveProperty(text);
  const engineAnalysis = extractEntities(norm.lookupKey, text, { preferredCityName: input.cityName });
  steps.push(createStepTrace('resolvers', t, 'budget+property+entities'));

  let bag = createEmptyFieldBag();
  bag = mergeFieldBags(bag, budgetPartial, propertyPartial);
  mergeOtherEntities(bag, engineAnalysis);

  // Locked category: keep the user's choice via rules; else apply validated proposal.
  if (categoryLocked) {
    bag = mergeFieldBags(bag, rulesCategoryToFieldBag(text, input));
  }

  const finalization = applyProposeValidateToFieldBag(
    bag,
    categoryLocked ? { top: null, candidates: [] } : validatedCat,
    validatedLoc,
  );

  t = performance.now();
  const dealPartial = resolveDealTypeFields(text, bag);
  bag = mergeFieldBags(bag, dealPartial);
  scoreFieldConfidence(bag);
  steps.push(createStepTrace('deal-type', t, 'resolveTransactionType'));

  const categorySlug = String(bag.subcategorySlug?.value ?? bag.categorySlug?.value ?? '');

  const parsedLocationPatch = {
    ...(validatedLoc.cityName ? { city: validatedLoc.cityName } : {}),
    ...(validatedLoc.province ? { province: validatedLoc.province } : {}),
    ...(validatedLoc.neighborhoodSlug ? { neighborhoodSlug: validatedLoc.neighborhoodSlug } : {}),
    ...(finalization.categoryCandidates && !categorySlug
      ? { categoryCandidates: finalization.categoryCandidates }
      : {}),
    ...(finalization.cityCandidates ? { cityCandidates: finalization.cityCandidates } : {}),
    ...(finalization.neighborhoodCandidates
      ? { neighborhoodCandidates: finalization.neighborhoodCandidates }
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

  const packGaps = detectPackRequiredGaps(bag, categorySlug);
  const gaps = [...detectGaps(bag, built.parsedIntent, built.missingFields, text), ...packGaps];
  if (finalization.categoryCandidates && finalization.categoryCandidates.length >= 2 && !categorySlug) {
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
    parsedLocationPatch,
  }).draft;
  steps.push(createStepTrace('need-builder', t, 'need-builder', 'propose-validate'));

  const nextQ = getNextQuestion(
    draft.parsedIntent.intentType,
    draft.parsedIntent,
    draft.answers as Record<string, unknown>,
  );
  const recommendedQuestions = nextQ.done
    ? (gaps.map((g) => g.messageFa).filter(Boolean) as string[])
    : [nextQ.question ?? nextQ.disambiguation?.question ?? nextQ.field?.label ?? ''].filter(Boolean);
  if (finalization.categoryCandidates && finalization.categoryCandidates.length >= 2 && !categorySlug) {
    recommendedQuestions.unshift('کدام دسته‌بندی به نیاز شما نزدیک‌تر است؟');
  }

  const trace = buildIntelligenceTrace({
    inputText: text,
    normalizedText: norm.lookupKey,
    steps,
    fieldMeta: fieldBagToRecord(bag),
    aiInvoked: true,
    aiProvider: proposeOutcome.provider,
    aiLatencyMs: proposeOutcome.latencyMs,
    intentGist: null,
    intentGistProvider: null,
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
    categoryCandidates:
      finalization.categoryCandidates && finalization.categoryCandidates.length >= 2
        ? finalization.categoryCandidates
        : undefined,
    suggestedFilters,
    meta: {
      engine: 'propose-validate+gemma',
      aiInvoked: true,
      latencyMs: Math.round(performance.now() - started),
    },
  };
}
