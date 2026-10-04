/**
 * Step 1 self-test for the Semantic Evaluation Engine's contracts
 * (`PLAN/semantic-comparator-architecture.md`). Pure schema validation — no comparator logic
 * exists yet (that's Step 4). Verifies the contracts encode the architecture correctly: the
 * 8-state value model, the 5 value shapes (including recursion), the no-`label`-on-OntologyRef
 * revision, the no-`weight`-on-FieldSpec / no-`weight`-on-FieldComparisonResult correction
 * (weighting belongs to the Scoring Policy Engine only, per INV-09), and confidence normalization
 * enforcement (the exact class of bug the drift investigation found in the legacy resolver).
 *
 * Run via: npm run test:see-contracts
 */
import {
  SEMANTIC_VALUE_STATES,
  semanticValueSchema,
  ontologyRefSchema,
  fieldSpecSchema,
  comparisonStrategySchema,
  semanticFieldValueSchema,
  semanticSnapshotSchema,
  fieldComparisonResultSchema,
  comparisonReportSchema,
  comparatorVersionStampSchema,
  evaluationVersionStampSchema,
} from '@/semantic-evaluation-engine/types';

function fail(id: string, msg: string): string {
  return `${id}: ${msg}`;
}

function testEightStates(): string[] {
  const errors: string[] = [];
  const expected = [
    'unknown',
    'missing',
    'not-applicable',
    'contradictory',
    'resolved',
    'inferred',
    'estimated',
    'ambiguous',
  ];
  if (SEMANTIC_VALUE_STATES.length !== 8) {
    errors.push(fail('eight-states', `expected 8 states, got ${SEMANTIC_VALUE_STATES.length}`));
  }
  for (const s of expected) {
    if (!(SEMANTIC_VALUE_STATES as readonly string[]).includes(s)) {
      errors.push(fail('eight-states', `missing state: ${s}`));
    }
  }
  return errors;
}

function testFiveValueShapes(): string[] {
  const errors: string[] = [];
  const cases: Array<[string, unknown]> = [
    ['scalar-ontology', { shape: 'scalar-ontology', ref: { namespace: 'category', id: 'apartment-rent' } }],
    ['scalar-geo', { shape: 'scalar-geo', ref: { namespace: 'location', id: 'rasht' }, raw: 'رشت' }],
    [
      'set',
      {
        shape: 'set',
        items: [
          { shape: 'scalar-ontology', ref: { namespace: 'attribute', id: 'gaming' } },
          { shape: 'scalar-ontology', ref: { namespace: 'attribute', id: 'used' } },
        ],
      },
    ],
    ['range', { shape: 'range', min: null, max: 80_000_000, unit: 'IRT' }],
    [
      'graph',
      {
        shape: 'graph',
        nodes: [{ namespace: 'marketplace-entity', id: 'laptop' }, { namespace: 'attribute', id: 'gaming' }],
        edges: [{ from: 'laptop', to: 'gaming', relationshipType: 'requires' }],
      },
    ],
  ];
  for (const [label, value] of cases) {
    const result = semanticValueSchema.safeParse(value);
    if (!result.success) errors.push(fail(`shape-${label}`, result.error.message));
  }
  return errors;
}

function testRecursiveSetOfSets(): string[] {
  const errors: string[] = [];
  const nested = {
    shape: 'set',
    items: [
      { shape: 'set', items: [{ shape: 'scalar-ontology', ref: { namespace: 'x', id: 'y' } }] },
    ],
  };
  if (!semanticValueSchema.safeParse(nested).success) {
    errors.push(fail('recursive-set', 'nested set-of-sets should parse'));
  }
  return errors;
}

function testRecursiveComparisonStrategy(): string[] {
  const errors: string[] = [];
  const setOfOntology = { kind: 'set', itemStrategy: { kind: 'scalar-ontology', ontologyNamespace: 'attribute' } };
  const result = comparisonStrategySchema.safeParse(setOfOntology);
  if (!result.success) errors.push(fail('recursive-strategy', result.error.message));
  return errors;
}

