/**
 * Canonical Need Object (CNO) — RFC-002 Part 7. The stable semantic contract every downstream
 * service consumes; per ADR-027/ADR-030, no consumer touches raw AI output, and every field has
 * exactly one authoritative owner (§65: Evidence←LLM, Semantic←Inference, Constraints←Rules,
 * Metadata←Platform, Identity←Core Backend).
 *
 * v1 honesty note: several CNO fields require subsystems this reference implementation hasn't
 * built yet. Rather than fabricate them, they're typed as nullable/empty and documented inline
 * per field — see `primaryIntent` and the omission of `budgetMin` below.
 */
import { z } from 'zod';
import { evidenceSchema } from './evidence';
import { claimSchema } from './claim';

/** RFC-002 §64 — Canonical Need lifecycle. Draft is the only state this pipeline currently
 *  reaches on its own; the rest require real persistence/publication wiring from later phases. */
export const CNO_STATUSES = ['draft', 'inferred', 'validated', 'confirmed', 'published', 'archived'] as const;
export type CNOStatus = (typeof CNO_STATUSES)[number];

export const cnoIdentitySchema = z.object({
  needId: z.string().nullable(),
  version: z.number().int().min(1),
  status: z.enum(CNO_STATUSES),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CNOIdentity = z.infer<typeof cnoIdentitySchema>;

export const cnoSemanticEntitySchema = z.object({
  domain: z.string().min(1),
  value: z.string().min(1),
  confidence: z.number().min(0).max(1),
  /** True only when the Decision Engine (Phase 3) actually promoted this to `preferred`/`confirmed` —
   *  a disqualified or non-preferred candidate never reaches the CNO at all. */
  decided: z.boolean(),
});
export type CNOSemanticEntity = z.infer<typeof cnoSemanticEntitySchema>;

export const cnoSemanticSchema = z.object({
  /**
   * RFC-001's Human Need Grammar defines a canonical intent vocabulary (Buy/Sell/Rent/Repair/
   * Replace/Hire/Offer/Learn/RequestService), but no phase so far builds an evidence→intent
   * classifier — Evidence only captures the raw ACTION verb the user used (e.g. "میخوام",
   * "تعمیر"). Until that classifier exists, `primaryIntent` surfaces the first ACTION evidence
   * value verbatim rather than a canonical enum value, and is null when no ACTION evidence
   * exists. Consumers must not treat this as one of RFC-001's canonical intents yet.
   */
  primaryIntent: z.string().nullable(),
  entities: z.array(cnoSemanticEntitySchema),
});
export type CNOSemantic = z.infer<typeof cnoSemanticSchema>;

export const cnoConstraintsSchema = z.object({
  budgetMax: z.number().nullable(),
  /** Not populated: the existing `budget-resolver.ts` this reuses only ever produces a ceiling
   *  (`budgetMax`), never a floor — see the intake-logic-audit finding that real-estate budget
   *  ranges are a known, separate, pre-existing gap. Adding a fabricated `budgetMin` here would
   *  misrepresent that gap as solved. */
  rahnAmount: z.number().nullable(),
  monthlyRent: z.number().nullable(),
  deposit: z.number().nullable(),
});
export type CNOConstraints = z.infer<typeof cnoConstraintsSchema>;

export const cnoContextSchema = z.object({
  /** Verbatim CONTEXT-type Evidence values — no context-classification subsystem exists yet
   *  (would live in Phase 5's Cognitive State work), so this is evidence, not inference. */
  notes: z.array(z.string()),
});
export type CNOContext = z.infer<typeof cnoContextSchema>;

export const cnoMetadataSchema = z.object({
  engineVersion: z.string(),
  /** Mean confidence across accepted Claims; 0 when there are none. */
  overallConfidence: z.number().min(0).max(1),
});
export type CNOMetadata = z.infer<typeof cnoMetadataSchema>;

export const canonicalNeedObjectSchema = z.object({
  identity: cnoIdentitySchema,
  semantic: cnoSemanticSchema,
  constraints: cnoConstraintsSchema,
  context: cnoContextSchema,
  /** Full Phase 1 evidence, kept for traceability (RFC-002 §61 — every semantic conclusion
   *  must reference supporting evidence; nothing here is derived without a paper trail). */
  evidence: z.array(evidenceSchema),
  claims: z.array(claimSchema),
  metadata: cnoMetadataSchema,
});
export type CanonicalNeedObject = z.infer<typeof canonicalNeedObjectSchema>;
