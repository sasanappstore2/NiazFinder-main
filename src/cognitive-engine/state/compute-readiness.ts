/**
 * RFC-002 Part 10 — computes 3-dimension Readiness from a Canonical Need Object. Confidence
 * never bypasses a missing mandatory domain (ADR-044); the ladder level always names its actual
 * blocking obstacle via `blockingDomains` rather than leaving the caller to guess why.
 */
import { MANDATORY_DOMAINS } from './mandatory-domains';
import type { CanonicalNeedObject } from '@/cognitive-engine/types/canonical-need';
import type { Readiness, ReadinessLevel } from '@/cognitive-engine/types/readiness';

export function computeReadiness(cno: CanonicalNeedObject): Readiness {
  const acceptedDomains = new Set(cno.claims.filter((c) => c.status === 'accepted').map((c) => c.field));

  // Semantic readiness (§91): do we understand the need at all — some action was expressed and
  // at least one entity was actually decided (not just proposed)?
  const semanticReady = cno.semantic.primaryIntent != null && cno.semantic.entities.length > 0;

  const blockingDomains = [...MANDATORY_DOMAINS].filter((d) => !acceptedDomains.has(d));
  const businessReady = blockingDomains.length === 0;
  const publicationReady = semanticReady && businessReady;

  let level: ReadinessLevel;
  if (!semanticReady) {
    level = 'incomplete';
  } else if (!businessReady) {
    level = 'interpretable';
  } else {
    // RFC-002 §92 — Valid vs Ready: business/semantic minimums are both met either way; Ready
    // additionally requires no live competing hypothesis left unresolved (`supported` claims are
    // exactly that — see Part 8 §73 Competing Claims).
    const hasUnresolvedAmbiguity = cno.claims.some((c) => c.status === 'supported');
    level = hasUnresolvedAmbiguity ? 'valid' : 'ready';
  }

  return { semanticReady, businessReady, publicationReady, level, blockingDomains };
}