function testOntologyRefHasNoLabel(): string[] {
  const errors: string[] = [];
  const withLabel = { namespace: 'category', id: 'apartment-rent', label: 'آپارتمان' };
  const result = ontologyRefSchema.safeParse(withLabel);
  if (!result.success) {
    errors.push(fail('ontology-ref-no-label', 'valid ref with an extra label field should still parse'));
  } else if ('label' in result.data) {
    errors.push(fail('ontology-ref-no-label', 'label should be stripped — OntologyRef must be namespace+id only'));
  }
  return errors;
}

function testFieldSpecHasNoWeight(): string[] {
  const errors: string[] = [];
  const withWeight = {
    fieldId: 'category',
    displayName: 'Category',
    strategy: { kind: 'scalar-ontology', ontologyNamespace: 'category' },
    weight: 0.9,
  };
  const result = fieldSpecSchema.safeParse(withWeight);
  if (!result.success) errors.push(fail('field-spec-no-weight', result.error.message));
  else if ('weight' in result.data) {
    errors.push(fail('field-spec-no-weight', 'FieldSpec must not carry a weight — that is Layer 2 only (INV-09)'));
  }
  return errors;
}

function testValuelessStateRejectsValue(): string[] {
  const errors: string[] = [];
  const invalid = {
    fieldId: 'location',
    state: 'missing',
    value: { shape: 'scalar-geo', ref: null, raw: 'رشت' },
    confidence: null,
    provenance: { sourceSystem: 'test', evidenceRefs: [], derivation: 'direct', rawInputContainsValue: null },
  };
  if (semanticFieldValueSchema.safeParse(invalid).success) {
    errors.push(fail('valueless-state', 'state=missing with a non-null value should be rejected'));
  }
  const valid = { ...invalid, value: null };
  if (!semanticFieldValueSchema.safeParse(valid).success) {
    errors.push(fail('valueless-state', 'state=missing with value=null should be accepted'));
  }
  return errors;
}

function testConfidenceNormalizationEnforced(): string[] {
  const errors: string[] = [];
  // The exact bug class the drift investigation found: a 0-100 scale score reaching a 0-1 field.
  const outOfRange = {
    fieldId: 'location',
    state: 'resolved',
    value: { shape: 'scalar-geo', ref: null, raw: 'مشهد' },
    confidence: 100,
    provenance: { sourceSystem: 'test', evidenceRefs: ['E1'], derivation: 'direct', rawInputContainsValue: null },
  };
  if (semanticFieldValueSchema.safeParse(outOfRange).success) {
    errors.push(fail('confidence-normalization', 'confidence=100 must be rejected — schema enforces [0,1]'));
  }
  const inRange = { ...outOfRange, confidence: 0.7 };
  if (!semanticFieldValueSchema.safeParse(inRange).success) {
    errors.push(fail('confidence-normalization', 'confidence=0.7 should be accepted'));
  }
  return errors;
}

function testFullSnapshotRoundTrip(): string[] {
  const errors: string[] = [];
  const snapshot = {
    snapshotId: 'snap-1',
    sourceSystem: 'test-source',
    producedAt: '2026-07-08T00:00:00.000Z',
    semanticContractVersion: '1.0.0',
    fields: [
      {
        fieldId: 'category',
        state: 'resolved',
        value: { shape: 'scalar-ontology', ref: { namespace: 'category', id: 'apartment-rent' } },
        confidence: 0.98,
        provenance: { sourceSystem: 'test-source', evidenceRefs: ['E1'], derivation: 'direct', rawInputContainsValue: null },
      },
      {
        fieldId: 'location',
        state: 'not-applicable',
        value: null,
        confidence: null,
        provenance: { sourceSystem: 'test-source', evidenceRefs: [], derivation: 'direct', rawInputContainsValue: false },
      },
    ],
  };
  const result = semanticSnapshotSchema.safeParse(snapshot);
  if (!result.success) errors.push(fail('snapshot-roundtrip', result.error.message));
  return errors;
}

