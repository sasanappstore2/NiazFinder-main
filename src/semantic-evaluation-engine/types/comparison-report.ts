/**
 * ComparisonReport — Layer 1 (Semantic Comparator) output. SEE architecture §2/§3/§6
 * (`PLAN/semantic-comparator-architecture.md`).
 *
 * Deviation from the architecture doc's illustrative §3 sketch, deliberate: the doc's worked
 * example names the two sides `legacySnapshotId`/`cognitiveSnapshotId`, which bakes today's one
 * use case (shadow comparison) into what is meant to be a permanent, source-agnostic contract
 * (§5's "independent service" requirement, §5's own note that the same Comparator can later
 * compare two engine versions, or a user correction against an original guess — neither of which
 * is "legacy vs cognitive"). This file uses generic `snapshotAId`/`snapshotBId` instead, per
 * INV-06 (the Comparator operates only on semantic contracts, never on the concept of "legacy" or
 * "cognitive" as first-class ideas).
 *
 * Corrected from the v1 draft, carried into v2's §3: `FieldComparisonResult` has NO `weight`
 * field. Weighting is exclusively a Scoring Policy Engine (Layer 2) concern (INV-09). `counts` on
 * `ComparisonReport` are plain, unweighted tallies — not an aggregate drift score.
 */
import { z } from 'zod';
import { ontologyRelationshipSchema } from './ontology';
import { semanticFieldValueSchema } from './semantic-snapshot';
import { comparatorVersionStampSchema } from './versioning';

export const KNOWN_COMPARISON_STATUSES = [
  'match',
  'refinement',
  'semantic-equivalent',
  'ambiguous-but-plausible',
  'contradiction-detected',
  'mismatch',
  'not-comparable',
] as const;
export type ComparisonStatus = (typeof KNOWN_COMPARISON_STATUSES)[number];

/** Open union (like OntologyRelationshipType) — known literals for autocomplete/documentation;
 *  full definitions live in the architecture doc's §2 state-compatibility matrix. New codes may
 *  be added as new strategies/states are introduced, without changing this type. */
export const KNOWN_REASON_CODES = [
  'NOT_YET_EVALUATED',
  'SOURCE_NEVER_CONTAINED_VALUE',
  'CONTRADICTORY_EVIDENCE',
  'BOTH_FOUND_NOTHING',
  'ONE_SIDE_FOUND_NOTHING',
  'AMBIGUOUS_CANDIDATE_MATCH',
  'AMBIGUOUS_CANDIDATE_MISMATCH',
  'ONTOLOGY_IDENTICAL',
  'ONTOLOGY_PARENT_CHILD',
  'ONTOLOGY_SIBLING',
  'ONTOLOGY_EQUIVALENT',
  'ONTOLOGY_UNRELATED',
  'GEO_EXACT_MATCH',
  'GEO_MISMATCH',
] as const;
export type ReasonCode = (typeof KNOWN_REASON_CODES)[number] | (string & {});

export const fieldComparisonResultSchema = z.object({
  fieldId: z.string().min(1),
  status: z.enum(KNOWN_COMPARISON_STATUSES),
  snapshotAValue: semanticFieldValueSchema,
  snapshotBValue: semanticFieldValueSchema,
  relationship: ontologyRelationshipSchema.nullable(),
  reasonCode: z.string().min(1),
  /** Structured, never free-form prose (§8) — a presentation layer renders these into text. */
  reasonParams: z.record(z.string(), z.unknown()),
});
export type FieldComparisonResult = z.infer<typeof fieldComparisonResultSchema>;

export const comparisonReportSchema = z.object({
  reportId: z.string().min(1),
  comparedAt: z.string(),
  snapshotAId: z.string().min(1),
  snapshotBId: z.string().min(1),
  versionStamp: comparatorVersionStampSchema,
  fieldResults: z.array(fieldComparisonResultSchema),
  /** Plain unweighted tallies — NOT an aggregate score. Weighting belongs to Layer 2. */
  counts: z.object({
    comparable: z.number().int().min(0),
    match: z.number().int().min(0),
    refinement: z.number().int().min(0),
    semanticEquivalent: z.number().int().min(0),
    ambiguousButPlausible: z.number().int().min(0),
    contradictionDetected: z.number().int().min(0),
    mismatch: z.number().int().min(0),
    notComparable: z.number().int().min(0),
  }),
});
export type ComparisonReport = z.infer<typeof comparisonReportSchema>;
