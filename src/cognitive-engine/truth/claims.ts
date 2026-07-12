/**
 * RFC-002 Part 8 — derives Claims (the platform's interpretation, distinct from raw Evidence
 * and from accepted Truth — §70) from the Decision Engine's output. Preserves competing
 * hypotheses per ADR-034 rather than only keeping the winner: every non-disqualified candidate
 * becomes a Claim; only the Decision Engine's `preferred` one (when unambiguous, or explicitly
 * user-confirmed) is marked 'accepted'. The rest stay 'supported' — live, valid alternatives,
 * not discarded — and business-rule-disqualified candidates become 'archived'.
 *
 * `supersedes` is always null in this v1: real supersession (§77, ADR-036) means comparing
 * against a PRIOR call's claims for the same Need, which needs a persistent Claim store — that's
 * Phase 5's Cognitive State persistence, not something this stateless function can honestly do.
 */
import type { Decision } from '@/cognitive-engine/types/decision';
import type { Claim, ClaimStatus } from '@/cognitive-engine/types/claim';

function claimId(domain: string, candidateId: string): string {
  return `claim:${domain}:${candidateId}`;
}

export function claimsFromDecision(decision: Decision, now: string): Claim[] {
  // RFC-002 ADR-006 — every claim must reference supporting evidence. If grounding never
  // linked any evidence to this domain, there's nothing honest to cite, so no claim is made.
  if (decision.derivedFromEvidenceIds.length === 0) return [];

  return decision.candidates.map((c): Claim => {
    let status: ClaimStatus;
    if (c.disqualifiedByRule) {
      status = 'archived';
    } else if (c.state === 'confirmed' || (c.id === decision.preferred?.id && !decision.requiresClarification)) {
      status = 'accepted';
    } else {
      status = 'supported';
    }
    return {
      id: claimId(decision.domain, c.id),
      field: decision.domain,
      value: c.label,
      status,
      confidence: c.score,
      derivedFromEvidenceIds: decision.derivedFromEvidenceIds,
      supersedes: null,
      createdAt: now,
    };
  });
}

export function claimsFromDecisions(decisions: Decision[], now: string): Claim[] {
  return decisions.flatMap((d) => claimsFromDecision(d, now));
}
