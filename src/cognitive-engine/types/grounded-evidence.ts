/**
 * GroundedEvidence — RFC-002 Part 4 (Knowledge Resolution & Grounding).
 *
 * Grounding replaces ambiguous language with verified marketplace entities. Per ADR-016,
 * resolvers SHALL retrieve (return ranked candidates); they never decide — that's the
 * Decision Engine's job (Part 5, a later phase). This type is intentionally narrower than
 * "every possible domain": RFC-002 Part 4's own worked examples (§28 Location Resolution,
 * §29 Category Resolution) are both entity-resolution-against-a-knowledge-base tasks.
 * Budget/deal-type extraction (Part 2 Constraint Evidence) is not grounding in this sense —
 * there's no knowledge base of "possible budgets" to retrieve candidates from — so Phase 2
 * scopes grounding to location and category only.
 */
import { z } from 'zod';

export const GROUNDING_DOMAINS = ['location', 'category'] as const;
export type GroundingDomain = (typeof GROUNDING_DOMAINS)[number];

/** Reuses the exact status vocabulary already used by the existing location/category
 *  resolvers in `src/intake/intelligence-engine/` (LocationResolverResult['status'],
 *  CategoryDisambiguationResult method outcomes) rather than inventing a new one. */
export const GROUNDING_STATUSES = ['resolved', 'ambiguous', 'unresolved'] as const;
export type GroundingStatus = (typeof GROUNDING_STATUSES)[number];

export const groundedCandidateSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  confidence: z.number().min(0).max(1),
  /** Which existing resolver produced this candidate — explainability per RFC-002 §33. */
  resolver: z.string().min(1),
});

export type GroundedCandidate = z.infer<typeof groundedCandidateSchema>;

export const groundedEvidenceSchema = z.object({
  domain: z.enum(GROUNDING_DOMAINS),
  status: z.enum(GROUNDING_STATUSES),
  /** Ranked, never a single forced choice — ambiguity is normal (RFC-002 §30). */
  candidates: z.array(groundedCandidateSchema),
  /** Provenance: which Evidence items motivated this grounding lookup. */
  derivedFromEvidenceIds: z.array(z.string()),
});

export type GroundedEvidence = z.infer<typeof groundedEvidenceSchema>;
