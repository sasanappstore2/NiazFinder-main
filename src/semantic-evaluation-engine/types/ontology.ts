/**
 * Ontology contracts — Semantic Evaluation Engine (SEE) architecture, §2 & §5
 * (`PLAN/semantic-comparator-architecture.md`).
 *
 * `OntologyRelationshipType` is intentionally an OPEN string union, not a closed enum: the
 * Comparator never switches on `type` to decide behavior (it only reads `distance` and
 * `explanationParams` off whatever an `OntologyProvider` returns — see `ontologyRelationshipSchema`
 * below and INV-05/INV-08). The listed literals exist purely for autocomplete/documentation of
 * well-known values; RFC-003 may introduce new ones without any change here.
 *
 * `OntologyRef` deliberately has no `label` field (§5, §8 revision) — human-readable labels are a
 * presentation-layer concern, resolved from `(namespace, id)` at render time in whatever language
 * is needed, not carried through persisted snapshots/reports.
 */
import { z } from 'zod';

export const KNOWN_ONTOLOGY_RELATIONSHIP_TYPES = [
  'identical',
  'parent-of',
  'child-of',
  'sibling',
  'equivalent',
  'alias-of',
  'part-of',
  'located-in',
  'requires',
  'compatible-with',
  'unrelated',
] as const;

/** Open union: known literals for autocomplete, plus any future RFC-003 string value. */
export type OntologyRelationshipType = (typeof KNOWN_ONTOLOGY_RELATIONSHIP_TYPES)[number] | (string & {});

export const ontologyRefSchema = z.object({
  namespace: z.string().min(1),
  id: z.string().min(1),
});
export type OntologyRef = z.infer<typeof ontologyRefSchema>;

export const ontologyRelationshipSchema = z.object({
  type: z.string().min(1),
  /** 0 = identical; larger = more different. The ONLY numeric signal the Comparator reads. */
  distance: z.number().min(0),
  /** True for parent-of/child-of/part-of/requires/located-in — false for symmetric relationships. */
  directional: z.boolean(),
  /**
   * Structured explanation parameters describing WHY this relationship holds — not a pre-rendered
   * string (§8 multilingual finding). A presentation layer turns this into human-readable text.
   * e.g. { kind: 'ontology-ancestor-chain', ancestorId: 'residential-rent' }
   */
  explanationParams: z.record(z.string(), z.unknown()),
});
export type OntologyRelationship = z.infer<typeof ontologyRelationshipSchema>;

/**
 * Injected, never imported by concrete name (INV-05). One implementation per namespace — e.g.
 * `category` today (Step 2), future RFC-003 namespaces (`intent`, `marketplace-entity`, ...)
 * later. The Comparator core holds a `Record<namespace, OntologyProvider>` map; it never imports
 * a specific provider class.
 */
export interface OntologyProvider {
  readonly namespace: string;
  /** Independent version of this provider's underlying data — see `versioning.ts`. */
  readonly version: string;
  relate(a: OntologyRef, b: OntologyRef): OntologyRelationship;
}
