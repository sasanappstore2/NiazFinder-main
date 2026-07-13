/**
 * Step 5 self-test for the Scoring Policy Engine (Layer 2) — §4/§16
 * (`PLAN/semantic-comparator-architecture.md`). Uses synthetic `ComparisonReport` fixtures
 * (isolating Layer 2 logic from Layer 1 correctness, already covered by `test:see-comparator`).
 *
 * Run via: npm run test:see-scoring-policy
 */
import { applyScoringPolicy } from '@/semantic-evaluation-engine/policy/apply-scoring-policy';
import { resolveScoringPolicy } from '@/semantic-evaluation-engine/policy/policy-resolver';
import { DEFAULT_SCORING_POLICY } from '@/semantic-evaluation-engine/policy/default-policy';
import { finalEvaluationSchema } from '@/semantic-evaluation-engine/types';
import type { ComparisonReport, ComparisonStatus, ScoringPolicy } from '@/semantic-evaluation-engine/types';

function fail(id: string, msg: string): string {
  return `${id}: ${msg}`;
}

function fieldResult(fieldId: string, status: ComparisonStatus, distance: number | null = null): ComparisonReport['fieldResults'][number] {
  return {
    fieldId,
    status,
    snapshotAValue: { fieldId, state: 'resolved', value: null, confidence: null, provenance: { sourceSystem: 'a', evidenceRefs: [], derivation: 'direct', rawInputContainsValue: null } },
    snapshotBValue: { fieldId, state: 'resolved', value: null, confidence: null, provenance: { sourceSystem: 'b', evidenceRefs: [], derivation: 'direct', rawInputContainsValue: null } },
    relationship: distance !== null ? { type: 'parent-of', distance, directional: true, explanationParams: {} } : null,
    reasonCode: 'STATE.BOTH_MISSING',
    reasonParams: {},
  };
}

function report(results: ComparisonReport['fieldResults']): ComparisonReport {
  const counts = { comparable: 0, match: 0, refinement: 0, semanticEquivalent: 0, ambiguousButPlausible: 0, contradictionDetected: 0, mismatch: 0, notComparable: 0 };
  return {
    reportId: 'r1',
    comparedAt: '2026-07-08T00:00:00.000Z',
    snapshotAId: 'a',
    snapshotBId: 'b',
    versionStamp: { comparatorEngineVersion: '1.0.0', semanticContractVersion: '1.0.0', ontologyVersions: { category: '1.0.0' } },
    fieldResults: results,
    counts,
  };
}

function testAllMatchesIsAcceptable(): string[] {
  const errors: string[] = [];
  const r = report([fieldResult('category', 'match'), fieldResult('location', 'match')]);
  const fe = applyScoringPolicy(r, DEFAULT_SCORING_POLICY, { evaluationId: 'e1', evaluationReportVersion: '1.0.0' });
  const parsed = finalEvaluationSchema.safeParse(fe);
  if (!parsed.success) errors.push(fail('all-match', parsed.error.message));
  if (fe.overallScore !== 0) errors.push(fail('all-match', `overallScore=${fe.overallScore}`));
  if (fe.verdict !== 'acceptable') errors.push(fail('all-match', `verdict=${fe.verdict}`));
  return errors;
}

function testAllMismatchIsEscalate(): string[] {
  const errors: string[] = [];
  const r = report([fieldResult('category', 'mismatch'), fieldResult('location', 'mismatch')]);
  const fe = applyScoringPolicy(r, DEFAULT_SCORING_POLICY, { evaluationId: 'e2', evaluationReportVersion: '1.0.0' });
  if (fe.overallScore !== 1) errors.push(fail('all-mismatch', `overallScore=${fe.overallScore}`));
  if (fe.verdict !== 'escalate') errors.push(fail('all-mismatch', `verdict=${fe.verdict}`));
  return errors;
}

function testRefinementIsAcceptableUnderDefaultPolicy(): string[] {
  const errors: string[] = [];
  const r = report([fieldResult('category', 'refinement', 1), fieldResult('location', 'match')]);
  const fe = applyScoringPolicy(r, DEFAULT_SCORING_POLICY, { evaluationId: 'e3', evaluationReportVersion: '1.0.0' });
  if (fe.verdict !== 'acceptable') errors.push(fail('refinement-acceptable', `verdict=${fe.verdict}, score=${fe.overallScore}`));
  const catField = fe.perField.find((f) => f.fieldId === 'category');
  if (catField?.distance !== 1) errors.push(fail('refinement-acceptable', `distance=${catField?.distance}`));
  return errors;
}

function testNotComparableExcludedFromScoring(): string[] {
  const errors: string[] = [];
  const r = report([fieldResult('category', 'match'), fieldResult('location', 'not-comparable')]);
  const fe = applyScoringPolicy(r, DEFAULT_SCORING_POLICY, { evaluationId: 'e4', evaluationReportVersion: '1.0.0' });
  if (fe.perField.length !== 1) errors.push(fail('not-comparable-excluded', `perField.length=${fe.perField.length}, expected 1 (not-comparable dropped)`));
  if (fe.overallScore !== 0) errors.push(fail('not-comparable-excluded', `overallScore=${fe.overallScore}`));
  return errors;
}

