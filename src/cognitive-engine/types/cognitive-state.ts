/**
 * Cognitive State — RFC-002 Part 9. The engine's current semantic understanding of the active
 * Need: accepted claims, live competing hypotheses, unresolved ambiguities, and what's still
 * queued to ask about. Per ADR-037/§80, this is rebuilt from Evidence/Claims — never from raw
 * conversation history or prompt memory.
 *
 * v1 scope note: this models the Interaction-scope snapshot only (§83) — a pure function of the
 * current Evidence/Decisions/Claims, computed fresh each call. Persisting it (Need scope, §88
 * State Recovery) needs a real consumer that must survive e.g. a page refresh; building that
 * storage now, with nothing yet reading it back, would be exactly the kind of speculative
 * plumbing this reference implementation has avoided in every phase so far.
 */
import { z } from 'zod';
import { claimSchema } from './claim';

export const AMBIGUITY_STATUSES = ['unresolved', 'ambiguous'] as const;
export type AmbiguityStatus = (typeof AMBIGUITY_STATUSES)[number];

export const ambiguityCandidateSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  score: z.number().min(0).max(1),
});
export type AmbiguityCandidate = z.infer<typeof ambiguityCandidateSchema>;

export const ambiguityRegisterEntrySchema = z.object({
  domain: z.string().min(1),
  status: z.enum(AMBIGUITY_STATUSES),
  /** Top surviving (non-disqualified) candidates, for showing the user something to pick from. */
  candidates: z.array(ambiguityCandidateSchema),
});
export type AmbiguityRegisterEntry = z.infer<typeof ambiguityRegisterEntrySchema>;

export const clarificationQueueItemSchema = z.object({
  domain: z.string().min(1),
  reason: z.enum(AMBIGUITY_STATUSES),
  /** RFC-002 §95 — clarifications should target blocking conditions; non-blocking ambiguity
   *  can be left unresolved without preventing publication. */
  blocking: z.boolean(),
});
export type ClarificationQueueItem = z.infer<typeof clarificationQueueItemSchema>;

export const cognitiveStateSchema = z.object({
  acceptedClaims: z.array(claimSchema),
  /** RFC-002 §73 — competing hypotheses the engine keeps alive rather than discarding. */
  candidateClaims: z.array(claimSchema),
  ambiguityRegister: z.array(ambiguityRegisterEntrySchema),
  /** Already priority-ordered — blocking/unresolved entries first. See build-cognitive-state.ts. */
  clarificationQueue: z.array(clarificationQueueItemSchema),
});
export type CognitiveState = z.infer<typeof cognitiveStateSchema>;
