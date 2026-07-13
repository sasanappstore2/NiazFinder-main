/**
 * cognitive-to-snapshot.ts — Step 3 of the approved SEE implementation order
 * (`PLAN/semantic-comparator-architecture.md` §5/§10/§12).
 *
 * Anti-Corruption Layer: translates the Cognitive Engine's `CognitivePipelineResult` into a
 * `SemanticSnapshot`, structurally only — same discipline as `legacy-to-snapshot.ts`. This file
 * imports ONLY `@/cognitive-engine`'s own public output types (never legacy contract types), and
 * `@/semantic-evaluation-engine` never imports this file's *caller* — the dependency only runs one
 * way, from an adapter inward to SEE's own contracts.
 *
 * Deliberately does NOT attempt to distinguish "not-applicable" (source structurally never had the
 * information) from "missing" (attempted, found nothing) on its own. Doing so would require
 * knowing what the OTHER side's raw input contained — a cross-snapshot judgment a pure, one-way,
 * isolated adapter must not make (see Step 3 report, "Adapter Finding #1"). Every empty-candidate
 * result here is honestly `missing`; not-applicable reclassification is a Step 4 Comparator
 * responsibility, using the `rawInputContainsValue` signal `legacy-to-snapshot.ts` already reports
 * on its own side.
 */
import type { CognitivePipelineResult } from '@/cognitive-engine/pipeline/run-cognitive-pipeline';
import type { Decision } from '@/cognitive-engine/types/decision';
import type { SemanticFieldValue, SemanticSnapshot, SemanticValue } from '../types';

export const COGNITIVE_SOURCE_SYSTEM = 'cognitive-engine-v1';
export const SEMANTIC_CONTRACT_VERSION = '1.0.0';

export interface CognitiveToSnapshotOptions {
  snapshotId: string;
  producedAt: string;
}

function ontologyValue(namespace: string, id: string): SemanticValue {
  return { shape: 'scalar-ontology', ref: { namespace, id } };
}

function geoValue(raw: string): SemanticValue {
  // No location ontology provider exists yet (§3's comparator audit deliberately keeps location
  // as string/geo comparison, not ontology-based) — `ref` stays null, exactly as the value shape
  // was designed to allow.
  return { shape: 'scalar-geo', ref: null, raw };
}

/**
 * Plausible-candidate filter: excludes candidates the Decision Engine ITSELF already disqualified
 * via a business rule (`disqualifiedByRule != null`). This is a direct, mechanical translation of
 * a decision the Cognitive Engine already made upstream (Phase 3, ADR-020) — not a new judgment
 * invented by this adapter. In the real pipeline (`run-cognitive-pipeline.ts`) `makeDecisions` is
 * always called with no options, so no candidate is ever disqualified today; this filter exists
 * for correctness the day a business-rule caller is wired in, not because it does anything yet.
 */
function plausibleCandidates(decision: Decision): Decision['candidates'] {
  return decision.candidates.filter((c) => c.disqualifiedByRule == null);
}

function fieldFromDecision(
  fieldId: string,
  decision: Decision | undefined,
  toValue: (id: string, label: string) => SemanticValue
): SemanticFieldValue {
  if (!decision) {
    // No Decision object exists for this domain at all in this result — grounding was never
    // attempted for it (does not happen for category/location in the current pipeline, which
    // always grounds both; kept honest for any future domain this adapter might be asked to map).
    return {
      fieldId,
      state: 'unknown',
      value: null,
      confidence: null,
      provenance: { sourceSystem: COGNITIVE_SOURCE_SYSTEM, evidenceRefs: [], derivation: 'direct', rawInputContainsValue: null },
    };
  }

  const evidenceRefs = decision.derivedFromEvidenceIds;

  if (decision.preferred && !decision.requiresClarification) {
    return {
      fieldId,
      state: 'resolved',
      value: toValue(decision.preferred.id, decision.preferred.label),
      // decision.preferred.score is already clamped to [0,1] by decision-engine.ts's own
      // scoreCandidates() — this adapter passes it through as-is. It deliberately does NOT
      // re-clamp or re-normalize (see Step 3 report, "Adapter Finding #2": defensive rescaling is
      // itself a repair, and is structurally how the original confidence-scale bug went
      // undetected). If this number is ever wrong, it must fail loudly upstream, not be quietly
      // absorbed here.
      confidence: decision.preferred.score,
      provenance: { sourceSystem: COGNITIVE_SOURCE_SYSTEM, evidenceRefs, derivation: 'direct', rawInputContainsValue: null },
    };
  }

  if (decision.preferred && decision.requiresClarification) {
    return {
      fieldId,
      state: 'ambiguous',
      value: null,
      // Known, disclosed loss: `scoreBreakdown` per candidate is discarded here — same
      // per-candidate-confidence gap noted in the legacy adapter (Step 3 report).
      candidates: plausibleCandidates(decision).map((c) => toValue(c.id, c.label)),
      confidence: decision.preferred.score,
      provenance: { sourceSystem: COGNITIVE_SOURCE_SYSTEM, evidenceRefs, derivation: 'direct', rawInputContainsValue: null },
    };
  }

  return {
    fieldId,
    state: 'missing',
    value: null,
    confidence: null,
    provenance: { sourceSystem: COGNITIVE_SOURCE_SYSTEM, evidenceRefs, derivation: 'direct', rawInputContainsValue: null },
  };
}

/** Pure: `result` in, `SemanticSnapshot` out. No side effects, no I/O, no randomness. */
export function cognitiveResultToSemanticSnapshot(
  result: CognitivePipelineResult,
  opts: CognitiveToSnapshotOptions
): SemanticSnapshot {
  const categoryDecision = result.decisions.find((d) => d.domain === 'category');
  const locationDecision = result.decisions.find((d) => d.domain === 'location');

  return {
    snapshotId: opts.snapshotId,
    sourceSystem: COGNITIVE_SOURCE_SYSTEM,
    producedAt: opts.producedAt,
    semanticContractVersion: SEMANTIC_CONTRACT_VERSION,
    fields: [
      fieldFromDecision('category', categoryDecision, (id) => ontologyValue('category', id)),
      fieldFromDecision('location', locationDecision, (_id, label) => geoValue(label)),
    ],
  };
}
