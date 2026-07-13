/**
 * Step 4 self-test for the Semantic Comparator (Layer 1) — §2/§3/§9/§14/§15/§16
 * (`PLAN/semantic-comparator-architecture.md`). Uses synthetic `SemanticSnapshot` fixtures
 * (isolating Comparator LOGIC from adapter correctness, already covered by `test:see-adapters`)
 * plus the REAL `categoryOntologyProvider` (Step 2) — no mock ontology, since the whole point is
 * exercising the real distance/type rules the investigation's Phase 3 audit designed.
 *
 * Run via: npm run test:see-comparator
 */
import { compareSnapshots } from '@/semantic-evaluation-engine/comparator/compare-snapshots';
import { categoryOntologyProvider } from '@/semantic-evaluation-engine/ontology/category-ontology-provider';
import { assertRegisteredReasonCode, STATE_REASON_CODES } from '@/semantic-evaluation-engine/registry/reason-codes';
import { comparisonReportSchema } from '@/semantic-evaluation-engine/types';
import type { SemanticFieldValue, SemanticSnapshot, FieldSpec } from '@/semantic-evaluation-engine/types';

function fail(id: string, msg: string): string {
  return `${id}: ${msg}`;
}

const CATEGORY_SPEC: FieldSpec = { fieldId: 'category', displayName: 'Category', strategy: { kind: 'scalar-ontology', ontologyNamespace: 'category' } };
const LOCATION_SPEC: FieldSpec = { fieldId: 'location', displayName: 'Location', strategy: { kind: 'scalar-geo' } };

function field(overrides: Partial<SemanticFieldValue> & Pick<SemanticFieldValue, 'fieldId' | 'state'>): SemanticFieldValue {
  return {
    value: null,
    confidence: null,
    provenance: { sourceSystem: 'test', evidenceRefs: [], derivation: 'direct', rawInputContainsValue: null },
    ...overrides,
  };
}

function snapshot(id: string, sourceSystem: string, fields: SemanticFieldValue[]): SemanticSnapshot {
  return { snapshotId: id, sourceSystem, producedAt: '2026-07-08T00:00:00.000Z', semanticContractVersion: '1.0.0', fields };
}

const OPTS = {
  reportId: 'report-test',
  comparedAt: '2026-07-08T00:00:00.000Z',
  fieldSpecs: [CATEGORY_SPEC, LOCATION_SPEC],
  ontologyProviders: { category: categoryOntologyProvider },
  comparatorEngineVersion: '1.0.0',
};

function categoryField(id: string, state: SemanticFieldValue['state'] = 'resolved'): SemanticFieldValue {
  return field({ fieldId: 'category', state, value: { shape: 'scalar-ontology', ref: { namespace: 'category', id } }, confidence: 0.9 });
}

function geoField(raw: string, rawInputContainsValue: boolean | null = null): SemanticFieldValue {
  return field({
    fieldId: 'location',
    state: 'resolved',
    value: { shape: 'scalar-geo', ref: null, raw },
    confidence: 0.8,
    provenance: { sourceSystem: 'test', evidenceRefs: [], derivation: 'direct', rawInputContainsValue },
  });
}

function missingField(fieldId: string): SemanticFieldValue {
  return field({ fieldId, state: 'missing' });
}

function assertReportValid(id: string, report: unknown): string[] {
  const r = comparisonReportSchema.safeParse(report);
  return r.success ? [] : [fail(id, `output failed comparisonReportSchema: ${r.error.message}`)];
}

function findStatus(report: ReturnType<typeof compareSnapshots>, fieldId: string) {
  return report.fieldResults.find((f) => f.fieldId === fieldId)?.status;
}
function findReasonCode(report: ReturnType<typeof compareSnapshots>, fieldId: string) {
  return report.fieldResults.find((f) => f.fieldId === fieldId)?.reasonCode;
}

function testCategoryRefinement(): string[] {
  const errors: string[] = [];
  const a = snapshot('a', 'legacy', [categoryField('residential-rent'), missingField('location')]);
  const b = snapshot('b', 'cognitive', [categoryField('apartment-rent'), missingField('location')]);
  const report = compareSnapshots(a, b, OPTS);
  errors.push(...assertReportValid('refinement', report));
  if (findStatus(report, 'category') !== 'refinement') errors.push(fail('refinement', `status=${findStatus(report, 'category')}`));
  if (findReasonCode(report, 'category') !== 'ONTOLOGY.PARENT_OF') errors.push(fail('refinement', `reasonCode=${findReasonCode(report, 'category')}`));
  return errors;
}

function testCategoryIdentical(): string[] {
  const errors: string[] = [];
  const a = snapshot('a', 'legacy', [categoryField('laptop'), missingField('location')]);
  const b = snapshot('b', 'cognitive', [categoryField('laptop'), missingField('location')]);
  const report = compareSnapshots(a, b, OPTS);
  if (findStatus(report, 'category') !== 'match') errors.push(fail('identical', `status=${findStatus(report, 'category')}`));
  return errors;
}

