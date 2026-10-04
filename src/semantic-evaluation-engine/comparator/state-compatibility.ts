/**
 * State-compatibility matrix — §2 (`PLAN/semantic-comparator-architecture.md`). Domain-agnostic:
 * this function never looks at `fieldId`, only at the two sides' `SemanticValueState`s (and, for
 * the one case §15/§16 identified, `provenance.rawInputContainsValue`). Exhaustive over the 3
 * effective buckets a field can be in once unknown/not-applicable/contradictory are handled first:
 * missing, ambiguous, or "resolved-family" (resolved/inferred/estimated).
 */
import type { ComparisonStatus, SemanticFieldValue, SemanticValue } from '../types';
import { STATE_REASON_CODES } from '../registry/reason-codes';
import { geoValuesMatch } from './strategies/scalar-geo';

export type StateOutcome =
  | { kind: 'decided'; status: ComparisonStatus; reasonCode: string; reasonParams: Record<string, unknown> }
  | { kind: 'delegate-to-strategy' };

const RESOLVED_FAMILY = new Set(['resolved', 'inferred', 'estimated']);

function decided(status: ComparisonStatus, reasonCode: string, reasonParams: Record<string, unknown> = {}): StateOutcome {
  return { kind: 'decided', status, reasonCode, reasonParams };
}

/**
 * Candidate-membership equality: exact structural identity only (same ontology ref, or a matching
 * geo raw string), deliberately NOT ontology-distance-aware. This answers "was this exact option
 * among those considered," a different, simpler question than "is this option close to one
 * considered" — conflating the two would blur what an `ambiguous-but-plausible` verdict means.
 */
function valuesMatch(a: SemanticValue, b: SemanticValue): boolean {
  if (a.shape === 'scalar-ontology' && b.shape === 'scalar-ontology') {
    return a.ref.namespace === b.ref.namespace && a.ref.id === b.ref.id;
  }
  if (a.shape === 'scalar-geo' && b.shape === 'scalar-geo') {
    return geoValuesMatch(a, b);
  }
  return false;
}

function anyOverlap(candidatesA: SemanticValue[], candidatesB: SemanticValue[]): boolean {
  return candidatesA.some((ca) => candidatesB.some((cb) => valuesMatch(ca, cb)));
}

export function evaluateStateCompatibility(a: SemanticFieldValue, b: SemanticFieldValue): StateOutcome {
  if (a.state === 'unknown' || b.state === 'unknown') {
    return decided('not-comparable', STATE_REASON_CODES.NOT_YET_EVALUATED);
  }
  if (a.state === 'not-applicable' || b.state === 'not-applicable') {
    return decided('not-comparable', STATE_REASON_CODES.SOURCE_NEVER_CONTAINED_VALUE);
  }
  if (a.state === 'contradictory' || b.state === 'contradictory') {
    return decided('contradiction-detected', STATE_REASON_CODES.CONTRADICTORY_EVIDENCE);
  }

  if (a.state === 'missing' && b.state === 'missing') {
    return decided('match', STATE_REASON_CODES.BOTH_MISSING);
  }

  const missingSide = a.state === 'missing' ? a : b.state === 'missing' ? b : null;
  if (missingSide) {
    const otherSide = missingSide === a ? b : a;
    if (RESOLVED_FAMILY.has(otherSide.state)) {
      // §15/§16 — the not-applicable reclassification, realized here using the resolved side's
      // own self-reported provenance flag, never by reaching into the other side's raw input.
      if (otherSide.provenance.rawInputContainsValue === false) {
        return decided('not-comparable', STATE_REASON_CODES.SOURCE_NEVER_CONTAINED_VALUE, {
          resolvedSourceSystem: otherSide.provenance.sourceSystem,
          missingSourceSystem: missingSide.provenance.sourceSystem,
        });
      }
      return decided('mismatch', STATE_REASON_CODES.ONE_SIDE_MISSING);
    }
    // otherSide.state === 'ambiguous'
    return decided('mismatch', STATE_REASON_CODES.AMBIGUOUS_VS_MISSING);
  }

  if (a.state === 'ambiguous' && b.state === 'ambiguous') {
    const overlap = anyOverlap(a.candidates ?? [], b.candidates ?? []);
    return overlap
      ? decided('ambiguous-but-plausible', STATE_REASON_CODES.AMBIGUOUS_CANDIDATE_MATCH)
      : decided('mismatch', STATE_REASON_CODES.AMBIGUOUS_CANDIDATE_MISMATCH);
  }

  const ambiguousSide = a.state === 'ambiguous' ? a : b.state === 'ambiguous' ? b : null;
  if (ambiguousSide) {
    const resolvedSide = ambiguousSide === a ? b : a;
    if (resolvedSide.value === null) {
      throw new Error(
        `Contract violation: state="${resolvedSide.state}" (resolved-family) but value=null (fieldId="${resolvedSide.fieldId}", sourceSystem="${resolvedSide.provenance.sourceSystem}")`
      );
    }
    const matched = (ambiguousSide.candidates ?? []).some((c) => valuesMatch(resolvedSide.value as SemanticValue, c));
    return matched
      ? decided('ambiguous-but-plausible', STATE_REASON_CODES.AMBIGUOUS_CANDIDATE_MATCH, { matchedValue: resolvedSide.value })
      : decided('mismatch', STATE_REASON_CODES.AMBIGUOUS_CANDIDATE_MISMATCH);
  }

  // Both sides are resolved-family (resolved/inferred/estimated) -> hand off to the field's own
  // value-shape ComparisonStrategy (the Comparator core calls this next).
  if (a.value === null || b.value === null) {
    throw new Error('Contract violation: resolved-family state with value=null reached the strategy delegation point.');
  }
  return { kind: 'delegate-to-strategy' };
}
