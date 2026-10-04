/**
 * RFC-002 Part 12 §114 — Reference Cognitive Flow, composed end-to-end for the first time:
 * Evidence Extraction → Knowledge Grounding → Decision Engine → Claim Generation (inside CNO
 * assembly) → Canonical Need Object → Cognitive State → Readiness Evaluation.
 *
 * Ordering note vs. the RFC's literal prose (§114 lists "Claim Generation" before "Decision
 * Engine"): in this implementation Claims are derived FROM Decisions (Phase 4's
 * `claimsFromDecisions` — a claim records what the Decision Engine settled on, with provenance).
 * Per ADR-054 ("implementations MAY optimize execution; they SHALL preserve semantic
 * equivalence"), this preserves the same conceptual dependency (grounded evidence → competing
 * hypotheses → an accepted interpretation with provenance) even though the code calls decide
 * before deriving claims, rather than a separate free-standing "claim generation" step.
 *
 * Every phase is reused unchanged here — this file only sequences them. Publication itself is
 * out of scope (real marketplace acceptance, not a pipeline computation).
 */
import { extractEvidenceViaAdapter } from '@/cognitive-engine/adapters/openai-compatible-adapter';
import { groundEvidence } from '@/cognitive-engine/grounding/resolver';
import { makeDecisions } from '@/cognitive-engine/decision/decision-engine';
import { buildCanonicalNeedObject } from '@/cognitive-engine/canonical-need/build-canonical-need';
import { buildCognitiveState } from '@/cognitive-engine/state/build-cognitive-state';
import { computeReadiness } from '@/cognitive-engine/state/compute-readiness';
import type { Evidence } from '@/cognitive-engine/types/evidence';
import type { GroundedEvidence } from '@/cognitive-engine/types/grounded-evidence';
import type { Decision } from '@/cognitive-engine/types/decision';
import type { CanonicalNeedObject } from '@/cognitive-engine/types/canonical-need';
import type { CognitiveState } from '@/cognitive-engine/types/cognitive-state';
import type { Readiness } from '@/cognitive-engine/types/readiness';
import type { Diagnostics } from '@/cognitive-engine/types/diagnostics';
import type { EvidenceProvider } from '@/cognitive-engine/types/cognitive-contract';

export interface CognitivePipelineResult {
  evidence: Evidence[];
  grounded: GroundedEvidence[];
  decisions: Decision[];
  cno: CanonicalNeedObject;
  cognitiveState: CognitiveState;
  readiness: Readiness;
  diagnostics: Diagnostics;
}

export interface RunCognitivePipelineOptions {
  /** RFC-002 ADR-052 — swap providers (real model, mock, a future different LLM) without
   *  touching anything downstream. Defaults to the real local-LLM adapter. */
  evidenceProvider?: EvidenceProvider;
  now?: string;
}

export async function runCognitivePipeline(
  rawText: string,
  opts?: RunCognitivePipelineOptions
): Promise<CognitivePipelineResult | null> {
  const provider = opts?.evidenceProvider ?? extractEvidenceViaAdapter;
  const now = opts?.now ?? new Date().toISOString();

  const contract = await provider(rawText);
  if (!contract) return null;

  const grounded = await groundEvidence(contract.evidence, rawText);
  const decisions = makeDecisions(grounded);
  const cno = buildCanonicalNeedObject(rawText, contract.evidence, decisions, now);
  const cognitiveState = buildCognitiveState(decisions, cno.claims);
  const readiness = computeReadiness(cno);

  return { evidence: contract.evidence, grounded, decisions, cno, cognitiveState, readiness, diagnostics: contract.diagnostics };
}
