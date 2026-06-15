/**
 * Phase 33 ? confidence-driven UX: field skip, missing-field priority, visibility reduction.
 * Run: npm run test:intake-confidence
 */
import { CONFIDENCE_VISIBILITY_CASES } from '@/intake/fixtures/confidence-visibility-cases';
import {
  buildConfidenceAwareShowField,
  countIntakeVisibleFields,
  prioritizeMissingFieldsByConfidence,
  shouldShowLowConfidenceCategoryChips,
  shouldSkipConfidentIntakeField,
} from '@/intake/scoring/confidence-driven-fields';
import {
  buildLocationAmbiguityOptions,
  hasLocationAmbiguity,
} from '@/components/need-intake/IntakeLocationAmbiguityPrompt';
import { buildIntakeConfidenceTelemetryPayload } from '@/lib/need-intake/intake-confidence-metrics';
import {
  allIntakeConfidenceChecksPass,
  CONFIDENCE_VISIBILITY_CASE_COUNT,
} from '@/lib/need-intake/intake-confidence-release';
import { getIntakeConfidenceSkipThreshold } from '@/lib/need-intake/intake-confidence-config';
import type { MissingFieldItem } from '@/intake/types';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function baselineShowField(sectionFieldSet: Set<string>) {
  return (field: string) => sectionFieldSet.has(field);
}

function main(): void {
  assert(allIntakeConfidenceChecksPass(), 'confidence release registry');
  assert(CONFIDENCE_VISIBILITY_CASE_COUNT === CONFIDENCE_VISIBILITY_CASES.length, 'case count');
  assert(getIntakeConfidenceSkipThreshold() === 0.8, 'default skip threshold 0.8');

  let aggregateReduction = 0;
  let aggregateCases = 0;

  for (const c of CONFIDENCE_VISIBILITY_CASES) {
    const sectionFieldSet = new Set(c.fields);
    const isFieldFilled = (field: string) => c.filled.includes(field);
    const baseline = countIntakeVisibleFields(
      c.fields,
      baselineShowField(sectionFieldSet)
    );
    const confident = countIntakeVisibleFields(
      c.fields,
      buildConfidenceAwareShowField({
        sectionFieldSet,
        isFieldFilled,
        confidence: c.confidence,
      })
    );
    const reductionPct =
      baseline.visible > 0
        ? Math.round((1 - confident.visible / baseline.visible) * 100)
        : 0;
    if (c.minReductionPct >= 30) {
      aggregateReduction += reductionPct;
      aggregateCases += 1;
    }
    assert(
      reductionPct >= c.minReductionPct,
      `${c.id}: expected >=${c.minReductionPct}% reduction, got ${reductionPct}% (${confident.visible}/${baseline.visible})`
    );
  }

  const avgHighConfReduction =
    aggregateCases > 0 ? Math.round(aggregateReduction / aggregateCases) : 0;
  assert(avgHighConfReduction >= 30, `avg high-confidence reduction ${avgHighConfReduction}%`);

  const missingBase: MissingFieldItem[] = [
    { field: 'budget', priority: 90, required: true },
    { field: 'neighborhood', priority: 95, required: true },
    { field: 'area', priority: 80, required: false },
  ];
  const sorted = prioritizeMissingFieldsByConfidence(missingBase, {
    neighborhood: 0.4,
    budget: 0.9,
    area: 0.7,
  });
  assert(sorted[0]?.field === 'neighborhood', 'low-confidence neighborhood prioritized first');

  assert(
    shouldSkipConfidentIntakeField('city', true, { city: 0.9 }),
    'skip confident city'
  );
  assert(
    !shouldSkipConfidentIntakeField('city', false, { city: 0.9 }),
    'empty city never skipped'
  );
  assert(
    !shouldShowLowConfidenceCategoryChips({ category: 0.9 }, true),
    'hide category chips when confident'
  );
  assert(
    shouldShowLowConfidenceCategoryChips({ category: 0.5 }, true),
    'show category chips when low confidence'
  );

  assert(
    hasLocationAmbiguity({
      locationAmbiguous: true,
      neighborhoodCandidates: [{ slug: 'a', label: 'A' }],
    }),
    'location ambiguity detected'
  );
  const opts = buildLocationAmbiguityOptions({
    locationAmbiguous: true,
    cityCandidates: [{ cityId: 'tehran', label: 'Tehran' }],
    neighborhoodCandidates: [{ slug: 'vanak', label: 'Vanak' }],
  });
  assert(opts.length === 2, 'unified ambiguity options');

  const telemetry = buildIntakeConfidenceTelemetryPayload(null, 3, 7);
  assert(telemetry.reductionPct === 57, 'telemetry reduction payload');
  assert(telemetry.threshold === 0.8, 'telemetry threshold');

  console.log(
    JSON.stringify({
      ok: true,
      cases: CONFIDENCE_VISIBILITY_CASES.length,
      avgHighConfReductionPct: avgHighConfReduction,
      defaultThreshold: getIntakeConfidenceSkipThreshold(),
    })
  );
}

main();
