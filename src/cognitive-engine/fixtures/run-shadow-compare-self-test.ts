/**
 * Phase 7 self-test for the shadow comparator (src/cognitive-engine/shadow/compare-with-legacy.ts).
 * Synthetic NeedDraft + CognitivePipelineResult — no LLM, no DB, no live route touched.
 *
 * Run via: npm run test:cognitive-shadow-compare
 */
import { compareCognitiveEngineResult } from '@/cognitive-engine/shadow/compare-with-legacy';
import type { NeedDraft } from '@/contracts/need-intake';
import type { CognitivePipelineResult } from '@/cognitive-engine/pipeline/run-cognitive-pipeline';
import type { Decision, DecidedCandidate } from '@/cognitive-engine/types/decision';
import type { CanonicalNeedObject } from '@/cognitive-engine/types/canonical-need';
import type { Readiness } from '@/cognitive-engine/types/readiness';

const NOW = '2026-07-07T00:00:00.000Z';

function draft(overrides: Partial<NeedDraft['parsedIntent']>): NeedDraft {
  return {
    templateId: 'electronics',
    templateVersion: 1,
    schemaVersion: 1,
    vertical: 'products',
    category: 'laptop',
    entities: {},
    completionScore: 90,
    matchabilityScore: 0.8,
    completionState: 'READY_TO_PUBLISH',
    sections: [],
    missingFields: [],
    nextQuestion: null,
    sourceText: 'یه لپ تاپ گیمینگ نو میخوام بخرم تو رشت',
    updatedAt: NOW,
    parsedIntent: {
      intentType: 'product_search',
      categorySlug: 'laptop',
      confidence: 0.9,
      entities: {},
      rawText: 'یه لپ تاپ گیمینگ نو میخوام بخرم تو رشت',
      city: 'رشت',
      ...overrides,
    },
    answers: {},
  } as NeedDraft;
}

function candidate(id: string, label: string, score: number): DecidedCandidate {
  return {
    id,
    label,
    state: 'preferred',
    score,
    scoreBreakdown: { evidenceConfidence: score, conflictPenalty: 0 },
    disqualifiedByRule: null,
    resolver: 'test',
  };
}

function decision(domain: Decision['domain'], preferred: DecidedCandidate | null): Decision {
  return {
    domain,
    candidates: preferred ? [preferred] : [],
    preferred,
    requiresClarification: preferred == null,
    derivedFromEvidenceIds: preferred ? ['E1'] : [],
  };
}

function pipelineResult(decisions: Decision[], readiness: Readiness): CognitivePipelineResult {
  const cno: CanonicalNeedObject = {
    identity: { needId: null, version: 1, status: 'draft', createdAt: NOW, updatedAt: NOW },
    semantic: { primaryIntent: null, entities: [] },
    constraints: { budgetMax: null, rahnAmount: null, monthlyRent: null, deposit: null },
    context: { notes: [] },
    evidence: [],
    claims: [],
    metadata: { engineVersion: 'test', overallConfidence: 0 },
  };
  return { evidence: [], grounded: [], decisions, cno, cognitiveState: { acceptedClaims: [], candidateClaims: [], ambiguityRegister: [], clarificationQueue: [] }, readiness, diagnostics: { provider: 'mock', model: 'mock', promptVersion: 'n/a', latencyMs: 0, retryCount: 0, parsingStatus: 'ok' } };
}

const READY: Readiness = { semanticReady: true, businessReady: true, publicationReady: true, level: 'ready', blockingDomains: [] };
const BLOCKED: Readiness = { semanticReady: true, businessReady: false, publicationReady: false, level: 'interpretable', blockingDomains: ['location'] };

function testAgreement(): string[] {
  const errors: string[] = [];
  const result = pipelineResult(
    [decision('category', candidate('laptop', 'لپ تاپ', 0.9)), decision('location', candidate('rasht', 'رشت', 0.9))],
    READY
  );
  const cmp = compareCognitiveEngineResult(draft({ categorySlug: 'laptop', city: 'رشت' }), result);
  if (!cmp.equal) errors.push(`expected agreement, got diffs: ${JSON.stringify(cmp.diffs)}`);
  return errors;
}

function testCategoryDrift(): string[] {
  const errors: string[] = [];
  const result = pipelineResult(
    [decision('category', candidate('smartphone', 'گوشی', 0.9)), decision('location', candidate('rasht', 'رشت', 0.9))],
    READY
  );
  const cmp = compareCognitiveEngineResult(draft({ categorySlug: 'laptop', city: 'رشت' }), result);
  if (cmp.equal) errors.push('expected category drift, got equal=true');
  const catDiff = cmp.diffs.find((d) => d.field === 'categorySlug');
  if (!catDiff || catDiff.legacy !== 'laptop' || catDiff.cognitiveEngine !== 'smartphone') {
    errors.push(`unexpected categorySlug diff: ${JSON.stringify(catDiff)}`);
  }
  return errors;
}

function testLocationWithNeighborhoodStillMatches(): string[] {
  const errors: string[] = [];
  const result = pipelineResult(
    [decision('category', candidate('laptop', 'لپ تاپ', 0.9)), decision('location', candidate('rasht-x', 'محله ایکس, رشت', 0.9))],
    READY
  );
  const cmp = compareCognitiveEngineResult(draft({ categorySlug: 'laptop', city: 'رشت' }), result);
  const locDiff = cmp.diffs.find((d) => d.field === 'location');
  if (locDiff) errors.push(`expected "محله ایکس, رشت" to loosely match legacy city "رشت", got diff: ${JSON.stringify(locDiff)}`);
  return errors;
}

function testReadinessBlockedSurfacesObstacle(): string[] {
  const errors: string[] = [];
  const result = pipelineResult(
    [decision('category', candidate('laptop', 'لپ تاپ', 0.9)), decision('location', null)],
    BLOCKED
  );
  const cmp = compareCognitiveEngineResult(draft({ categorySlug: 'laptop', city: 'رشت' }), result);
  const readinessDiff = cmp.diffs.find((d) => d.field === 'readiness');
  if (!readinessDiff) errors.push('expected a readiness diff when cognitive-engine would have blocked publication');
  return errors;
}

export function runShadowCompareSelfTest(): { passed: number; failed: string[] } {
  const suites = [testAgreement, testCategoryDrift, testLocationWithNeighborhoodStillMatches, testReadinessBlockedSurfacesObstacle];
  const failed = suites.flatMap((fn) => fn());
  return { passed: suites.length - failed.length, failed };
}

const isDirectRun =
  typeof process !== 'undefined' && Boolean(process.argv[1]?.includes('run-shadow-compare-self-test'));

if (isDirectRun) {
  const { passed, failed } = runShadowCompareSelfTest();
  if (failed.length) {
    console.error('Shadow compare self-test FAILED:\n', failed.join('\n'));
    process.exit(1);
  }
  console.log(`Shadow compare self-test OK: ${passed}/4`);
}
