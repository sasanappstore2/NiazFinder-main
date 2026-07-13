/**
 * Phase 4 self-test for the Canonical Need Object + Claims (RFC-002 Parts 7 & 8).
 *
 * Uses synthetic Evidence/Decision input (Phases 1-3 already have their own tests for producing
 * these correctly) plus a real raw-text budget phrase to exercise the actual, unchanged
 * `budget-resolver.ts` reuse. No LLM, no `--conditions=react-server` needed.
 *
 * Run via: npm run test:cognitive-canonical-need
 */
import { buildCanonicalNeedObject } from '@/cognitive-engine/canonical-need/build-canonical-need';
import { canonicalNeedObjectSchema } from '@/cognitive-engine/types/canonical-need';
import type { Evidence } from '@/cognitive-engine/types/evidence';
import type { Decision } from '@/cognitive-engine/types/decision';

const NOW = '2026-07-07T00:00:00.000Z';

function ev(id: string, type: Evidence['type'], value: string, sourceSpan: string): Evidence {
  return { id, type, value, sourceSpan, confidence: 0.9, extractedAt: NOW };
}

function decision(domain: Decision['domain'], overrides: Partial<Decision>): Decision {
  return {
    domain,
    candidates: [],
    preferred: null,
    requiresClarification: true,
    derivedFromEvidenceIds: [],
    ...overrides,
  };
}

function run(): string[] {
  const errors: string[] = [];
  const rawText = 'یه لپ تاپ گیمینگ نو میخوام بخرم تو رشت بودجه تا هشتاد میلیون';

  const evidence: Evidence[] = [
    ev('E1', 'IDENTITY', 'لپ تاپ گیمینگ', 'لپ تاپ گیمینگ'),
    ev('E2', 'ACTION', 'میخوام بخرم', 'میخوام بخرم'),
    ev('E3', 'CONTEXT', 'رشت', 'تو رشت'),
  ];

  const decisions: Decision[] = [
    decision('category', {
      candidates: [
        { id: 'laptop', label: 'لپ تاپ', state: 'preferred', score: 0.88, scoreBreakdown: { evidenceConfidence: 0.9, conflictPenalty: 0.02 }, disqualifiedByRule: null, resolver: 'test' },
      ],
      preferred: { id: 'laptop', label: 'لپ تاپ', state: 'preferred', score: 0.88, scoreBreakdown: { evidenceConfidence: 0.9, conflictPenalty: 0.02 }, disqualifiedByRule: null, resolver: 'test' },
      requiresClarification: false,
      derivedFromEvidenceIds: ['E1'],
    }),
    decision('location', {
      candidates: [
        { id: 'rasht', label: 'رشت', state: 'preferred', score: 0.9, scoreBreakdown: { evidenceConfidence: 0.9, conflictPenalty: 0 }, disqualifiedByRule: null, resolver: 'test' },
      ],
      preferred: { id: 'rasht', label: 'رشت', state: 'preferred', score: 0.9, scoreBreakdown: { evidenceConfidence: 0.9, conflictPenalty: 0 }, disqualifiedByRule: null, resolver: 'test' },
      requiresClarification: false,
      derivedFromEvidenceIds: ['E3'],
    }),
  ];

  const cno = buildCanonicalNeedObject(rawText, evidence, decisions, NOW);

  const structural = canonicalNeedObjectSchema.safeParse(cno);
  if (!structural.success) {
    errors.push(`schema validation failed: ${structural.error.message}`);
  }

  if (cno.constraints.budgetMax !== 80_000_000) {
    errors.push(`budgetMax=${cno.constraints.budgetMax}, expected 80000000`);
  }
  if (cno.semantic.primaryIntent !== 'میخوام بخرم') {
    errors.push(`primaryIntent="${cno.semantic.primaryIntent}", expected "میخوام بخرم"`);
  }
  if (cno.semantic.entities.length !== 2) {
    errors.push(`entities.length=${cno.semantic.entities.length}, expected 2`);
  }
  if (!cno.context.notes.includes('رشت')) {
    errors.push(`context.notes missing "رشت": ${JSON.stringify(cno.context.notes)}`);
  }
  if (cno.claims.length !== 2) {
    errors.push(`claims.length=${cno.claims.length}, expected 2`);
  }
  if (!cno.claims.every((c) => c.status === 'accepted')) {
    errors.push(`expected all claims accepted: ${JSON.stringify(cno.claims.map((c) => c.status))}`);
  }
  const expectedConfidence = (0.88 + 0.9) / 2;
  if (Math.abs(cno.metadata.overallConfidence - expectedConfidence) > 1e-9) {
    errors.push(`overallConfidence=${cno.metadata.overallConfidence}, expected ${expectedConfidence}`);
  }
  if (cno.identity.status !== 'draft') {
    errors.push(`identity.status=${cno.identity.status}, expected draft`);
  }

  // Empty-evidence-linkage domain must not fabricate a claim (ADR-006).
  const noEvidenceDecision = [decision('category', { derivedFromEvidenceIds: [] })];
  const cnoNoEvidence = buildCanonicalNeedObject(rawText, [], noEvidenceDecision, NOW);
  if (cnoNoEvidence.claims.length !== 0) {
    errors.push(`expected no claims when derivedFromEvidenceIds is empty, got ${cnoNoEvidence.claims.length}`);
  }

  return errors;
}

export function runCanonicalNeedSelfTest(): { passed: number; failed: string[] } {
  const failed = run();
  return { passed: failed.length === 0 ? 1 : 0, failed };
}

const isDirectRun =
  typeof process !== 'undefined' && Boolean(process.argv[1]?.includes('run-canonical-need-self-test'));

if (isDirectRun) {
  const { passed, failed } = runCanonicalNeedSelfTest();
  if (failed.length) {
    console.error('Canonical Need Object self-test FAILED:\n', failed.join('\n'));
    process.exit(1);
  }
  console.log(`Canonical Need Object self-test OK: ${passed}/1`);
}
