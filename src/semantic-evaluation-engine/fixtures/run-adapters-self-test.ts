/**
 * Step 3 self-test for the legacy and cognitive-engine adapters
 * (`PLAN/semantic-comparator-architecture.md` §5/§10, `PLAN/phase7-drift-investigation-report.md`).
 *
 * Every output is also validated against Step 1's `semanticSnapshotSchema` — this is an
 * integration check, not just a unit check: an adapter producing a structurally invalid
 * SemanticSnapshot is exactly the kind of silent contract violation Step 1's Zod schemas exist to
 * catch loudly.
 *
 * Run via: npm run test:see-adapters
 */
import type { NeedDraft } from '@/contracts/need-intake';
import type { CognitivePipelineResult } from '@/cognitive-engine/pipeline/run-cognitive-pipeline';
import type { Decision } from '@/cognitive-engine/types/decision';
import { legacyDraftToSemanticSnapshot } from '@/semantic-evaluation-engine/adapters/legacy-to-snapshot';
import { cognitiveResultToSemanticSnapshot } from '@/semantic-evaluation-engine/adapters/cognitive-to-snapshot';
import { semanticSnapshotSchema } from '@/semantic-evaluation-engine/types';

function fail(id: string, msg: string): string {
  return `${id}: ${msg}`;
}

function baseDraft(overrides: Partial<NeedDraft>): NeedDraft {
  return {
    templateId: 'test-template',
    templateVersion: 1,
    schemaVersion: 1,
    vertical: 'general',
    category: '',
    entities: {},
    completionScore: 0,
    matchabilityScore: 0,
    completionState: 'NEEDS_INFO',
    sections: [],
    missingFields: [],
    sourceText: '',
    updatedAt: '2026-07-08T00:00:00.000Z',
    parsedIntent: {
      intentType: 'BUY' as never,
      categorySlug: '',
      confidence: 0,
      entities: {},
      rawText: '',
    },
    answers: {},
    ...overrides,
  };
}

const opts = { snapshotId: 'snap-test', producedAt: '2026-07-08T00:00:00.000Z' };

function assertValidSnapshot(id: string, snapshot: unknown): string[] {
  const result = semanticSnapshotSchema.safeParse(snapshot);
  return result.success ? [] : [fail(id, `output failed semanticSnapshotSchema: ${result.error.message}`)];
}

function testLegacyCategoryResolved(): string[] {
  const errors: string[] = [];
  const draft = baseDraft({
    parsedIntent: {
      intentType: 'BUY' as never,
      categorySlug: 'apartment-rent',
      confidence: 0.9,
      entities: {},
      rawText: 'test',
    },
    fieldMeta: { categorySlug: { value: 'apartment-rent', confidence: 0.85, source: 'rule', evidence: 'آپارتمان اجاره' } },
  });
  const snap = legacyDraftToSemanticSnapshot(draft, opts);
  errors.push(...assertValidSnapshot('legacy-category-resolved', snap));
  const field = snap.fields.find((f) => f.fieldId === 'category');
  if (field?.state !== 'resolved') errors.push(fail('legacy-category-resolved', `state=${field?.state}`));
  if (field?.confidence !== 0.85) errors.push(fail('legacy-category-resolved', `confidence=${field?.confidence}, expected fieldMeta value not parsedIntent.confidence`));
  if (field?.value?.shape !== 'scalar-ontology' || (field.value as { ref: { id: string } }).ref.id !== 'apartment-rent') {
    errors.push(fail('legacy-category-resolved', `value=${JSON.stringify(field?.value)}`));
  }
  return errors;
}

function testLegacyCategoryConfidenceHonestlyNull(): string[] {
  const errors: string[] = [];
  // No fieldMeta entry at all -> confidence must be null, NOT a fallback to parsedIntent.confidence.
  const draft = baseDraft({
    parsedIntent: { intentType: 'BUY' as never, categorySlug: 'laptop', confidence: 0.77, entities: {}, rawText: 'test' },
  });
  const snap = legacyDraftToSemanticSnapshot(draft, opts);
  const field = snap.fields.find((f) => f.fieldId === 'category');
  if (field?.confidence !== null) {
    errors.push(fail('legacy-category-confidence-honest', `expected null (no field-specific signal), got ${field?.confidence}`));
  }
  return errors;
}

