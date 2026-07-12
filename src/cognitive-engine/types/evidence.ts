/**
 * Evidence — RFC-002 Part 2 (Evidence Model & Semantic Inference).
 *
 * An Evidence item is the smallest atomic semantic unit directly justified by user input:
 * atomic, observable, explainable, independently confidence-scored, traceable to source text.
 *
 * Per ADR-005, Evidence SHALL NOT contain business meaning — no category slugs, no intent
 * types, no marketplace decisions. Only what the user actually said (object/property/state/
 * action/constraint/preference/context). Business interpretation happens downstream, in
 * Grounding (Part 4) and the Decision Engine (Part 5), never here.
 */
import { z } from 'zod';

/** RFC-002 §10 — every evidence item belongs to exactly one category. */
export const EVIDENCE_TYPES = [
  'IDENTITY',
  'PROPERTY',
  'STATE',
  'ACTION',
  'CONSTRAINT',
  'PREFERENCE',
  'CONTEXT',
] as const;

export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export const evidenceSchema = z.object({
  id: z.string().min(1),
  type: z.enum(EVIDENCE_TYPES),
  value: z.string().min(1),
  /** Verbatim substring of the normalized source text this evidence was read from. */
  sourceSpan: z.string().min(1),
  /** RFC-002 §13 — confidence belongs to evidence, propagated later, never invented downstream. */
  confidence: z.number().min(0).max(1),
  extractedAt: z.string(),
});

export type Evidence = z.infer<typeof evidenceSchema>;

export const evidenceListSchema = z.array(evidenceSchema);

/**
 * RFC-002 ADR-005 conformance check: an Evidence item must never carry business meaning
 * (a resolved category slug, an intent-type enum value, etc). This is intentionally a
 * narrow, explicit denylist rather than a heuristic — Evidence values are supposed to be
 * short user-facing words/phrases, not internal taxonomy identifiers.
 */
const BUSINESS_VALUE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)+$/;

export function violatesBusinessMeaningRule(evidence: Evidence): boolean {
  return BUSINESS_VALUE_PATTERN.test(evidence.value.trim());
}
