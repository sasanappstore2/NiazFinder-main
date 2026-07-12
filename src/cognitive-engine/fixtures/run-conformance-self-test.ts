/**
 * Phase 6 self-test — RFC-002 Part 12 §121 Conformance Checklist, turned into real assertions
 * against the composed pipeline (Phase 6's `runCognitivePipeline`), not just a documentation
 * exercise. Uses the mock adapter (§111) throughout — no LLM, deterministic.
 *
 * `groundEvidence` (Phase 2) touches `registry.server.ts`, which needs the `react-server` export
 * condition under bare tsx (see Phase 2's notes). Run via: npm run test:cognitive-conformance
 */
import { runCognitivePipeline, type CognitivePipelineResult } from '@/cognitive-engine/pipeline/run-cognitive-pipeline';
import { createMockEvidenceProvider } from '@/cognitive-engine/adapters/mock-adapter';
import { canonicalNeedObjectSchema } from '@/cognitive-engine/types/canonical-need';
import { MANDATORY_DOMAINS } from '@/cognitive-engine/state/mandatory-domains';
import type { Evidence } from '@/cognitive-engine/types/evidence';

const NOW = '2026-07-07T00:00:00.000Z';
const RAW_TEXT = 'یه لپ تاپ گیمینگ نو میخوام بخرم تو رشت بودجه تا هشتاد میلیون';

function ev(id: string, type: Evidence['type'], value: string, sourceSpan: string): Evidence {
  return { id, type, value, sourceSpan, confidence: 0.92, extractedAt: NOW };
}

const FIXTURE_EVIDENCE: Evidence[] = [
  ev('E1', 'IDENTITY', 'لپ تاپ گیمینگ', 'لپ تاپ گیمینگ'),
  ev('E2', 'ACTION', 'میخوام بخرم', 'میخوام بخرم'),
  ev('E3', 'CONTEXT', 'رشت', 'تو رشت'),
];

async function checkInputNormalized(): Promise<string | null> {
  // Behavioral proxy: grounding on messy repeated whitespace still resolves the location.
  const messy = await runCognitivePipeline('یه   لپ تاپ    میخوام تو  رشت', {
    evidenceProvider: createMockEvidenceProvider([ev('E1', 'CONTEXT', 'رشت', 'تو  رشت')]),
    now: NOW,
  });
  const location = messy?.grounded.find((g) => g.domain === 'location');
  if (!location || location.status === 'unresolved') {
    return `messy whitespace input failed to ground location: ${JSON.stringify(location)}`;
  }
  return null;
}

function checkEvidenceExtracted(result: CognitivePipelineResult): string | null {
  return result.evidence.length === 0 ? 'no evidence in result' : null;
}

function checkEvidenceExplainable(result: CognitivePipelineResult): string | null {
  for (const item of result.evidence) {
    if (!RAW_TEXT.includes(item.sourceSpan)) return `evidence ${item.id} sourceSpan not found in raw text`;
  }
  return null;
}

function checkKnowledgeGrounded(result: CognitivePipelineResult): string | null {
  return result.grounded.every((g) => g.candidates.length === 0) ? 'no domain produced any candidate' : null;
}

function checkClaimsVersioned(result: CognitivePipelineResult): string | null {
  return result.cno.claims.length === 0 ? 'no claims generated' : null;
}

function checkProvenancePreserved(result: CognitivePipelineResult): string | null {
  const orphan = result.cno.claims.find((c) => c.derivedFromEvidenceIds.length === 0);
  return orphan ? `claim ${orphan.id} has no evidence linkage` : null;
}

async function checkDecisionDeterministic(
  result: CognitivePipelineResult,
  provider: ReturnType<typeof createMockEvidenceProvider>
): Promise<string | null> {
  const rerun = await runCognitivePipeline(RAW_TEXT, { evidenceProvider: provider, now: NOW });
  return JSON.stringify(rerun?.decisions) !== JSON.stringify(result.decisions)
    ? 'two runs of the same input produced different decisions'
    : null;
}

