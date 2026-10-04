/**
 * Claim — RFC-002 Part 8 (Truth, Claims & Provenance).
 *
 * A Claim is the platform's interpretation of one or more Evidence items. Unlike Evidence,
 * a Claim MAY carry business meaning (it's produced by inference/grounding, not by the raw
 * extraction step). Claims are append-only: correcting a claim creates a new Claim that
 * supersedes the old one (ADR-036) — nothing is ever mutated or deleted.
 */
import { z } from 'zod';

/** RFC-002 §72 — claim lifecycle states. Terminal states: Superseded, Archived. */
export const CLAIM_STATUSES = [
  'generated',
  'supported',
  'validated',
  'accepted',
  'superseded',
  'archived',
] as const;

export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const claimSchema = z.object({
  id: z.string().min(1),
  field: z.string().min(1),
  value: z.string(),
  status: z.enum(CLAIM_STATUSES),
  confidence: z.number().min(0).max(1),
  /** RFC-002 §71 — provenance: which evidence produced this claim. */
  derivedFromEvidenceIds: z.array(z.string()).min(1),
  /** Non-empty only when this claim replaces an earlier one for the same field. */
  supersedes: z.string().nullable(),
  createdAt: z.string(),
});

export type Claim = z.infer<typeof claimSchema>;
