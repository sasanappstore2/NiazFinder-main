/**
 * Phase 5 self-test for Cognitive State + Readiness (RFC-002 Parts 9 & 10).
 *
 * Synthetic Decision/Claim/CNO input throughout — pure functions, no LLM, no resolvers, no
 * `--conditions=react-server` needed.
 *
 * Run via: npm run test:cognitive-state
 */
import { buildCognitiveState } from '@/cognitive-engine/state/build-cognitive-state';
import { computeReadiness } from '@/cognitive-engine/state/compute-readiness';
import type { Decision, DecidedCandidate } from '@/cognitive-engine/types/decision';
import type { Claim } from '@/cognitive-engine/types/claim';
import type { CanonicalNeedObject } from '@/cognitive-engine/types/canonical-need';

const NOW = '2026-07-07T00:00:00.000Z';

function candidate(id: string, label: string, score: number, overrides?: Partial<DecidedCandidate>): DecidedCandidate {
  return {
    id,
    label,
    state: 'supported',
    score,
    scoreBreakdown: { evidenceConfidence: score, conflictPenalty: 0 },
    disqualifiedByRule: null,
    resolver: 'test',
    ...overrides,
  };
}

function claim(field: string, value: string, status: Claim['status'], confidence: number): Claim {
  return { id: `claim:${field}:${value}`, field, value, status, confidence, derivedFromEvidenceIds: ['E1'], supersedes: null, createdAt: NOW };
}

function emptyCno(overrides: Partial<CanonicalNeedObject>): CanonicalNeedObject {
  return {
    identity: { needId: null, version: 1, status: 'draft', createdAt: NOW, updatedAt: NOW },
    semantic: { primaryIntent: null, entities: [] },
    constraints: { budgetMax: null, rahnAmount: null, monthlyRent: null, deposit: null },
    context: { notes: [] },
    evidence: [],
    claims: [],
    metadata: { engineVersion: 'test', overallConfidence: 0 },
    ...overrides,
  };
}

function testAmbiguityRegisterAndQueue(): string[] {
  const errors: string[] = [];
  const decisions: Decision[] = [
    {
      domain: 'category',
      candidates: [candidate('a', 'A', 0.6), candidate('b', 'B', 0.58)],
      preferred: candidate('a', 'A', 0.6, { state: 'preferred' }),
      requiresClarification: true,
      derivedFromEvidenceIds: ['E1'],
    },
    {
      domain: 'location',
      candidates: [],
      preferred: null,
      requiresClarification: true,
      derivedFromEvidenceIds: ['E2'],
    },
  ];
  const state = buildCognitiveState(decisions, []);

  if (state.ambiguityRegister.length !== 2) {
    errors.push(`ambiguityRegister.length=${state.ambiguityRegister.length}, expected 2`);
  }
  const categoryEntry = state.ambiguityRegister.find((e) => e.domain === 'category');
  const locationEntry = state.ambiguityRegister.find((e) => e.domain === 'location');
  if (categoryEntry?.status !== 'ambiguous') errors.push(`category status=${categoryEntry?.status}, expected ambiguous`);
  if (locationEntry?.status !== 'unresolved') errors.push(`location status=${locationEntry?.status}, expected unresolved`);

  // Both domains are mandatory (blocking), so ordering falls to reason: unresolved before ambiguous.
  if (state.clarificationQueue[0]?.domain !== 'location') {
    errors.push(`clarificationQueue[0]=${state.clarificationQueue[0]?.domain}, expected location (unresolved first)`);
  }
  if (!state.clarificationQueue.every((q) => q.blocking)) {
    errors.push(`expected all queue items blocking: ${JSON.stringify(state.clarificationQueue)}`);
  }
  return errors;
}

function testCandidateClaimsPreserved(): string[] {
  const errors: string[] = [];
  const claims: Claim[] = [
    claim('category', 'A', 'accepted', 0.9),
    claim('category', 'B', 'supported', 0.5),
    claim('location', 'X', 'archived', 0.0),
  ];
  const state = buildCognitiveState([], claims);
  if (state.acceptedClaims.length !== 1) errors.push(`acceptedClaims.length=${state.acceptedClaims.length}, expected 1`);
  if (state.candidateClaims.length !== 1) errors.push(`candidateClaims.length=${state.candidateClaims.length}, expected 1`);
  return errors;
}

function testReadinessIncomplete(): string[] {
  const errors: string[] = [];
  const r = computeReadiness(emptyCno({}));
  if (r.level !== 'incomplete') errors.push(`level=${r.level}, expected incomplete`);
  if (r.semanticReady) errors.push('semanticReady should be false');
  return errors;
}

function testReadinessInterpretable(): string[] {
  const errors: string[] = [];
  const r = computeReadiness(
    emptyCno({
      semantic: { primaryIntent: 'میخوام', entities: [{ domain: 'category', value: 'لپ تاپ', confidence: 0.8, decided: true }] },
      claims: [],
    })
  );
  if (r.level !== 'interpretable') errors.push(`level=${r.level}, expected interpretable`);
  if (r.businessReady) errors.push('businessReady should be false');
  if (r.blockingDomains.length !== 2) errors.push(`blockingDomains=${JSON.stringify(r.blockingDomains)}, expected both domains`);
  return errors;
}

function testReadinessValidVsReady(): string[] {
  const errors: string[] = [];
  const base = {
    semantic: { primaryIntent: 'میخوام', entities: [{ domain: 'category', value: 'لپ تاپ', confidence: 0.9, decided: true }] },
  };

  const validCno = emptyCno({
    ...base,
    claims: [claim('category', 'A', 'accepted', 0.9), claim('location', 'X', 'accepted', 0.9), claim('category', 'B', 'supported', 0.4)],
  });
  const valid = computeReadiness(validCno);
  if (valid.level !== 'valid') errors.push(`valid case: level=${valid.level}, expected valid`);
  if (!valid.publicationReady) errors.push('valid case: publicationReady should be true (both dimensions met)');

  const readyCno = emptyCno({
    ...base,
    claims: [claim('category', 'A', 'accepted', 0.9), claim('location', 'X', 'accepted', 0.9)],
  });
  const ready = computeReadiness(readyCno);
  if (ready.level !== 'ready') errors.push(`ready case: level=${ready.level}, expected ready`);

  return errors;
}

export function runCognitiveStateSelfTest(): { passed: number; failed: string[] } {
  const suites = [
    testAmbiguityRegisterAndQueue,
    testCandidateClaimsPreserved,
    testReadinessIncomplete,
    testReadinessInterpretable,
    testReadinessValidVsReady,
  ];
  const failed = suites.flatMap((fn) => fn());
  return { passed: suites.length - failed.length, failed };
}

const isDirectRun =
  typeof process !== 'undefined' && Boolean(process.argv[1]?.includes('run-cognitive-state-self-test'));

if (isDirectRun) {
  const { passed, failed } = runCognitiveStateSelfTest();
  if (failed.length) {
    console.error('Cognitive state self-test FAILED:\n', failed.join('\n'));
    process.exit(1);
  }
  console.log(`Cognitive state self-test OK: ${passed}/5`);
}
