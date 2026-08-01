/**
 * Central Reason Code Registry — §14.7 (`PLAN/semantic-comparator-architecture.md`). The single
 * source of truth for every `reasonCode` the Comparator may ever attach to a `FieldComparisonResult`.
 * INV-14: the Comparator never invents a code inline — every code it emits must resolve here.
 */
import { KNOWN_ONTOLOGY_RELATIONSHIP_TYPES } from '../types/ontology';

export interface ReasonCodeDefinition {
  code: string;
  namespace: 'STATE' | 'ONTOLOGY' | 'SHAPE' | 'SYSTEM' | 'FIELD';
  owner: string;
  introducedAtEngineVersion: string;
  definition: string;
  expectedParams: string[];
  deprecated: boolean;
  deprecatedAt?: string;
  deprecatedReason?: string;
  supersededBy?: string[];
}

/** §14.2 STATE.* — outcomes of the state-compatibility matrix (§2), domain-agnostic by construction. */
export const STATE_REASON_CODES = {
  NOT_YET_EVALUATED: 'STATE.NOT_YET_EVALUATED',
  SOURCE_NEVER_CONTAINED_VALUE: 'STATE.SOURCE_NEVER_CONTAINED_VALUE',
  CONTRADICTORY_EVIDENCE: 'STATE.CONTRADICTORY_EVIDENCE',
  BOTH_MISSING: 'STATE.BOTH_MISSING',
  ONE_SIDE_MISSING: 'STATE.ONE_SIDE_MISSING',
  AMBIGUOUS_VS_MISSING: 'STATE.AMBIGUOUS_VS_MISSING',
  AMBIGUOUS_CANDIDATE_MATCH: 'STATE.AMBIGUOUS_CANDIDATE_MATCH',
  AMBIGUOUS_CANDIDATE_MISMATCH: 'STATE.AMBIGUOUS_CANDIDATE_MISMATCH',
} as const;

/** §14.2 SHAPE.* — outcomes specific to one ComparisonStrategy kind (today: scalar-geo only). */
export const SHAPE_REASON_CODES = {
  GEO_MATCH: 'SHAPE.GEO_MATCH',
  GEO_MISMATCH: 'SHAPE.GEO_MISMATCH',
} as const;

const STATE_DEFINITIONS: ReasonCodeDefinition[] = [
  { code: STATE_REASON_CODES.NOT_YET_EVALUATED, namespace: 'STATE', owner: 'SEE Comparator Core §2', introducedAtEngineVersion: '1.0.0', definition: 'One or both sides has state=unknown, or is absent from its snapshot entirely — no attempt was ever made to evaluate this field.', expectedParams: [], deprecated: false },
  { code: STATE_REASON_CODES.SOURCE_NEVER_CONTAINED_VALUE, namespace: 'STATE', owner: 'SEE Comparator Core §2/§15/§16', introducedAtEngineVersion: '1.0.0', definition: "One side resolved a value; the other side's own raw input structurally never contained it (state=not-applicable, or missing with the resolved side's provenance.rawInputContainsValue=false).", expectedParams: ['resolvedSourceSystem', 'missingSourceSystem'], deprecated: false },
  { code: STATE_REASON_CODES.CONTRADICTORY_EVIDENCE, namespace: 'STATE', owner: 'SEE Comparator Core §2', introducedAtEngineVersion: '1.0.0', definition: 'One or both sides has state=contradictory — conflicting evidence with no basis to prefer either.', expectedParams: [], deprecated: false },
  { code: STATE_REASON_CODES.BOTH_MISSING, namespace: 'STATE', owner: 'SEE Comparator Core §2', introducedAtEngineVersion: '1.0.0', definition: 'Both sides attempted resolution and found nothing.', expectedParams: [], deprecated: false },
  { code: STATE_REASON_CODES.ONE_SIDE_MISSING, namespace: 'STATE', owner: 'SEE Comparator Core §2', introducedAtEngineVersion: '1.0.0', definition: 'One side resolved a value; the other genuinely attempted and found nothing (not a source-absence case).', expectedParams: [], deprecated: false },
  { code: STATE_REASON_CODES.AMBIGUOUS_VS_MISSING, namespace: 'STATE', owner: 'SEE Comparator Core §2', introducedAtEngineVersion: '1.0.0', definition: 'One side has plausible candidates but no committed value; the other found nothing at all.', expectedParams: [], deprecated: false },
  { code: STATE_REASON_CODES.AMBIGUOUS_CANDIDATE_MATCH, namespace: 'STATE', owner: 'SEE Comparator Core §2', introducedAtEngineVersion: '1.0.0', definition: "The other side's resolved value (or an overlapping candidate) appears in this side's plausible candidate set.", expectedParams: ['matchedValue'], deprecated: false },
  { code: STATE_REASON_CODES.AMBIGUOUS_CANDIDATE_MISMATCH, namespace: 'STATE', owner: 'SEE Comparator Core §2', introducedAtEngineVersion: '1.0.0', definition: "Neither side's candidate/value set overlaps the other's.", expectedParams: [], deprecated: false },
];

