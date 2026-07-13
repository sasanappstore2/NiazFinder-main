/**
 * FieldSpec registry — SEE architecture §1/§3/§9 (`PLAN/semantic-comparator-architecture.md`).
 *
 * Declares, once per semantic field, WHICH value shape it is and (for ontology-backed shapes)
 * which `OntologyProvider` namespace governs its distance. This is the mechanism that lets the
 * Comparator's core loop stay generic (INV-08): extending SEE to a new field is a new `FieldSpec`
 * row, never a new code path.
 *
 * IMPORTANT — corrected from the v1 draft of this architecture: `FieldSpec` carries NO `weight`.
 * Weighting is a business-priority decision and belongs exclusively to the Scoring Policy Engine
 * (`ScoringPolicy.fieldWeights`, keyed by `fieldId`), per INV-09. A `FieldSpec` only describes HOW
 * to compare a field, never how much the difference matters.
 */
import { z } from 'zod';

export type ComparisonStrategy =
  | { kind: 'scalar-ontology'; ontologyNamespace: string }
  | { kind: 'scalar-geo' }
  | { kind: 'set'; itemStrategy: ComparisonStrategy }
  | { kind: 'range' }
  | { kind: 'graph' };

export const comparisonStrategySchema: z.ZodType<ComparisonStrategy> = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('scalar-ontology'), ontologyNamespace: z.string().min(1) }),
  z.object({ kind: z.literal('scalar-geo') }),
  z.object({ kind: z.literal('set'), itemStrategy: z.lazy(() => comparisonStrategySchema) }),
  z.object({ kind: z.literal('range') }),
  z.object({ kind: z.literal('graph') }),
]);

export const fieldSpecSchema = z.object({
  fieldId: z.string().min(1),
  displayName: z.string().min(1),
  strategy: comparisonStrategySchema,
});
export type FieldSpec = z.infer<typeof fieldSpecSchema>;

export const fieldSpecRegistrySchema = z.array(fieldSpecSchema);
export type FieldSpecRegistry = z.infer<typeof fieldSpecRegistrySchema>;
