/**
 * RFC-002 Part 5 — Cognitive Decision Engine. Takes GroundedEvidence (Phase 2's ranked
 * candidates) and decides which one is Preferred, whether clarification is needed, and
 * whether a business rule or an explicit user confirmation should override the statistics.
 *
 * Per ADR-018, this is the only place a candidate gets promoted — never the LLM, never a
 * resolver. Per ADR-020/ADR-021, business rules and user confirmation both outrank score.
 */
import type { GroundedCandidate, GroundedEvidence } from '@/cognitive-engine/types/grounded-evidence';
import type { CandidateState, DecidedCandidate, Decision } from '@/cognitive-engine/types/decision';

/** RFC-002 §30 — same "clear winner" gap concept as Phase 2's grounding ambiguity check. */
const CLEAR_WINNER_GAP = 0.15;

/**
 * Generic [0,1] clamp — used both for candidate confidence AND for the unrelated `conflictPenalty`
 * intermediate below, which LEGITIMATELY computes negative values whenever the top candidate
 * clearly dominates (e.g. `CLEAR_WINNER_GAP - bigGap` is meant to go negative, clamping to "no
 * penalty"). Deliberately has NO validation/warning here — that would fire on this normal,
 * expected case. Confidence-specific validation lives in `assertUnitConfidence` below, checked at
 * the one point where a candidate's OWN reported confidence is read, not on arithmetic derived
 * from it.
 */
function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Confidence-normalization audit: after the fix at the actual source (`location-lre-bridge.ts`'s
 * `toUnitConfidence`, and `grounding/resolver.ts`'s `keepIfUnitConfidence` filtering out any
 * survivor), no `GroundedCandidate.confidence` reaching this function should ever be outside
 * [0,1]. A value that's out of range here is a regression, not a display quirk — "invalid
 * confidence must be visible" means this must be loud, never silently absorbed, which is exactly
 * how the original scale bug (a 0-100 score silently clamped to a false-maximum 1.0) went
 * undetected.
 */
function assertUnitConfidence(candidate: GroundedCandidate): number {
  if (Number.isFinite(candidate.confidence) && candidate.confidence >= 0 && candidate.confidence <= 1) {
    return candidate.confidence;
  }
  console.error(
    `[cognitive-engine-decision] INVALID CONFIDENCE: resolver="${candidate.resolver}" id="${candidate.id}" confidence=${candidate.confidence} is outside [0,1] — treating as a regression. Clamping for this decision only, not fixing the source.`
  );
  return clamp01(candidate.confidence);
}

function scoreCandidates(candidates: GroundedCandidate[]): DecidedCandidate[] {
  const sorted = [...candidates]
    .map((c) => ({ ...c, confidence: assertUnitConfidence(c) }))
    .sort((a, b) => b.confidence - a.confidence);

  // Conflict penalty is a single decision-level scalar (how close the top two are), applied
  // multiplicatively to every candidate's own confidence. Applying it uniformly — rather than
  // only discounting the top candidate — guarantees it can never flip the ranking: scaling
  // every score by the same factor preserves relative order while still satisfying RFC-002
  // §38's required property that "conflicts decrease score". A first implementation subtracted
  // the penalty from the top candidate alone, which could make a narrowly-trailing runner-up
  // outscore it — nonsensical (more ambiguity shouldn't promote the second-best option).
  const [top, runnerUp] = sorted;
  const conflictPenalty = top && runnerUp ? clamp01(CLEAR_WINNER_GAP - (top.confidence - runnerUp.confidence)) : 0;

  return sorted.map((c): DecidedCandidate => ({
    id: c.id,
    label: c.label,
    // Already passed Grounding's knowledge validation (RFC-002 Part 4) by construction —
    // there's no separate pre-grounding "Generated" candidate pool in this pipeline (v1).
    state: 'supported',
    score: clamp01(c.confidence * (1 - conflictPenalty)),
    scoreBreakdown: { evidenceConfidence: c.confidence, conflictPenalty },
    disqualifiedByRule: null,
    resolver: c.resolver,
  }));
}

export interface DecideOptions {
  /** RFC-002 ADR-020 — ids invalidated by a business rule regardless of score. */
  invalidatedIds?: string[];
  /** RFC-002 ADR-021 / ADR-035 — explicit user confirmation outranks probabilistic inference. */
  userConfirmedId?: string;
}

function withState(candidates: DecidedCandidate[], id: string, state: CandidateState): DecidedCandidate[] {
  return candidates.map((c) => (c.id === id ? { ...c, state } : c));
}

export function decideCandidates(grounded: GroundedEvidence, opts?: DecideOptions): Decision {
  let decided = scoreCandidates(grounded.candidates);

  if (opts?.invalidatedIds?.length) {
    const invalid = new Set(opts.invalidatedIds);
    decided = decided.map((c) =>
      invalid.has(c.id) ? { ...c, score: 0, disqualifiedByRule: 'business-rule' } : c
    );
  }
  decided = [...decided].sort((a, b) => b.score - a.score);

  if (opts?.userConfirmedId) {
    const confirmedId = opts.userConfirmedId;
    decided = decided.map((c) =>
      c.id === confirmedId
        ? { ...c, state: 'confirmed', score: 1, disqualifiedByRule: null }
        : c
    );
    const preferred = decided.find((c) => c.id === confirmedId) ?? null;
    return {
      domain: grounded.domain,
      candidates: decided,
      preferred,
      requiresClarification: false,
      derivedFromEvidenceIds: grounded.derivedFromEvidenceIds,
    };
  }

  const eligible = decided.filter((c) => c.disqualifiedByRule == null);
  const top = eligible[0] ?? null;
  const runnerUp = eligible[1];

  if (top) decided = withState(decided, top.id, 'preferred');

  // ADR-019 — a candidate can be Preferred while still needing clarification before promoting
  // further; premature certainty (treating a narrow win as decisive) is an architectural defect.
  const requiresClarification = !top || (runnerUp != null && top.score - runnerUp.score < CLEAR_WINNER_GAP);

  return {
    domain: grounded.domain,
    candidates: decided,
    preferred: top ? (decided.find((c) => c.id === top.id) ?? null) : null,
    requiresClarification,
    derivedFromEvidenceIds: grounded.derivedFromEvidenceIds,
  };
}

export function makeDecisions(
  groundedList: GroundedEvidence[],
  optsByDomain?: Partial<Record<GroundedEvidence['domain'], DecideOptions>>
): Decision[] {
  return groundedList.map((g) => decideCandidates(g, optsByDomain?.[g.domain]));
}