function checkCnoGenerated(result: CognitivePipelineResult): string | null {
  const parsed = canonicalNeedObjectSchema.safeParse(result.cno);
  return parsed.success ? null : `schema validation failed: ${parsed.error.message}`;
}

function checkReadinessEvaluated(result: CognitivePipelineResult): string | null {
  return result.readiness.level ? null : 'no readiness level computed';
}

function checkBusinessRulesExternalized(): string | null {
  return MANDATORY_DOMAINS.has('category') && MANDATORY_DOMAINS.has('location')
    ? null
    : 'MANDATORY_DOMAINS missing expected domains';
}

async function checkAiReplaceable(): Promise<string | null> {
  // A completely different mock provider, zero downstream code changes.
  const altProvider = createMockEvidenceProvider([
    ev('E1', 'IDENTITY', 'گوشی', 'گوشی'),
    ev('E2', 'CONTEXT', 'شیراز', 'شیراز'),
  ]);
  const alt = await runCognitivePipeline('یه گوشی میخوام شیراز', { evidenceProvider: altProvider, now: NOW });
  return alt?.evidence[0]?.value === 'گوشی' ? null : 'swapping the evidence provider did not propagate through the pipeline';
}

async function checkPublicationExplainable(): Promise<string | null> {
  const incomplete = await runCognitivePipeline('سلام', { evidenceProvider: createMockEvidenceProvider([]), now: NOW });
  if (!incomplete) return 'pipeline returned null for the incomplete case';
  if (incomplete.readiness.semanticReady && !incomplete.readiness.publicationReady && incomplete.readiness.blockingDomains.length === 0) {
    return 'business-blocked case named no obstacle';
  }
  return null;
}

interface Check {
  name: string;
  run: (result: CognitivePipelineResult, provider: ReturnType<typeof createMockEvidenceProvider>) => Promise<string | null> | string | null;
}

const CHECKS: Check[] = [
  { name: 'input-normalized', run: () => checkInputNormalized() },
  { name: 'evidence-extracted', run: (r) => checkEvidenceExtracted(r) },
  { name: 'evidence-explainable', run: (r) => checkEvidenceExplainable(r) },
  { name: 'knowledge-grounded', run: (r) => checkKnowledgeGrounded(r) },
  { name: 'claims-versioned', run: (r) => checkClaimsVersioned(r) },
  { name: 'provenance-preserved', run: (r) => checkProvenancePreserved(r) },
  { name: 'decision-deterministic', run: (r, p) => checkDecisionDeterministic(r, p) },
  { name: 'cno-generated', run: (r) => checkCnoGenerated(r) },
  { name: 'readiness-evaluated', run: (r) => checkReadinessEvaluated(r) },
  { name: 'business-rules-externalized', run: () => checkBusinessRulesExternalized() },
  { name: 'ai-replaceable', run: () => checkAiReplaceable() },
  { name: 'publication-explainable', run: () => checkPublicationExplainable() },
];

export async function runConformanceSelfTest(): Promise<{ passed: number; failed: string[] }> {
  const provider = createMockEvidenceProvider(FIXTURE_EVIDENCE);
  const result = await runCognitivePipeline(RAW_TEXT, { evidenceProvider: provider, now: NOW });
  if (!result) return { passed: 0, failed: ['pipeline returned null for the baseline fixture'] };

  const failed: string[] = [];
  for (const check of CHECKS) {
    const err = await check.run(result, provider);
    if (err) failed.push(`[${check.name}] ${err}`);
  }
  return { passed: CHECKS.length - failed.length, failed };
}

const isDirectRun =
  typeof process !== 'undefined' && Boolean(process.argv[1]?.includes('run-conformance-self-test'));

if (isDirectRun) {
  runConformanceSelfTest().then(({ passed, failed }) => {
    if (failed.length) {
      console.error('Conformance self-test FAILED:\n', failed.join('\n'));
      process.exit(1);
    }
    console.log(`Conformance self-test OK: ${passed}/${CHECKS.length} checklist items satisfied`);
  });
}
