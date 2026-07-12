/**
 * Phase 3 self-test for the Cognitive Decision Engine (RFC-002 Part 5).
 *
 * Uses synthetic GroundedEvidence input rather than real resolver output — Phase 2's own test
 * already covers grounding correctness; this test isolates decision LOGIC (scoring, ADR-019
 * ambiguity, ADR-020 business-rule override, ADR-021 user-confirmation override) so it's fast,
 * deterministic, and doesn't need the LLM or `--conditions=react-server`.
 *
 * Run via: npm run test:cognitive-decision
 */
import { decideCandidates } from '@/cognitive-engine/decision/decision-engine';
import type { GroundedEvidence } from '@/cognitive-engine/types/grounded-evidence';

function grounded(candidates: GroundedEvidence['candidates']): GroundedEvidence {
  return { domain: 'category', status: 'ambiguous', candidates, derivedFromEvidenceIds: ['E1'] };
}

function fail(id: string, msg: string): string {
  return `${id}: ${msg}`;
}

function testClearWinner(): string[] {
  const errors: string[] = [];
  const d = decideCandidates(
    grounded([
      { id: 'a', label: 'A', confidence: 0.9, resolver: 'test' },
      { id: 'b', label: 'B', confidence: 0.5, resolver: 'test' },
    ])
  );
  if (d.preferred?.id !== 'a') errors.push(fail('clear-winner', `preferred=${d.preferred?.id}, expected a`));
  if (d.requiresClarification) errors.push(fail('clear-winner', 'requiresClarification should be false'));
  if (d.preferred?.state !== 'preferred') errors.push(fail('clear-winner', `state=${d.preferred?.state}`));
  return errors;
}

function testAmbiguous(): string[] {
  const errors: string[] = [];
  const d = decideCandidates(
    grounded([
      { id: 'a', label: 'A', confidence: 0.6, resolver: 'test' },
      { id: 'b', label: 'B', confidence: 0.58, resolver: 'test' },
    ])
  );
  // ADR-019: a candidate can be Preferred (highest score) while STILL flagged as needing
  // clarification — "preferred" and "premature certainty" are independent per §39.
  if (d.preferred?.id !== 'a') errors.push(fail('ambiguous', `preferred=${d.preferred?.id}, expected a`));
  if (!d.requiresClarification) errors.push(fail('ambiguous', 'requiresClarification should be true'));
  return errors;
}

function testEmptyCandidates(): string[] {
  const errors: string[] = [];
  const d = decideCandidates(grounded([]));
  if (d.preferred !== null) errors.push(fail('empty', `preferred should be null, got ${d.preferred}`));
  if (!d.requiresClarification) errors.push(fail('empty', 'requiresClarification should be true'));
  return errors;
}

function testBusinessRuleOverride(): string[] {
  const errors: string[] = [];
  // ADR-020: business rules invalidate a candidate regardless of score, even the clear winner.
  const d = decideCandidates(
    grounded([
      { id: 'a', label: 'A', confidence: 0.9, resolver: 'test' },
      { id: 'b', label: 'B', confidence: 0.5, resolver: 'test' },
    ]),
    { invalidatedIds: ['a'] }
  );
  if (d.preferred?.id !== 'b') errors.push(fail('business-rule', `preferred=${d.preferred?.id}, expected b`));
  const disqualified = d.candidates.find((c) => c.id === 'a');
  if (disqualified?.disqualifiedByRule !== 'business-rule') {
    errors.push(fail('business-rule', `candidate a not marked disqualified: ${JSON.stringify(disqualified)}`));
  }
  return errors;
}

function testUserConfirmationOverride(): string[] {
  const errors: string[] = [];
  // ADR-021/ADR-035: a low-confidence user confirmation beats a high-confidence statistical pick.
  const d = decideCandidates(
    grounded([
      { id: 'a', label: 'A', confidence: 0.9, resolver: 'test' },
      { id: 'b', label: 'B', confidence: 0.3, resolver: 'test' },
    ]),
    { userConfirmedId: 'b' }
  );
  if (d.preferred?.id !== 'b') errors.push(fail('user-confirm', `preferred=${d.preferred?.id}, expected b`));
  if (d.preferred?.state !== 'confirmed') errors.push(fail('user-confirm', `state=${d.preferred?.state}`));
  if (d.requiresClarification) errors.push(fail('user-confirm', 'requiresClarification should be false'));
  return errors;
}

export function runDecisionEngineSelfTest(): { passed: number; failed: string[] } {
  const suites = [
    testClearWinner,
    testAmbiguous,
    testEmptyCandidates,
    testBusinessRuleOverride,
    testUserConfirmationOverride,
  ];
  const failed = suites.flatMap((fn) => fn());
  return { passed: suites.length - failed.length, failed };
}

const isDirectRun =
  typeof process !== 'undefined' && Boolean(process.argv[1]?.includes('run-decision-engine-self-test'));

if (isDirectRun) {
  const { passed, failed } = runDecisionEngineSelfTest();
  if (failed.length) {
    console.error('Decision engine self-test FAILED:\n', failed.join('\n'));
    process.exit(1);
  }
  console.log(`Decision engine self-test OK: ${passed}/5`);
}
