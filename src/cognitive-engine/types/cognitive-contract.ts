/**
 * Cognitive Contract — RFC-002 Part 11 §104. The one stable shape every AI adapter returns,
 * regardless of provider. Business code depends only on this; it never sees provider-specific
 * response formats (ADR-048/ADR-050).
 *
 * Interpretation note on §104's wording: the RFC lists "Evidence, Claims, Confidence,
 * Diagnostics" as the conceptual contents. In this reference implementation, Claims are always
 * derived downstream from Decisions (Phase 4's `claimsFromDecisions`) — the AI adapter itself
 * never emits a Claim object, matching ADR-018 ("the LLM's responsibility ends after evidence
 * extraction"). "Confidence" is represented per-item on each Evidence entry, not as a separate
 * top-level field. Adding a redundant top-level `claims`/`confidence` field here that just
 * duplicates or fakes that information would satisfy the RFC's prose without adding real
 * signal, so this type only contains what an adapter genuinely, honestly produces:
 * Evidence + Diagnostics.
 */
import type { Evidence } from './evidence';
import type { Diagnostics } from './diagnostics';

export interface CognitiveContract {
  evidence: Evidence[];
  diagnostics: Diagnostics;
}

/** RFC-002 §111 — any function matching this signature can serve as an Evidence provider,
 *  whether it calls a real model or returns canned data. The pipeline (Phase 6) depends only
 *  on this shape, never on which provider implements it (ADR-052). */
export type EvidenceProvider = (rawText: string) => Promise<CognitiveContract | null>;
