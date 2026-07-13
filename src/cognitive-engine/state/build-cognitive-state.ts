/**
 * RFC-002 Part 9 — builds the Cognitive State from Phase 3's Decisions and Phase 4's Claims.
 * Pure function of current evidence-derived data; no conversation history involved (ADR-037).
 */
import { MANDATORY_DOMAINS } from './mandatory-domains';
import type { Claim } from '@/cognitive-engine/types/claim';
import type { Decision } from '@/cognitive-engine/types/decision';
import type {
  AmbiguityRegisterEntry,
  ClarificationQueueItem,
  CognitiveState,
} from '@/cognitive-engine/types/cognitive-state';

function buildAmbiguityRegister(decisions: Decision[]): AmbiguityRegisterEntry[] {
  return decisions
    .filter((d) => d.requiresClarification)
    .map((d): AmbiguityRegisterEntry => {
      const survivors = d.candidates.filter((c) => !c.disqualifiedByRule);
      return {
        domain: d.domain,
        status: survivors.length > 0 ? 'ambiguous' : 'unresolved',
        candidates: survivors.slice(0, 3).map((c) => ({ id: c.id, label: c.label, score: c.score })),
      };
    });
}

function buildClarificationQueue(register: AmbiguityRegisterEntry[]): ClarificationQueueItem[] {
  // RFC-002 §85 — dependency/severity ordering: nothing-to-work-with (unresolved) before
  // pick-one-of-these (ambiguous), and blocking domains before optional ones within each tier.
  return [...register]
    .map((entry): ClarificationQueueItem => ({
      domain: entry.domain,
      reason: entry.status,
      blocking: MANDATORY_DOMAINS.has(entry.domain),
    }))
    .sort((a, b) => {
      if (a.blocking !== b.blocking) return a.blocking ? -1 : 1;
      if (a.reason !== b.reason) return a.reason === 'unresolved' ? -1 : 1;
      return 0;
    });
}

export function buildCognitiveState(decisions: Decision[], claims: Claim[]): CognitiveState {
  const ambiguityRegister = buildAmbiguityRegister(decisions);
  return {
    acceptedClaims: claims.filter((c) => c.status === 'accepted'),
    candidateClaims: claims.filter((c) => c.status === 'supported'),
    ambiguityRegister,
    clarificationQueue: buildClarificationQueue(ambiguityRegister),
  };
}