function testCategorySiblingSameTopBranch(): string[] {
  const errors: string[] = [];
  // The investigation's real genuine-bug case: motorcycle vs car, both only share depth-0 "vehicles".
  const a = snapshot('a', 'legacy', [categoryField('motorcycle'), missingField('location')]);
  const b = snapshot('b', 'cognitive', [categoryField('car'), missingField('location')]);
  const report = compareSnapshots(a, b, OPTS);
  if (findStatus(report, 'category') !== 'ambiguous-but-plausible') errors.push(fail('sibling', `status=${findStatus(report, 'category')}`));
  return errors;
}

function testCategoryUnrelated(): string[] {
  const errors: string[] = [];
  const a = snapshot('a', 'legacy', [categoryField('motorcycle'), missingField('location')]);
  const b = snapshot('b', 'cognitive', [categoryField('laptop'), missingField('location')]);
  const report = compareSnapshots(a, b, OPTS);
  if (findStatus(report, 'category') !== 'mismatch') errors.push(fail('unrelated', `status=${findStatus(report, 'category')}`));
  return errors;
}

function testLocationNotApplicableReclassification(): string[] {
  // THE central §15/§16 finding, now realized: legacy resolved a value never in the raw text the
  // cognitive engine saw (rawInputContainsValue=false) + cognitive missing -> not-comparable, not
  // a mismatch. This is the exact fix for the original drift investigation's 28/41 finding.
  const errors: string[] = [];
  const a = snapshot('a', 'legacy', [missingField('category'), geoField('رشت', false)]);
  const b = snapshot('b', 'cognitive', [missingField('category'), missingField('location')]);
  const report = compareSnapshots(a, b, OPTS);
  if (findStatus(report, 'location') !== 'not-comparable') errors.push(fail('not-applicable-reclass', `status=${findStatus(report, 'location')}`));
  if (findReasonCode(report, 'location') !== STATE_REASON_CODES.SOURCE_NEVER_CONTAINED_VALUE) {
    errors.push(fail('not-applicable-reclass', `reasonCode=${findReasonCode(report, 'location')}`));
  }
  return errors;
}

function testLocationGenuineMismatchNotReclassified(): string[] {
  // Same shape, but rawInputContainsValue=true -> a REAL gap, must stay a genuine mismatch/missing,
  // not be laundered into not-comparable.
  const errors: string[] = [];
  const a = snapshot('a', 'legacy', [missingField('category'), geoField('رشت', true)]);
  const b = snapshot('b', 'cognitive', [missingField('category'), missingField('location')]);
  const report = compareSnapshots(a, b, OPTS);
  if (findStatus(report, 'location') !== 'mismatch') errors.push(fail('genuine-mismatch', `status=${findStatus(report, 'location')}`));
  if (findReasonCode(report, 'location') !== STATE_REASON_CODES.ONE_SIDE_MISSING) {
    errors.push(fail('genuine-mismatch', `reasonCode=${findReasonCode(report, 'location')}`));
  }
  return errors;
}

function testLocationGeoMatchAndMismatch(): string[] {
  const errors: string[] = [];
  const matchReport = compareSnapshots(
    snapshot('a', 'legacy', [missingField('category'), geoField('رشت')]),
    snapshot('b', 'cognitive', [missingField('category'), geoField('رشت')]),
    OPTS
  );
  if (findStatus(matchReport, 'location') !== 'match') errors.push(fail('geo-match', `status=${findStatus(matchReport, 'location')}`));

  const mismatchReport = compareSnapshots(
    snapshot('a', 'legacy', [missingField('category'), geoField('رشت')]),
    snapshot('b', 'cognitive', [missingField('category'), geoField('مشهد')]),
    OPTS
  );
  if (findStatus(mismatchReport, 'location') !== 'mismatch') errors.push(fail('geo-mismatch', `status=${findStatus(mismatchReport, 'location')}`));
  return errors;
}

function testBothMissing(): string[] {
  const errors: string[] = [];
  const report = compareSnapshots(
    snapshot('a', 'legacy', [missingField('category'), missingField('location')]),
    snapshot('b', 'cognitive', [missingField('category'), missingField('location')]),
    OPTS
  );
  if (findStatus(report, 'category') !== 'match' || findReasonCode(report, 'category') !== STATE_REASON_CODES.BOTH_MISSING) {
    errors.push(fail('both-missing', `status=${findStatus(report, 'category')}, reason=${findReasonCode(report, 'category')}`));
  }
  return errors;
}