function testLegacyCategoryAmbiguous(): string[] {
  const errors: string[] = [];
  const draft = baseDraft({
    parsedIntent: {
      intentType: 'BUY' as never,
      categorySlug: '',
      confidence: 0,
      entities: {},
      rawText: 'test',
      categoryCandidates: [
        { slug: 'laptop', label: 'لپ‌تاپ', confidence: 0.6 },
        { slug: 'desktop-computer', label: 'رومیزی', confidence: 0.55 },
      ],
    },
  });
  const snap = legacyDraftToSemanticSnapshot(draft, opts);
  errors.push(...assertValidSnapshot('legacy-category-ambiguous', snap));
  const field = snap.fields.find((f) => f.fieldId === 'category');
  if (field?.state !== 'ambiguous') errors.push(fail('legacy-category-ambiguous', `state=${field?.state}`));
  if (field?.candidates?.length !== 2) errors.push(fail('legacy-category-ambiguous', `candidates=${field?.candidates?.length}`));
  return errors;
}

function testLegacyCategoryMissing(): string[] {
  const errors: string[] = [];
  const draft = baseDraft({});
  const snap = legacyDraftToSemanticSnapshot(draft, opts);
  const field = snap.fields.find((f) => f.fieldId === 'category');
  if (field?.state !== 'missing') errors.push(fail('legacy-category-missing', `state=${field?.state}`));
  if (field?.value !== null) errors.push(fail('legacy-category-missing', 'value must be null'));
  return errors;
}

function testLegacyLocationCityOnlyInStructuredField(): string[] {
  // The EXACT drift-investigation Case A: city set via structured field, absent from sourceText.
  const errors: string[] = [];
  const draft = baseDraft({
    sourceText: 'لپ تاپ گیمینگ نو میخوام بخرم\n\nتوضیحات:\nبودجه تا هشتاد میلیون تومان',
    parsedIntent: { intentType: 'BUY' as never, categorySlug: 'laptop', confidence: 0.9, entities: {}, rawText: 'test', city: 'رشت' },
  });
  const snap = legacyDraftToSemanticSnapshot(draft, opts);
  errors.push(...assertValidSnapshot('legacy-location-case-a', snap));
  const field = snap.fields.find((f) => f.fieldId === 'location');
  if (field?.state !== 'resolved') errors.push(fail('legacy-location-case-a', `state=${field?.state}, expected resolved (legacy DOES have the value)`));
  if (field?.provenance.rawInputContainsValue !== false) {
    errors.push(fail('legacy-location-case-a', `rawInputContainsValue=${field?.provenance.rawInputContainsValue}, expected false`));
  }
  return errors;
}

function testLegacyLocationCityInFreeText(): string[] {
  // Control case (Case B): city appears in the free text too.
  const errors: string[] = [];
  const draft = baseDraft({
    sourceText: 'لپ تاپ گیمینگ نو میخوام بخرم تو رشت',
    parsedIntent: { intentType: 'BUY' as never, categorySlug: 'laptop', confidence: 0.9, entities: {}, rawText: 'test', city: 'رشت' },
  });
  const snap = legacyDraftToSemanticSnapshot(draft, opts);
  const field = snap.fields.find((f) => f.fieldId === 'location');
  if (field?.provenance.rawInputContainsValue !== true) {
    errors.push(fail('legacy-location-case-b', `rawInputContainsValue=${field?.provenance.rawInputContainsValue}, expected true`));
  }
  return errors;
}

