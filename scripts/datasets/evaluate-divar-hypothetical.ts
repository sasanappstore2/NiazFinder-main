#!/usr/bin/env bun
/** Aggregate-only evaluation of proposal-only Divar/Si artifacts. */
import { createReadStream } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { extractPostNaturalFields } from '@/lib/need-intake/si/post-natural-extractor';
import { resolvePostNeighborhoodInCity } from '@/lib/need-intake/si/post-neighborhood-resolver';
import { resolveCatalogCityMention } from '@/lib/neighborhoods/server';
import { divarAppCityCatalog, divarAppCityPersianName } from './divar-hypothetical-need';

type Json = Record<string, any>;
type FieldMetric = {
  notAsked: number;
  unscoredNoSourceLabel: number;
  compared: number;
  exact: number;
  expectedKnown: number;
  expectedUnknown: number;
  correctUnknown: number;
  falseProposalWhenUnknown: number;
  falseUnknownWhenKnown: number;
};

const SI_FIELDS = [
  'category_candidate', 'property_kind', 'transaction_type', 'deed_type',
  'usage', 'parking', 'elevator', 'storage',
] as const;
const DETERMINISTIC_FIELDS = [
  'category_candidate', 'property_kind', 'transaction_type', 'area', 'rooms',
  'deed_type', 'parking', 'elevator', 'storage',
] as const;
const model = 'convaiinnovations/si-multilingual';

function normalize(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[يى]/gu, 'ی')
    .replace(/ك/gu, 'ک')
    .replace(/[ۀة]/gu, 'ه')
    .replace(/[\u064B-\u065F\u0670\u0640\u200c\u200d]/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .toLowerCase();
}

function loadCatalog(citySlug: string): Json | null {
  const catalog = divarAppCityCatalog(citySlug);
  return catalog && Array.isArray(catalog.neighborhoods) ? catalog : null;
}

function newMetric(): FieldMetric {
  return {
    notAsked: 0,
    unscoredNoSourceLabel: 0,
    compared: 0,
    exact: 0,
    expectedKnown: 0,
    expectedUnknown: 0,
    correctUnknown: 0,
    falseProposalWhenUnknown: 0,
    falseUnknownWhenKnown: 0,
  };
}

const SOURCE_OFFER_LABEL_FIELDS: Partial<Record<(typeof SI_FIELDS)[number], string>> = {
  category_candidate: 'offer_category',
  property_kind: 'offer_property_kind',
  transaction_type: 'offer_transaction_type',
};

function siExpectedValue(
  key: (typeof SI_FIELDS)[number],
  row: Json,
  outputSchemaVersion: number,
  needTargets: Json,
): { available: boolean; value: string } {
  if (outputSchemaVersion === 4 || outputSchemaVersion === 5) {
    const sourceField = SOURCE_OFFER_LABEL_FIELDS[key];
    const sourceTarget = sourceField ? row.sourceOfferFacts?.[sourceField] : undefined;
    if (!sourceTarget || !Object.hasOwn(sourceTarget, 'value')) {
      return { available: false, value: 'unknown' };
    }
    return { available: true, value: String(sourceTarget.value ?? 'unknown') };
  }
  return { available: true, value: String(needTargets[key]?.value ?? 'unknown') };
}

function deterministicPrediction(key: (typeof DETERMINISTIC_FIELDS)[number], deterministic: Json): unknown {
  switch (key) {
    case 'category_candidate': {
      const candidates = Array.isArray(deterministic.categoryCandidates)
        ? deterministic.categoryCandidates.map((candidate: Json) => String(candidate?.slug ?? '')).filter(Boolean)
        : [];
      return candidates.length === 1 ? candidates[0] : 'unknown';
    }
    case 'property_kind':
      return deterministic.answers?.propertyKind ?? 'unknown';
    case 'transaction_type':
      return deterministic.answers?.dealType ?? 'unknown';
    case 'area':
    case 'rooms':
      return deterministic.entities?.[key] ?? 'unknown';
    case 'deed_type':
      return deterministic.entities?.deedType ?? 'unknown';
    case 'parking':
    case 'elevator':
    case 'storage':
      return deterministic.fields?.find((field: Json) => field?.key === key)?.value ?? 'unknown';
  }
}

function sameValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (typeof left === 'number' && typeof right === 'number') return left === right;
  return normalize(left) === normalize(right);
}

function percent(numerator: number, denominator: number): number | null {
  return denominator ? Math.round((numerator / denominator) * 10_000) / 100 : null;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const path = args[0];
  const maxRowsIndex = args.indexOf('--max-rows');
  const maxRows = maxRowsIndex >= 0 ? Number(args[maxRowsIndex + 1]) : null;
  if (
    !path ||
    args.some((arg, index) => arg.startsWith('--') && arg !== '--max-rows') ||
    (maxRowsIndex < 0 && args.length !== 1) ||
    (maxRowsIndex >= 0 && (!Number.isSafeInteger(maxRows) || (maxRows ?? 0) < 1)) ||
    (maxRowsIndex >= 0 && maxRowsIndex !== args.length - 2)
  ) {
    throw new Error('Usage: bun scripts/datasets/evaluate-divar-hypothetical.ts <proposal.jsonl> [--max-rows <positive integer>]');
  }
  const metrics = Object.fromEntries(SI_FIELDS.map((key) => [key, newMetric()])) as Record<string, FieldMetric>;
  const deterministicMetrics = Object.fromEntries(
    DETERMINISTIC_FIELDS.map((key) => [key, newMetric()]),
  ) as Record<(typeof DETERMINISTIC_FIELDS)[number], FieldMetric>;
  const fieldConfusions = Object.fromEntries(
    SI_FIELDS.map((key) => [key, new Map<string, number>()]),
  ) as Record<(typeof SI_FIELDS)[number], Map<string, number>>;
  const deterministicConfusions = Object.fromEntries(
    DETERMINISTIC_FIELDS.map((key) => [key, new Map<string, number>()]),
  ) as Record<(typeof DETERMINISTIC_FIELDS)[number], Map<string, number>>;
  const city = { compared: 0, exact: 0, missingCatalogOrName: 0 };
  const catalogCity = {
    compared: 0,
    exact: 0,
    ambiguous: 0,
    noMatch: 0,
    missingCatalog: 0,
  };
  const neighborhood = {
    exactTargets: 0,
    resolvedExact: 0,
    targetInCandidates: 0,
    unresolved: 0,
    missingCatalog: 0,
    resolverEvaluations: 0,
    cacheHits: 0,
  };
  const neighborhoodResolutionCache = new Map<string, {
    missingCatalog?: boolean;
    hitId: string | null;
    candidateIds: string[];
  }>();
  const pairs = new Set<string>();
  const categories = new Set<string>();
  const cities = new Set<string>();
  const categoryClassCounts = new Map<string, { expected: number; predicted: number; exact: number }>();
  const categoryConfusions = new Map<string, number>();
  const runtimeCategory = newMetric();
  const runtimeCategoryConfusions = new Map<string, number>();
  const runtimeCategoryFailures: Json[] = [];
  const cityFailures: Json[] = [];
  const catalogCityFailures: Json[] = [];
  const neighborhoodFailures: Json[] = [];
  let rows = 0;
  let siInputStateKind: string | undefined;

  const lines = createInterface({ input: createReadStream(resolve(path), { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    if (maxRows !== null && rows >= maxRows) break;
    const row = JSON.parse(line) as Json;
    const outputSchemaVersion = row.taskType === 'divar-counterfactual-post-need-si-proposal/v4'
      ? 4
      : row.taskType === 'divar-counterfactual-post-need-si-proposal/v5'
        ? 5
      : row.taskType === 'divar-counterfactual-post-need-si-proposal/v3'
        ? 3
        : row.taskType === 'divar-counterfactual-post-need-si-proposal/v2'
          ? 2
          : row.taskType === 'divar-counterfactual-post-need-si-proposal/v1' ? 1 : null;
    const expectedGenerationVersion = row.hypotheticalNeed?.generation?.version;
    if (
      outputSchemaVersion === null || row.schemaVersion !== outputSchemaVersion ||
      ![1, 2, 3, 4, 5].includes(expectedGenerationVersion) ||
      row.si?.model !== model || row.synthetic !== true || row.realNeedGroundTruth !== false ||
      row.trainingEligible !== false || row.hypotheticalNeed?.realNeedGroundTruth !== false ||
      row.hypotheticalNeed?.trainingEligible !== false ||
      row.hypotheticalNeed?.generation?.method !== 'deterministic-counterfactual-template' ||
      row.hypotheticalNeed?.generation?.version !== expectedGenerationVersion ||
      row.hypotheticalNeed?.taskType !== `divar-counterfactual-post-need-proposal/v${expectedGenerationVersion}` ||
      ((outputSchemaVersion === 4 || outputSchemaVersion === 5) && (
        row.si?.inputStateKind !== 'original_divar_offer_text' ||
        !/^[a-f0-9]{64}$/u.test(String(row.si?.inputStateSha256 ?? ''))
      ))
    ) throw new Error('Input contains a row outside the approved proposal-only Si contract.');

    const currentInputKind = String(row.si?.inputStateKind ?? 'hypothetical_need_text');
    if (siInputStateKind && siInputStateKind !== currentInputKind) {
      throw new Error('Input mixes Si source-text semantics across rows.');
    }
    siInputStateKind = currentInputKind;

    rows += 1;
    const target = row.hypotheticalNeed.targetDecisions as Json;
    const answers = row.si.answers as Json;
    const citySlug = String(row.hypotheticalNeed.sourceOfferLocation?.appCitySlug ?? '');
    // Re-run today's extractor so a regression/fix is measured against the
    // same generated utterances instead of trusting stale parse snapshots.
    const deterministic = extractPostNaturalFields(String(row.state ?? '')) as unknown as Json;
    for (const key of DETERMINISTIC_FIELDS) {
      const expected = target[key]?.value ?? 'unknown';
      const predicted = deterministicPrediction(key, deterministic);
      const metric = deterministicMetrics[key];
      metric.compared += 1;
      if (sameValue(predicted, expected)) metric.exact += 1;
      if (expected === 'unknown') {
        metric.expectedUnknown += 1;
        if (sameValue(predicted, 'unknown')) metric.correctUnknown += 1;
        else metric.falseProposalWhenUnknown += 1;
      } else {
        metric.expectedKnown += 1;
        if (sameValue(predicted, 'unknown')) metric.falseUnknownWhenKnown += 1;
      }
      if (!sameValue(predicted, expected)) {
        const confusionKey = `${String(expected)}\u0000${String(predicted ?? 'unknown')}`;
        const confusions = deterministicConfusions[key];
        confusions.set(confusionKey, (confusions.get(confusionKey) ?? 0) + 1);
      }
    }
    const needCategory = String(target.category_candidate?.value ?? '');
    const category = siExpectedValue('category_candidate', row, outputSchemaVersion, target).value;
    const categoryAnswer = String(
      answers.category_candidate?.choice ?? answers.category_candidate?.noul ?? answers.category_candidate?.value ?? 'unknown',
    );
    const deterministicCandidates = Array.isArray(deterministic.categoryCandidates)
      ? deterministic.categoryCandidates
          .map((candidate: Json) => String(candidate?.slug ?? ''))
          .filter((slug: string) => slug && slug !== 'unknown')
      : [];
    const runtimeCategoryAnswer = deterministicCandidates.length === 1
      ? deterministicCandidates[0]!
      : deterministicCandidates.length > 1 && deterministicCandidates.includes(categoryAnswer)
        ? categoryAnswer
        : 'unknown';
    runtimeCategory.compared += 1;
    if (runtimeCategoryAnswer === needCategory) runtimeCategory.exact += 1;
    if (needCategory === 'unknown') {
      runtimeCategory.expectedUnknown += 1;
      if (runtimeCategoryAnswer === 'unknown') runtimeCategory.correctUnknown += 1;
      else runtimeCategory.falseProposalWhenUnknown += 1;
    } else {
      runtimeCategory.expectedKnown += 1;
      if (runtimeCategoryAnswer === 'unknown') runtimeCategory.falseUnknownWhenKnown += 1;
    }
    if (needCategory && runtimeCategoryAnswer !== needCategory) {
      const confusionKey = `${needCategory}\u0000${runtimeCategoryAnswer}`;
      runtimeCategoryConfusions.set(confusionKey, (runtimeCategoryConfusions.get(confusionKey) ?? 0) + 1);
      if (runtimeCategoryFailures.length < 12) runtimeCategoryFailures.push({
        expected: needCategory,
        predicted: runtimeCategoryAnswer,
        citySlug,
        neighborhood: row.hypotheticalNeed.sourceOfferLocation?.appNeighborhoodName ?? null,
        text: row.state,
      });
    }
    if (category) {
      categories.add(category);
      const expectedCounts = categoryClassCounts.get(category) ?? { expected: 0, predicted: 0, exact: 0 };
      expectedCounts.expected += 1;
      if (categoryAnswer === category) expectedCounts.exact += 1;
      categoryClassCounts.set(category, expectedCounts);
    }
    const predictedCounts = categoryClassCounts.get(categoryAnswer) ?? { expected: 0, predicted: 0, exact: 0 };
    predictedCounts.predicted += 1;
    categoryClassCounts.set(categoryAnswer, predictedCounts);
    if (category && categoryAnswer !== category) {
      const confusionKey = `${category}\u0000${categoryAnswer}`;
      categoryConfusions.set(confusionKey, (categoryConfusions.get(confusionKey) ?? 0) + 1);
    }
    if (citySlug) cities.add(citySlug);

    for (const key of SI_FIELDS) {
      const expectedTarget = siExpectedValue(key, row, outputSchemaVersion, target);
      if (!expectedTarget.available) {
        metrics[key]!.unscoredNoSourceLabel += 1;
        continue;
      }
      const expected = expectedTarget.value;
      const answer = answers[key];
      const metric = metrics[key]!;
      if (!answer) {
        metric.notAsked += 1;
        continue;
      }
      const predicted = String(answer?.choice ?? answer?.noul ?? answer?.value ?? 'unknown');
      metric.compared += 1;
      if (predicted === expected) metric.exact += 1;
      if (predicted !== expected) {
        const confusionKey = `${expected}\u0000${predicted}`;
        const confusions = fieldConfusions[key];
        confusions.set(confusionKey, (confusions.get(confusionKey) ?? 0) + 1);
      }
      if (expected === 'unknown') {
        metric.expectedUnknown += 1;
        if (predicted === 'unknown') metric.correctUnknown += 1;
        else metric.falseProposalWhenUnknown += 1;
      } else {
        metric.expectedKnown += 1;
        if (predicted === 'unknown') metric.falseUnknownWhenKnown += 1;
      }
    }

    const cityName = divarAppCityPersianName(citySlug);
    if (citySlug && cityName) {
      city.compared += 1;
      if (normalize(deterministic.cityCandidate) === normalize(cityName)) city.exact += 1;
      else if (cityFailures.length < 12) cityFailures.push({
        citySlug,
        expectedCatalogName: cityName,
        extractedCity: deterministic.cityCandidate ?? null,
      });
    } else {
      city.missingCatalogOrName += 1;
    }

    if (citySlug && cityName) {
      const expectedCatalog = loadCatalog(citySlug);
      const expectedCityId = String(expectedCatalog?.cityId ?? '');
      if (!expectedCatalog || !expectedCityId) {
        catalogCity.missingCatalog += 1;
      } else {
        catalogCity.compared += 1;
        const resolved = await resolveCatalogCityMention(String(row.state ?? ''), expectedCityId);
        if (resolved && !('ambiguous' in resolved) && resolved.cityId === expectedCityId) {
          catalogCity.exact += 1;
        } else if (resolved && 'ambiguous' in resolved) {
          catalogCity.ambiguous += 1;
          if (catalogCityFailures.length < 12) catalogCityFailures.push({
            citySlug,
            expectedCatalogId: expectedCityId,
            resolution: 'ambiguous',
            candidateIds: resolved.cityIds,
          });
        } else {
          catalogCity.noMatch += 1;
          if (catalogCityFailures.length < 12) catalogCityFailures.push({
            citySlug,
            expectedCatalogId: expectedCityId,
            resolvedCityId: resolved && !('ambiguous' in resolved) ? resolved.cityId : null,
            resolution: resolved ? 'wrong_unique_city' : 'no_city_mention',
          });
        }
      }
    } else {
      catalogCity.missingCatalog += 1;
    }

    const location = row.hypotheticalNeed.sourceOfferLocation;
    if (location?.neighborhoodMatch !== 'exact_official_crosswalk' || !location?.appNeighborhoodId) continue;
    neighborhood.exactTargets += 1;
    pairs.add(`${citySlug}\u0000${location.appNeighborhoodId}`);
    const phrase = String(deterministic.neighborhoodPhrase ?? '');
    const cacheKey = [
      citySlug,
      location.appNeighborhoodId,
      normalize(location.appNeighborhoodName),
      normalize(phrase),
    ].join('\u0000');
    let lookup = neighborhoodResolutionCache.get(cacheKey);
    if (lookup) {
      neighborhood.cacheHits += 1;
    } else {
      const catalog = loadCatalog(citySlug);
      if (!catalog) {
        lookup = { missingCatalog: true, hitId: null, candidateIds: [] };
      } else {
        neighborhood.resolverEvaluations += 1;
        const result = resolvePostNeighborhoodInCity(
          catalog.neighborhoods,
          phrase,
          cityName ?? String(catalog.cityName ?? ''),
          String(row.state ?? '')
        );
        lookup = {
          hitId: result.hit?.id ?? null,
          candidateIds: result.candidates.map((candidate) => candidate.id),
        };
      }
      neighborhoodResolutionCache.set(cacheKey, lookup);
    }
    if (lookup.missingCatalog) {
      neighborhood.missingCatalog += 1;
      continue;
    }
    const exactHit = lookup.hitId === location.appNeighborhoodId;
    const targetCandidate = lookup.candidateIds.includes(location.appNeighborhoodId);
    if (exactHit) neighborhood.resolvedExact += 1;
    else if (targetCandidate) {
      neighborhood.targetInCandidates += 1;
      if (neighborhoodFailures.length < 12) neighborhoodFailures.push({
        citySlug,
        targetId: location.appNeighborhoodId,
        targetName: location.appNeighborhoodName,
        resolution: 'ambiguous_candidates_include_target',
        candidateIds: lookup.candidateIds,
      });
    } else neighborhood.unresolved += 1;
    if (!exactHit && !targetCandidate && neighborhoodFailures.length < 12) {
      neighborhoodFailures.push({
        citySlug,
        targetId: location.appNeighborhoodId,
        targetName: location.appNeighborhoodName,
        extractedPhrase: phrase || null,
        resolution: lookup.hitId ? 'wrong_unique_hit' : lookup.candidateIds.length ? 'wrong_candidates' : 'unresolved',
        resolvedHitId: lookup.hitId,
        candidateIds: lookup.candidateIds,
      });
    }
  }

  const report = {
    status: 'complete',
    evaluationScope: maxRows === null
      ? { type: 'entire-file' }
      : { type: 'committed-prefix', maxRows },
    model,
    rows,
    labelStatus: siInputStateKind === 'original_divar_offer_text'
      ? 'category, property-kind, and deal labels are compared with Divar structured offer-derived fields; other Si fields lack persisted source labels; not independent seeker-intent or real-user accuracy'
      : 'synthetic counterfactual agreement only; not independent real-user accuracy',
    trainingEligibleRows: 0,
    categoryCount: categories.size,
    cityCount: cities.size,
    [siInputStateKind === 'original_divar_offer_text'
      ? 'siCategorySourceOfferAgreement'
      : 'siCategoryCounterfactualAgreement']: {
      comparisonBasis: siInputStateKind === 'original_divar_offer_text'
        ? 'Divar structured offer category; never the generated hypothetical-need target'
        : 'synthetic hypothetical-need target',
      decisionCoverage: {
        totalRows: rows,
        answered: metrics.category_candidate!.compared,
        notAsked: metrics.category_candidate!.notAsked,
        exact: metrics.category_candidate!.exact,
        coveragePct: percent(metrics.category_candidate!.compared, rows),
        accuracyAmongAnsweredPct: percent(metrics.category_candidate!.exact, metrics.category_candidate!.compared),
        exactAcrossAllRowsPct: percent(metrics.category_candidate!.exact, rows),
      },
      perExpectedCategory: Object.fromEntries([...categories].sort().map((slug) => {
        const counts = categoryClassCounts.get(slug) ?? { expected: 0, predicted: 0, exact: 0 };
        return [slug, {
          expected: counts.expected,
          predicted: counts.predicted,
          exact: counts.exact,
          recallPct: percent(counts.exact, counts.expected),
        }];
      })),
      topConfusions: [...categoryConfusions.entries()]
        .map(([key, count]) => {
          const [expected, predicted] = key.split('\u0000');
          return { expected, predicted, count };
        })
        .sort((a, b) => b.count - a.count || a.expected.localeCompare(b.expected) || a.predicted.localeCompare(b.predicted))
        .slice(0, 20),
    },
    runtimeCategoryCounterfactualAgreement: {
      ...runtimeCategory,
      exactMatchPct: percent(runtimeCategory.exact, runtimeCategory.compared),
      unknownRecallPct: percent(runtimeCategory.correctUnknown, runtimeCategory.expectedUnknown),
      falseProposalRateAmongExpectedUnknownPct: percent(
        runtimeCategory.falseProposalWhenUnknown,
        runtimeCategory.expectedUnknown,
      ),
      knownTargetPredictionRatePct: percent(
        runtimeCategory.expectedKnown - runtimeCategory.falseUnknownWhenKnown,
        runtimeCategory.expectedKnown,
      ),
      topConfusions: [...runtimeCategoryConfusions.entries()]
        .map(([key, count]) => {
          const [expected, predicted] = key.split('\u0000');
          return { expected, predicted, count };
        })
        .sort((a, b) => b.count - a.count || a.expected.localeCompare(b.expected) || a.predicted.localeCompare(b.predicted))
        .slice(0, 20),
      firstFailures: runtimeCategoryFailures,
      caveat: 'Combines single deterministic catalog candidates with Si only when the rules leave multiple candidates; still synthetic offer-derived agreement, not real-user accuracy.',
    },
    deterministicExtractionCounterfactualAgreement: {
      fields: Object.fromEntries(Object.entries(deterministicMetrics).map(([key, metric]) => [key, {
        ...metric,
        topConfusions: [...deterministicConfusions[key as (typeof DETERMINISTIC_FIELDS)[number]]!.entries()]
          .map(([confusionKey, count]) => {
            const [expected, predicted] = confusionKey.split('\u0000');
            return { expected, predicted, count };
          })
          .sort((a, b) => b.count - a.count || String(a.expected).localeCompare(String(b.expected)) || String(a.predicted).localeCompare(String(b.predicted)))
          .slice(0, 12),
        exactMatchPct: percent(metric.exact, metric.compared),
        unknownRecallPct: percent(metric.correctUnknown, metric.expectedUnknown),
        falseProposalRateAmongExpectedUnknownPct: percent(metric.falseProposalWhenUnknown, metric.expectedUnknown),
        knownTargetPredictionRatePct: percent(
          metric.expectedKnown - metric.falseUnknownWhenKnown,
          metric.expectedKnown,
        ),
      }])) ,
      caveat: 'Compares deterministic extraction against attributes embedded from the seller offer into the synthetic sentence; this is parser consistency, not user-intent accuracy.',
    },
    [siInputStateKind === 'original_divar_offer_text' ? 'siSourceOfferFieldAgreement' : 'si']: {
      comparisonBasis: siInputStateKind === 'original_divar_offer_text'
        ? 'Divar source offer labels where present; generated need targets are not used to score offer-text predictions'
        : 'synthetic hypothetical-need targets',
      fields: Object.fromEntries(Object.entries(metrics).map(([key, metric]) => [key, {
        ...metric,
        topConfusions: [...fieldConfusions[key as (typeof SI_FIELDS)[number]]!.entries()]
          .map(([confusionKey, count]) => {
            const [expected, predicted] = confusionKey.split('\u0000');
            return { expected, predicted, count };
          })
          .sort((a, b) => b.count - a.count || String(a.expected).localeCompare(String(b.expected)) || String(a.predicted).localeCompare(String(b.predicted)))
          .slice(0, 12),
        exactMatchPct: percent(metric.exact, metric.compared),
        unknownRecallPct: percent(metric.correctUnknown, metric.expectedUnknown),
        falseProposalRateAmongExpectedUnknownPct: percent(metric.falseProposalWhenUnknown, metric.expectedUnknown),
        knownTargetPredictionRatePct: percent(
          metric.expectedKnown - metric.falseUnknownWhenKnown,
          metric.expectedKnown,
        ),
      }])) ,
      caveat: siInputStateKind === 'original_divar_offer_text'
        ? 'Only category, property kind, and deal type have persisted structured targets. Deed, usage, and amenities are explicitly unscored until source labels are preserved and reviewed.'
        : 'Compares predictions with generated need targets, not independent real-user labels.',
    },
    deterministicCity: {
      ...city,
      exactMatchPct: percent(city.exact, city.compared),
      firstMismatches: cityFailures,
      caveat: 'Generated template contains the catalog city label; this is a resolver consistency check, not independent user-text accuracy.',
    },
    fullCatalogCityResolver: {
      ...catalogCity,
      exactMatchPct: percent(catalogCity.exact, catalogCity.compared),
      firstMismatches: catalogCityFailures,
      caveat: 'Runs the same full city-catalog mention resolver used by /post against a generated label, so this is only catalog wiring consistency—not city-recognition accuracy on real user text.',
    },
    deterministicNeighborhood: {
      ...neighborhood,
      uniqueExactCityNeighborhoodPairs: pairs.size,
      exactTopOnePct: percent(neighborhood.resolvedExact, neighborhood.exactTargets),
      targetCandidateRecallPct: percent(neighborhood.resolvedExact + neighborhood.targetInCandidates, neighborhood.exactTargets),
      uniqueResolutions: neighborhoodResolutionCache.size,
      firstMismatches: neighborhoodFailures,
      caveat: 'The neighborhood name was inserted from the exact crosswalk; this checks city-scoped resolver consistency only.',
    },
  };
  console.log(JSON.stringify(report, null, 2));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Evaluation failed.');
  process.exitCode = 1;
});