function testAmbiguousVsResolved(): string[] {
  const errors: string[] = [];
  const ambiguousField = field({
    fieldId: 'category',
    state: 'ambiguous',
    candidates: [
      { shape: 'scalar-ontology', ref: { namespace: 'category', id: 'laptop' } },
      { shape: 'scalar-ontology', ref: { namespace: 'category', id: 'desktop-computer' } },
    ],
  });
  const matchReport = compareSnapshots(
    snapshot('a', 'legacy', [ambiguousField, missingField('location')]),
    snapshot('b', 'cognitive', [categoryField('laptop'), missingField('location')]),
    OPTS
  );
  if (findStatus(matchReport, 'category') !== 'ambiguous-but-plausible') {
    errors.push(fail('ambiguous-match', `status=${findStatus(matchReport, 'category')}`));
  }
  const mismatchReport = compareSnapshots(
    snapshot('a', 'legacy', [ambiguousField, missingField('location')]),
    snapshot('b', 'cognitive', [categoryField('camera'), missingField('location')]),
    OPTS
  );
  if (findStatus(mismatchReport, 'category') !== 'mismatch') {
    errors.push(fail('ambiguous-mismatch', `status=${findStatus(mismatchReport, 'category')}`));
  }
  return errors;
}

function testUnknownWhenFieldAbsentFromSnapshot(): string[] {
  const errors: string[] = [];
  const a = snapshot('a', 'legacy', [categoryField('laptop')]); // no 'location' field at all
  const b = snapshot('b', 'cognitive', [categoryField('laptop'), missingField('location')]);
  const report = compareSnapshots(a, b, OPTS);
  if (findStatus(report, 'location') !== 'not-comparable' || findReasonCode(report, 'location') !== STATE_REASON_CODES.NOT_YET_EVALUATED) {
    errors.push(fail('absent-field-unknown', `status=${findStatus(report, 'location')}, reason=${findReasonCode(report, 'location')}`));
  }
  return errors;
}

function testContradictory(): string[] {
  const errors: string[] = [];
  const a = snapshot('a', 'legacy', [field({ fieldId: 'category', state: 'contradictory' }), missingField('location')]);
  const b = snapshot('b', 'cognitive', [categoryField('laptop'), missingField('location')]);
  const report = compareSnapshots(a, b, OPTS);
  if (findStatus(report, 'category') !== 'contradiction-detected') errors.push(fail('contradictory', `status=${findStatus(report, 'category')}`));
  return errors;
}

function testInv14ThrowsOnUnregisteredCode(): string[] {
  const errors: string[] = [];
  let threw = false;
  try {
    assertRegisteredReasonCode('MADE_UP.NOT_REAL');
  } catch {
    threw = true;
  }
  if (!threw) errors.push(fail('inv-14', 'assertRegisteredReasonCode must throw for an unregistered code'));
  return errors;
}

function testCountsTally(): string[] {
  const errors: string[] = [];
  const report = compareSnapshots(
    snapshot('a', 'legacy', [categoryField('laptop'), geoField('رشت')]),
    snapshot('b', 'cognitive', [categoryField('laptop'), geoField('مشهد')]),
    OPTS
  );
  if (report.counts.comparable !== 2) errors.push(fail('counts', `comparable=${report.counts.comparable}`));
  if (report.counts.match !== 1) errors.push(fail('counts', `match=${report.counts.match}`));
  if (report.counts.mismatch !== 1) errors.push(fail('counts', `mismatch=${report.counts.mismatch}`));
  return errors;
}

function testVersionStampCapturesOntologyVersion(): string[] {
  const errors: string[] = [];
  const report = compareSnapshots(
    snapshot('a', 'legacy', [categoryField('laptop'), missingField('location')]),
    snapshot('b', 'cognitive', [categoryField('laptop'), missingField('location')]),
    OPTS
  );
  if (report.versionStamp.ontologyVersions.category !== categoryOntologyProvider.version) {
    errors.push(fail('version-stamp', `ontologyVersions.category=${report.versionStamp.ontologyVersions.category}`));
  }
  return errors;
}

export function runComparatorSelfTest(): { passed: number; failed: string[] } {
  const suites = [
    testCategoryRefinement,
    testCategoryIdentical,
    testCategorySiblingSameTopBranch,
    testCategoryUnrelated,
    testLocationNotApplicableReclassification,
    testLocationGenuineMismatchNotReclassified,
    testLocationGeoMatchAndMismatch,
    testBothMissing,
    testAmbiguousVsResolved,
    testUnknownWhenFieldAbsentFromSnapshot,
    testContradictory,
    testInv14ThrowsOnUnregisteredCode,
    testCountsTally,
    testVersionStampCapturesOntologyVersion,
  ];
  const failed = suites.flatMap((fn) => fn());
  return { passed: suites.length - failed.length, failed };
}

const isDirectRun = typeof process !== 'undefined' && Boolean(process.argv[1]?.includes('run-comparator-self-test'));

if (isDirectRun) {
  const { passed, failed } = runComparatorSelfTest();
  if (failed.length) {
    console.error('SEE comparator self-test FAILED:\n', failed.join('\n'));
    process.exit(1);
  }
  console.log(`SEE comparator self-test OK: ${passed}/14`);
}