function testLegacyLocationAmbiguousAndMissing(): string[] {
  const errors: string[] = [];
  const ambiguousDraft = baseDraft({
    parsedIntent: {
      intentType: 'BUY' as never,
      categorySlug: 'laptop',
      confidence: 0.9,
      entities: {},
      rawText: 'test',
      locationAmbiguous: true,
      cityCandidates: [{ cityId: 'c1', label: 'رشت', score: 0.6 }, { cityId: 'c2', label: 'انزلی', score: 0.55 }],
    },
  });
  const ambiguousSnap = legacyDraftToSemanticSnapshot(ambiguousDraft, opts);
  const ambiguousField = ambiguousSnap.fields.find((f) => f.fieldId === 'location');
  if (ambiguousField?.state !== 'ambiguous') errors.push(fail('legacy-location-ambiguous', `state=${ambiguousField?.state}`));

  const missingDraft = baseDraft({});
  const missingSnap = legacyDraftToSemanticSnapshot(missingDraft, opts);
  const missingField = missingSnap.fields.find((f) => f.fieldId === 'location');
  if (missingField?.state !== 'missing') errors.push(fail('legacy-location-missing', `state=${missingField?.state}`));
  if (missingField?.provenance.rawInputContainsValue !== null) {
    errors.push(fail('legacy-location-missing', 'rawInputContainsValue must be null when there is no resolved value to check'));
  }
  return errors;
}

function decision(overrides: Partial<Decision>): Decision {
  return {
    domain: 'category',
    candidates: [],
    preferred: null,
    requiresClarification: true,
    derivedFromEvidenceIds: [],
    ...overrides,
  };
}

function cognitiveResult(decisions: Decision[]): CognitivePipelineResult {
  return { decisions } as unknown as CognitivePipelineResult;
}

function testCognitiveCategoryResolved(): string[] {
  const errors: string[] = [];
  const result = cognitiveResult([
    decision({
      domain: 'category',
      preferred: { id: 'apartment-rent', label: 'آپارتمان', state: 'preferred', score: 0.95, scoreBreakdown: { evidenceConfidence: 0.95, conflictPenalty: 0 }, disqualifiedByRule: null, resolver: 'category-rules-matcher' },
      candidates: [{ id: 'apartment-rent', label: 'آپارتمان', state: 'preferred', score: 0.95, scoreBreakdown: { evidenceConfidence: 0.95, conflictPenalty: 0 }, disqualifiedByRule: null, resolver: 'category-rules-matcher' }],
      requiresClarification: false,
      derivedFromEvidenceIds: ['E1'],
    }),
    decision({ domain: 'location' }),
  ]);
  const snap = cognitiveResultToSemanticSnapshot(result, opts);
  const errs = semanticSnapshotSchema.safeParse(snap);
  if (!errs.success) errors.push(fail('cognitive-category-resolved', errs.error.message));
  const field = snap.fields.find((f) => f.fieldId === 'category');
  if (field?.state !== 'resolved') errors.push(fail('cognitive-category-resolved', `state=${field?.state}`));
  if (field?.confidence !== 0.95) errors.push(fail('cognitive-category-resolved', `confidence=${field?.confidence}`));
  return errors;
}

function testCognitiveLocationAmbiguousExcludesDisqualified(): string[] {
  const errors: string[] = [];
  const result = cognitiveResult([
    decision({ domain: 'category' }),
    decision({
      domain: 'location',
      preferred: { id: 'a', label: 'رشت', state: 'preferred', score: 0.6, scoreBreakdown: { evidenceConfidence: 0.6, conflictPenalty: 0 }, disqualifiedByRule: null, resolver: 'location-lre-bridge' },
      candidates: [
        { id: 'a', label: 'رشت', state: 'preferred', score: 0.6, scoreBreakdown: { evidenceConfidence: 0.6, conflictPenalty: 0 }, disqualifiedByRule: null, resolver: 'location-lre-bridge' },
        { id: 'b', label: 'انزلی', state: 'supported', score: 0.5, scoreBreakdown: { evidenceConfidence: 0.5, conflictPenalty: 0 }, disqualifiedByRule: null, resolver: 'location-lre-bridge' },
        { id: 'c', label: 'زیدون', state: 'supported', score: 0.4, scoreBreakdown: { evidenceConfidence: 0.4, conflictPenalty: 0 }, disqualifiedByRule: 'business-rule', resolver: 'location-lre-bridge' },
      ],
      requiresClarification: true,
      derivedFromEvidenceIds: ['E2'],
    }),
  ]);
  const snap = cognitiveResultToSemanticSnapshot(result, opts);
  const field = snap.fields.find((f) => f.fieldId === 'location');
  if (field?.state !== 'ambiguous') errors.push(fail('cognitive-location-ambiguous', `state=${field?.state}`));
  if (field?.candidates?.length !== 2) {
    errors.push(fail('cognitive-location-ambiguous', `expected 2 plausible candidates (disqualified 'c' excluded), got ${field?.candidates?.length}`));
  }
  return errors;
}

