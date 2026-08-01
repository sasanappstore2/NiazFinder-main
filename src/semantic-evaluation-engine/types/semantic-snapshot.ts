/**
 * SemanticSnapshot — SEE architecture §6/§10 (`PLAN/semantic-comparator-architecture.md`).
 *
 * The ONLY input shape the Comparator (Layer 1) ever accepts, from any source system. Producing a
 * `SemanticSnapshot` from a real system's native output (a `NeedDraft`, a `CognitivePipelineResult`,
 * or any future engine's output) is the job of an adapter living OUTSIDE this module (INV-06) —
 * the Comparator never imports a concrete source type.
 *
 * `fields` is an OPEN list keyed by `fieldId`, not a fixed struct with named properties — this is
 * what lets the field set grow from today's 2 (category, location) toward the ~100-field, five-year
 * scenario without any change to this contract (§9).
 */
import { z } from 'zod';
import { semanticValueSchema } from './semantic-value';
import { SEMANTIC_VALUE_STATES } from './semantic-value';

export const semanticFieldValueSchema = z
  .object({
    fieldId: z.string().min(1),
    state: z.enum(SEMANTIC_VALUE_STATES),
    /** null for unknown/missing/not-applicable (§2's VALUELESS_STATES). */
    value: semanticValueSchema.nullable(),
    /** Populated for `ambiguous` (co-plausible set) and `contradictory` (conflicting set). */
    candidates: z.array(semanticValueSchema).optional(),
    /**
     * Must already be on [0,1] when it reaches this schema. Corrected from an earlier draft of
     * this comment (Step 3 finding): adapters do NOT defensively rescale/clamp a source value to
     * fit — silently rescaling is itself a repair, exactly the "Anti-Corruption Layer must never
     * repair data" rule Step 3 imposed, and is structurally how the original confidence-scale bug
     * (a 0-100 score silently clamped by `clamp01` into a false-maximum 1.0) went undetected. This
     * Zod bound is the intended enforcement: an adapter passing through an out-of-range value MUST
     * fail loudly here, not be quietly absorbed into range by the adapter itself.
     */
    confidence: z.number().min(0).max(1).nullable(),
    provenance: z.object({
      sourceSystem: z.string().min(1),
      evidenceRefs: z.array(z.string()),
      derivation: z.enum(['direct', 'inferred', 'estimated']),
      /**
       * Populated ONLY when a literal, single-object substring check ("does my own raw input
       * contain this resolved value's raw text") was both meaningful and performed — e.g. the
       * legacy adapter checking `sourceText.includes(city)`. Null otherwise (not every field/state
       * admits this check). Added in Step 3 specifically so the future Comparator (Step 4) can
       * detect the location/sourceText class of bug (`PLAN/phase7-drift-investigation-report.md`)
       * WITHOUT either adapter cross-referencing the other side's data — each side self-reports a
       * fact entirely derivable from its own single input, one-way, no shared state.
       */
      rawInputContainsValue: z.boolean().nullable(),
    }),
  })
  .refine(
    (f) => (['unknown', 'missing', 'not-applicable'] as string[]).includes(f.state) ? f.value === null : true,
    { message: 'value must be null when state is unknown, missing, or not-applicable' }
  );
export type SemanticFieldValue = z.infer<typeof semanticFieldValueSchema>;

export const semanticSnapshotSchema = z.object({
  snapshotId: z.string().min(1),
  sourceSystem: z.string().min(1),
  producedAt: z.string(),
  /** Which SemanticSnapshot schema version this snapshot conforms to — see `versioning.ts`. */
  semanticContractVersion: z.string().min(1),
  fields: z.array(semanticFieldValueSchema),
});
export type SemanticSnapshot = z.infer<typeof semanticSnapshotSchema>;
