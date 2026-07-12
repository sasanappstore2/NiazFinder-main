/**
 * Decision — RFC-002 Part 5 (Cognitive Decision Engine).
 *
 * Candidates compete via a score; the Decision Engine is the ONLY component authorized to
 * promote a candidate toward publication (ADR-018 — the LLM never decides). States per §39:
 * Generated → Supported → Preferred → Confirmed → Published.
 *
 * v1 scoring note (see PLAN/RFC-002.md Part 13 §125 for the full documented target formula):
 * this implementation intentionally scores using ONLY signals that are genuinely computed
 * today — evidence confidence (from Phase 2 Grounding) and inter-candidate conflict. The
 * originally-sketched ontologyMatch/ruleConsistency/contextMatch terms need subsystems that
 * don't exist yet (ontology versioning, cross-field rule checks, Cognitive State — Phases 4-6).
 * Filling them with a fabricated constant would inflate scores with unearned signal, so they're
 * simply not part of the breakdown until something real produces them.
 */
import { z } from 'zod';
import { GROUNDING_DOMAINS } from './grounded-evidence';

export const CANDIDATE_STATES = ['generated', 'supported', 'preferred', 'confirmed', 'published'] as const;
export type CandidateState = (typeof CANDIDATE_STATES)[number];

export const scoreBreakdownSchema = z.object({
  evidenceConfidence: z.number().min(0).max(1),
  conflictPenalty: z.number().min(0).max(1),
});
export type ScoreBreakdown = z.infer<typeof scoreBreakdownSchema>;

export const decidedCandidateSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  state: z.enum(CANDIDATE_STATES),
  score: z.number().min(0).max(1),
  scoreBreakdown: scoreBreakdownSchema,
  /** RFC-002 ADR-020 — set when a business rule invalidates this candidate regardless of score. */
  disqualifiedByRule: z.string().nullable(),
  resolver: z.string().min(1),
});
export type DecidedCandidate = z.infer<typeof decidedCandidateSchema>;

export const decisionSchema = z.object({
  domain: z.enum(GROUNDING_DOMAINS),
  /** Ranked by score, disqualified candidates included but excluded from `preferred`. */
  candidates: z.array(decidedCandidateSchema),
  preferred: decidedCandidateSchema.nullable(),
  /** RFC-002 ADR-019 — true when the top candidate doesn't clearly dominate the runner-up,
   *  or when nothing was eligible at all. Being "preferred" and "needing clarification before
   *  promoting further" are independent per §39 — a candidate can be Preferred while ambiguous. */
  requiresClarification: z.boolean(),
  derivedFromEvidenceIds: z.array(z.string()),
});
export type Decision = z.infer<typeof decisionSchema>;