const SHAPE_DEFINITIONS: ReasonCodeDefinition[] = [
  { code: SHAPE_REASON_CODES.GEO_MATCH, namespace: 'SHAPE', owner: 'SEE Comparator Core — scalar-geo strategy', introducedAtEngineVersion: '1.0.0', definition: "Both sides' raw geo text matched exactly, or one contains the other.", expectedParams: ['aRaw', 'bRaw'], deprecated: false },
  { code: SHAPE_REASON_CODES.GEO_MISMATCH, namespace: 'SHAPE', owner: 'SEE Comparator Core — scalar-geo strategy', introducedAtEngineVersion: '1.0.0', definition: 'Both sides resolved a geo value but the raw text did not match.', expectedParams: ['aRaw', 'bRaw'], deprecated: false },
];

/** §14.7 — ONTOLOGY.* entries are GENERATED from the relationship-type vocabulary, never
 *  hand-authored, so the two vocabularies can never drift out of sync with each other. */
function ontologyCode(type: string): string {
  return `ONTOLOGY.${type.toUpperCase().replace(/-/g, '_')}`;
}

export function ontologyReasonCodeFor(relationshipType: string): string {
  return assertRegisteredReasonCode(ontologyCode(relationshipType));
}

const ONTOLOGY_DEFINITIONS: ReasonCodeDefinition[] = KNOWN_ONTOLOGY_RELATIONSHIP_TYPES.map((type) => ({
  code: ontologyCode(type),
  namespace: 'ONTOLOGY',
  owner: 'RFC-002 OntologyRelationshipType (PLAN/semantic-comparator-architecture.md §2/§14.2)',
  introducedAtEngineVersion: '1.0.0',
  definition: `An OntologyProvider reported a "${type}" relationship between the two sides' resolved values.`,
  expectedParams: ['relationshipType', 'distance'],
  deprecated: false,
}));

export const REASON_CODE_REGISTRY: readonly ReasonCodeDefinition[] = [
  ...STATE_DEFINITIONS,
  ...SHAPE_DEFINITIONS,
  ...ONTOLOGY_DEFINITIONS,
];

const BY_CODE = new Map(REASON_CODE_REGISTRY.map((d) => [d.code, d]));

export function getReasonCodeDefinition(code: string): ReasonCodeDefinition | null {
  return BY_CODE.get(code) ?? null;
}

/** INV-14 enforcement point — throws rather than letting an unregistered string reach a report. */
export function assertRegisteredReasonCode(code: string): string {
  if (!BY_CODE.has(code)) {
    throw new Error(`INV-14 violation: reasonCode "${code}" is not a registered entry in the Reason Code Registry.`);
  }
  return code;
}