function testFieldWeightsChangeOutcome(): string[] {
  const errors: string[] = [];
  const policy: ScoringPolicy = {
    policyId: 'vehicles-v1',
    policyVersion: '1.0.0',
    appliesTo: { marketplaceVertical: 'vehicles' },
    fieldWeights: { location: 1, category: 0.1 },
    defaultWeight: 1,
    thresholds: { acceptableMaxScore: 0.3, escalateMinScore: 0.6 },
  };
  // location mismatches (high weight), category is fine (low weight) -> should still escalate,
  // dominated by the heavily-weighted location field.
  const r = report([fieldResult('category', 'match'), fieldResult('location', 'mismatch')]);
  const fe = applyScoringPolicy(r, policy, { evaluationId: 'e5', evaluationReportVersion: '1.0.0' });
  if (fe.verdict !== 'escalate') errors.push(fail('field-weights', `verdict=${fe.verdict}, expected escalate (location weight=1 dominates), score=${fe.overallScore}`));
  return errors;
}

function testStatusWeightModifierDoublesContradiction(): string[] {
  const errors: string[] = [];
  const policy: ScoringPolicy = {
    ...DEFAULT_SCORING_POLICY,
    policyId: 'contradiction-sensitive-v1',
    statusWeightModifiers: { 'contradiction-detected': 2 },
  };
  const r = report([fieldResult('category', 'contradiction-detected')]);
  const fe = applyScoringPolicy(r, policy, { evaluationId: 'e6', evaluationReportVersion: '1.0.0' });
  const catField = fe.perField.find((f) => f.fieldId === 'category');
  if (catField?.statusModifier !== 2) errors.push(fail('status-modifier', `statusModifier=${catField?.statusModifier}`));
  if (catField?.weightedContribution !== 2) errors.push(fail('status-modifier', `weightedContribution=${catField?.weightedContribution}, expected 1(baseDrift)*1(weight)*2(modifier)=2`));
  return errors;
}

function testDeterminism(): string[] {
  const errors: string[] = [];
  const r = report([fieldResult('category', 'refinement', 1), fieldResult('location', 'mismatch')]);
  const fe1 = applyScoringPolicy(r, DEFAULT_SCORING_POLICY, { evaluationId: 'e7', evaluationReportVersion: '1.0.0' });
  const fe2 = applyScoringPolicy(r, DEFAULT_SCORING_POLICY, { evaluationId: 'e7', evaluationReportVersion: '1.0.0' });
  if (JSON.stringify(fe1) !== JSON.stringify(fe2)) errors.push(fail('determinism', 'same report+policy produced different FinalEvaluation'));
  return errors;
}

function testPolicyResolutionSpecificityOrder(): string[] {
  const errors: string[] = [];
  const categoryPolicy: ScoringPolicy = { ...DEFAULT_SCORING_POLICY, policyId: 'real-estate-branch-v1', appliesTo: { categoryBranch: 'real-estate' } };
  const verticalPolicy: ScoringPolicy = { ...DEFAULT_SCORING_POLICY, policyId: 'vehicles-v1', appliesTo: { marketplaceVertical: 'vehicles' } };
  const policies = [DEFAULT_SCORING_POLICY, verticalPolicy, categoryPolicy];

  const resolved1 = resolveScoringPolicy(policies, { categoryBranch: 'real-estate', marketplaceVertical: 'vehicles' });
  if (resolved1.policyId !== 'real-estate-branch-v1') errors.push(fail('resolution-order', `expected categoryBranch to win, got ${resolved1.policyId}`));

  const resolved2 = resolveScoringPolicy(policies, { marketplaceVertical: 'vehicles' });
  if (resolved2.policyId !== 'vehicles-v1') errors.push(fail('resolution-order', `expected marketplaceVertical to win over global, got ${resolved2.policyId}`));

  const resolved3 = resolveScoringPolicy(policies, {});
  if (resolved3.policyId !== 'default-v1') errors.push(fail('resolution-order', `expected global fallback, got ${resolved3.policyId}`));
  return errors;
}

function testResolutionThrowsWithoutGlobalFallback(): string[] {
  const errors: string[] = [];
  const verticalOnly: ScoringPolicy = { ...DEFAULT_SCORING_POLICY, policyId: 'vehicles-v1', appliesTo: { marketplaceVertical: 'vehicles' } };
  let threw = false;
  try {
    resolveScoringPolicy([verticalOnly], {});
  } catch {
    threw = true;
  }
  if (!threw) errors.push(fail('no-global-fallback', 'expected resolveScoringPolicy to throw when no global policy exists and context matches nothing'));
  return errors;
}

export function runScoringPolicySelfTest(): { passed: number; failed: string[] } {
  const suites = [
    testAllMatchesIsAcceptable,
    testAllMismatchIsEscalate,
    testRefinementIsAcceptableUnderDefaultPolicy,
    testNotComparableExcludedFromScoring,
    testFieldWeightsChangeOutcome,
    testStatusWeightModifierDoublesContradiction,
    testDeterminism,
    testPolicyResolutionSpecificityOrder,
    testResolutionThrowsWithoutGlobalFallback,
  ];
  const failed = suites.flatMap((fn) => fn());
  return { passed: suites.length - failed.length, failed };
}

const isDirectRun = typeof process !== 'undefined' && Boolean(process.argv[1]?.includes('run-scoring-policy-self-test'));

if (isDirectRun) {
  const { passed, failed } = runScoringPolicySelfTest();
  if (failed.length) {
    console.error('SEE scoring-policy self-test FAILED:\n', failed.join('\n'));
    process.exit(1);
  }
  console.log(`SEE scoring-policy self-test OK: ${passed}/9`);
}