function testCognitiveMissingAndUnknown(): string[] {
  const errors: string[] = [];
  const missingResult = cognitiveResult([decision({ domain: 'category' }), decision({ domain: 'location' })]);
  const missingSnap = cognitiveResultToSemanticSnapshot(missingResult, opts);
  const missingField = missingSnap.fields.find((f) => f.fieldId === 'category');
  if (missingField?.state !== 'missing') errors.push(fail('cognitive-missing', `state=${missingField?.state}`));

  // No 'location' Decision at all in the result -> honestly 'unknown', not 'missing'.
  const unknownResult = cognitiveResult([decision({ domain: 'category' })]);
  const unknownSnap = cognitiveResultToSemanticSnapshot(unknownResult, opts);
  const unknownField = unknownSnap.fields.find((f) => f.fieldId === 'location');
  if (unknownField?.state !== 'unknown') errors.push(fail('cognitive-unknown', `state=${unknownField?.state}`));
  return errors;
}

function testCognitiveScoreAlreadyClampedPassesThroughUnmodified(): string[] {
  // Documents Adapter Finding #2: the adapter does not re-clamp. A pre-clamped 1.0 (whatever its
  // true origin) passes straight through — this test just proves no extra transformation happens.
  const errors: string[] = [];
  const result = cognitiveResult([
    decision({ domain: 'category' }),
    decision({
      domain: 'location',
      preferred: { id: 'x', label: 'مشهد', state: 'preferred', score: 1, scoreBreakdown: { evidenceConfidence: 1, conflictPenalty: 0 }, disqualifiedByRule: null, resolver: 'location-lre-bridge' },
      candidates: [{ id: 'x', label: 'مشهد', state: 'preferred', score: 1, scoreBreakdown: { evidenceConfidence: 1, conflictPenalty: 0 }, disqualifiedByRule: null, resolver: 'location-lre-bridge' }],
      requiresClarification: false,
      derivedFromEvidenceIds: [],
    }),
  ]);
  const snap = cognitiveResultToSemanticSnapshot(result, opts);
  const field = snap.fields.find((f) => f.fieldId === 'location');
  if (field?.confidence !== 1) errors.push(fail('cognitive-score-passthrough', `confidence=${field?.confidence}, expected exactly 1`));
  return errors;
}

export function runAdaptersSelfTest(): { passed: number; failed: string[] } {
  const suites = [
    testLegacyCategoryResolved,
    testLegacyCategoryConfidenceHonestlyNull,
    testLegacyCategoryAmbiguous,
    testLegacyCategoryMissing,
    testLegacyLocationCityOnlyInStructuredField,
    testLegacyLocationCityInFreeText,
    testLegacyLocationAmbiguousAndMissing,
    testCognitiveCategoryResolved,
    testCognitiveLocationAmbiguousExcludesDisqualified,
    testCognitiveMissingAndUnknown,
    testCognitiveScoreAlreadyClampedPassesThroughUnmodified,
  ];
  const failed = suites.flatMap((fn) => fn());
  return { passed: suites.length - failed.length, failed };
}

const isDirectRun = typeof process !== 'undefined' && Boolean(process.argv[1]?.includes('run-adapters-self-test'));

if (isDirectRun) {
  const { passed, failed } = runAdaptersSelfTest();
  if (failed.length) {
    console.error('SEE adapters self-test FAILED:\n', failed.join('\n'));
    process.exit(1);
  }
  console.log(`SEE adapters self-test OK: ${passed}/11`);
}
