/**
 * Semantic value shapes & value states — SEE architecture §1/§2/§9 (`PLAN/semantic-comparator-architecture.md`).
 *
 * Every comparable field, regardless of domain (category, location, intent, secondary objects,
 * relationships, ...), normalizes into exactly one of these five shapes before comparison. The
 * Comparator's core loop is generic over these shapes (INV-08) — adding a new semantic field is a
 * `FieldSpec` registry entry reusing one of these shapes, never new comparator code.
 */
import { z } from 'zod';
import { ontologyRefSchema } from './ontology';

// ---------------------------------------------------------------------------
// SemanticValue — the 5 value shapes (recursive: `set` contains SemanticValue[])
// ---------------------------------------------------------------------------

export interface ScalarOntologyValue {
  shape: 'scalar-ontology';
  ref: z.infer<typeof ontologyRefSchema>;
}

export interface ScalarGeoValue {
  shape: 'scalar-geo';
  ref: z.infer<typeof ontologyRefSchema> | null;
  raw: string;
}

export interface SetValue {
  shape: 'set';
  items: SemanticValue[];
}

export interface RangeValue {
  shape: 'range';
  min: number | null;
  max: number | null;
  unit: string | null;
}

export interface GraphValue {
  shape: 'graph';
  nodes: Array<z.infer<typeof ontologyRefSchema>>;
  edges: Array<{ from: string; to: string; relationshipType: string }>;
}

export type SemanticValue = ScalarOntologyValue | ScalarGeoValue | SetValue | RangeValue | GraphValue;

// Branch schemas are intentionally left with their inferred concrete (ZodObject) types rather than
// widened to `z.ZodType<X>` — `z.discriminatedUnion` needs the literal `shape` key preserved on
// each branch to dispatch correctly; only the recursive edge (`set.items`) is wrapped in `z.lazy`.
const scalarOntologyValueSchema = z.object({
  shape: z.literal('scalar-ontology'),
  ref: ontologyRefSchema,
});

const scalarGeoValueSchema = z.object({
  shape: z.literal('scalar-geo'),
  ref: ontologyRefSchema.nullable(),
  raw: z.string().min(1),
});

const rangeValueSchema = z.object({
  shape: z.literal('range'),
  min: z.number().nullable(),
  max: z.number().nullable(),
  unit: z.string().nullable(),
});

const graphValueSchema = z.object({
  shape: z.literal('graph'),
  nodes: z.array(ontologyRefSchema),
  edges: z.array(
    z.object({ from: z.string().min(1), to: z.string().min(1), relationshipType: z.string().min(1) })
  ),
});

export const semanticValueSchema: z.ZodType<SemanticValue> = z.discriminatedUnion('shape', [
  scalarOntologyValueSchema,
  scalarGeoValueSchema,
  z.object({ shape: z.literal('set'), items: z.array(z.lazy(() => semanticValueSchema)) }),
  rangeValueSchema,
  graphValueSchema,
]);

// ---------------------------------------------------------------------------
// SemanticValueState — SEE architecture §2, the 8-state model
// ---------------------------------------------------------------------------

/**
 * Each state's full definition (meaning / readiness implication / comparison behavior /
 * explainability behavior) is documented in `PLAN/semantic-comparator-architecture.md` §2 — kept
 * there rather than duplicated here so there is exactly one source of truth for the semantics;
 * this file only encodes the closed set of valid states.
 */
export const SEMANTIC_VALUE_STATES = [
  'unknown',
  'missing',
  'not-applicable',
  'contradictory',
  'resolved',
  'inferred',
  'estimated',
  'ambiguous',
] as const;
export type SemanticValueState = (typeof SEMANTIC_VALUE_STATES)[number];

/** States that never carry a `value` (nothing was ever determined). */
export const VALUELESS_STATES: readonly SemanticValueState[] = ['unknown', 'missing', 'not-applicable'];