function testFieldComparisonResultStructuredExplanation(): string[] {
  const errors: string[] = [];
  const result = {
    fieldId: 'category',
    status: 'refinement',
    snapshotAValue: {
      fieldId: 'category',
      state: 'resolved',
      value: { shape: 'scalar-ontology', ref: { namespace: 'category', id: 'residential-rent' } },
      confidence: 0.9,
      provenance: { sourceSystem: 'legacy', evidenceRefs: [], derivation: 'direct', rawInputContainsValue: null },
    },
    snapshotBValue: {
      fieldId: 'category',
      state: 'resolved',
      value: { shape: 'scalar-ontology', ref: { namespace: 'category', id: 'apartment-rent' } },
      confidence: 0.95,
      provenance: { sourceSystem: 'cognitive-engine', evidenceRefs: ['E1'], derivation: 'direct', rawInputContainsValue: null },
    },
    relationship: {
      type: 'child-of',
      distance: 1,
      directional: true,
      explanationParams: { ancestorId: 'residential-rent', descendantId: 'apartment-rent' },
    },
    reasonCode: 'ONTOLOGY_PARENT_CHILD',
    reasonParams: { ancestorId: 'residential-rent', descendantId: 'apartment-rent' },
  };
  const parsed = fieldComparisonResultSchema.safeParse(result);
  if (!parsed.success) errors.push(fail('field-comparison-structured', parsed.error.message));
  else if ('reasonText' in parsed.data) {
    errors.push(fail('field-comparison-structured', 'reasonText must not exist — explanations are structured only'));
  } else if ('weight' in parsed.data) {
    errors.push(fail('field-comparison-structured', 'weight must not exist on a Layer-1 result (INV-09)'));
  }
  return errors;
}

function testComparisonReportRoundTrip(): string[] {
  const errors: string[] = [];
  const report = {
    reportId: 'report-1',
    comparedAt: '2026-07-08T00:00:00.000Z',
    snapshotAId: 'snap-legacy-1',
    snapshotBId: 'snap-cognitive-1',
    versionStamp: {
      comparatorEngineVersion: '1.0.0',
      semanticContractVersion: '1.0.0',
      ontologyVersions: { category: '1.0.0' },
    },
    fieldResults: [],
    counts: {
      comparable: 0,
      match: 0,
      refinement: 0,
      semanticEquivalent: 0,
      ambiguousButPlausible: 0,
      contradictionDetected: 0,
      mismatch: 0,
      notComparable: 0,
    },
  };
  const result = comparisonReportSchema.safeParse(report);
  if (!result.success) errors.push(fail('comparison-report-roundtrip', result.error.message));
  return errors;
}

function testVersionStampAxes(): string[] {
  const errors: string[] = [];
  const comparatorStamp = {
    comparatorEngineVersion: '1.0.0',
    semanticContractVersion: '1.0.0',
    ontologyVersions: { category: '1.0.0' },
  };
  if (!comparatorVersionStampSchema.safeParse(comparatorStamp).success) {
    errors.push(fail('version-stamp', 'valid ComparatorVersionStamp should parse'));
  }
  const evaluationStamp = { ...comparatorStamp, scoringPolicyId: 'default-v1', scoringPolicyVersion: '1.0.0', evaluationReportVersion: '1.0.0' };
  if (!evaluationVersionStampSchema.safeParse(evaluationStamp).success) {
    errors.push(fail('version-stamp', 'valid EvaluationVersionStamp should parse (extends comparator stamp)'));
  }
  if (evaluationVersionStampSchema.safeParse(comparatorStamp).success) {
    errors.push(fail('version-stamp', 'EvaluationVersionStamp must require policy/report fields, not just the comparator stamp'));
  }
  return errors;
}

export function runContractsSelfTest(): { passed: number; failed: string[] } {
  const suites = [
    testEightStates,
    testFiveValueShapes,
    testRecursiveSetOfSets,
    testRecursiveComparisonStrategy,
    testOntologyRefHasNoLabel,
    testFieldSpecHasNoWeight,
    testValuelessStateRejectsValue,
    testConfidenceNormalizationEnforced,
    testFullSnapshotRoundTrip,
    testFieldComparisonResultStructuredExplanation,
    testComparisonReportRoundTrip,
    testVersionStampAxes,
  ];
  const failed = suites.flatMap((fn) => fn());
  return { passed: suites.length - failed.length, failed };
}

const isDirectRun =
  typeof process !== 'undefined' && Boolean(process.argv[1]?.includes('run-contracts-self-test'));

if (isDirectRun) {
  const { passed, failed } = runContractsSelfTest();
  if (failed.length) {
    console.error('SEE contracts self-test FAILED:\n', failed.join('\n'));
    process.exit(1);
  }
  console.log(`SEE contracts self-test OK: ${passed}/12`);
}
