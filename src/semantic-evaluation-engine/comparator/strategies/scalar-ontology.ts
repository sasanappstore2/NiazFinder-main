/**
 * scalar-ontology comparison strategy — §2/§3/§14.2 (`PLAN/semantic-comparator-architecture.md`).
 *
 * Status is derived from `relationship.type`, NOT from `relationship.distance` alone — Step 2's
 * CategoryOntologyProvider documents a deliberate numeric collision (a 2-hop ancestor and a true
 * sibling can both report `distance: 2`); only `type` reliably tells them apart, which is exactly
 * why the Comparator switches on it here rather than on the raw number. `distance` remains
 * available in `reasonParams` for the Scoring Policy Engine (Layer 2) to weight later.
 */
import type { ComparisonStatus, OntologyProvider, OntologyRef } from '../../types';
import { ontologyReasonCodeFor } from '../../registry/reason-codes';
import type { StrategyOutcome } from './types';

/**
 * Conservative, explicitly-provisional mapping for relationship types no shipped OntologyProvider
 * produces yet (part-of/located-in/requires/compatible-with are RFC-003-future). Bucketed as
 * `ambiguous-but-plausible` — neither a confident match nor a confident mismatch — rather than
 * fabricating false precision for a relationship no real provider has ever actually returned.
 * Revisit once a real RFC-003 provider uses one of these.
 */
const STATUS_BY_RELATIONSHIP_TYPE: Record<string, ComparisonStatus> = {
  identical: 'match',
  'parent-of': 'refinement',
  'child-of': 'refinement',
  equivalent: 'semantic-equivalent',
  'alias-of': 'semantic-equivalent',
  sibling: 'ambiguous-but-plausible',
  'part-of': 'ambiguous-but-plausible',
  'located-in': 'ambiguous-but-plausible',
  requires: 'ambiguous-but-plausible',
  'compatible-with': 'ambiguous-but-plausible',
  unrelated: 'mismatch',
};

export function compareScalarOntology(refA: OntologyRef, refB: OntologyRef, provider: OntologyProvider): StrategyOutcome {
  const relationship = provider.relate(refA, refB);
  const status = STATUS_BY_RELATIONSHIP_TYPE[relationship.type] ?? 'mismatch';
  return {
    status,
    relationship,
    reasonCode: ontologyReasonCodeFor(relationship.type),
    reasonParams: { ...relationship.explanationParams, relationshipType: relationship.type, distance: relationship.distance },
  };
}
