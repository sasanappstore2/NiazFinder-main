/**
 * Semantic Evaluation Engine (SEE) — public type contracts.
 *
 * SEE is permanent Cognitive Platform infrastructure (`PLAN/semantic-comparator-architecture.md`),
 * not a Phase-7 utility. Three layers: Semantic Comparator (measurement, this package's core),
 * Scoring Policy Engine (marketplace-specific weighting), Semantic Evaluation Engine (the composed
 * capability). Step 1 of the approved implementation order: contracts only, no behavior yet.
 */
export {
  KNOWN_ONTOLOGY_RELATIONSHIP_TYPES,
  ontologyRefSchema,
  ontologyRelationshipSchema,
  type OntologyRelationshipType,
  type OntologyRef,
  type OntologyRelationship,
  type OntologyProvider,
} from './ontology';

export {
  SEMANTIC_VALUE_STATES,
  VALUELESS_STATES,
  semanticValueSchema,
  type SemanticValueState,
  type SemanticValue,
  type ScalarOntologyValue,
  type ScalarGeoValue,
  type SetValue,
  type RangeValue,
  type GraphValue,
} from './semantic-value';

export {
  comparisonStrategySchema,
  fieldSpecSchema,
  fieldSpecRegistrySchema,
  type ComparisonStrategy,
  type FieldSpec,
  type FieldSpecRegistry,
} from './field-spec';

export {
  semanticFieldValueSchema,
  semanticSnapshotSchema,
  type SemanticFieldValue,
  type SemanticSnapshot,
} from './semantic-snapshot';

export {
  comparatorVersionStampSchema,
  evaluationVersionStampSchema,
  type ComparatorVersionStamp,
  type EvaluationVersionStamp,
} from './versioning';

export {
  KNOWN_COMPARISON_STATUSES,
  KNOWN_REASON_CODES,
  fieldComparisonResultSchema,
  comparisonReportSchema,
  type ComparisonStatus,
  type ReasonCode,
  type FieldComparisonResult,
  type ComparisonReport,
} from './comparison-report';

export {
  policyScopeSchema,
  scoringPolicySchema,
  type PolicyScope,
  type ScoringPolicy,
  type PolicyResolutionContext,
} from './scoring-policy';

export {
  FINAL_EVALUATION_VERDICTS,
  finalEvaluationFieldSchema,
  finalEvaluationSchema,
  type FinalEvaluationVerdict,
  type FinalEvaluationField,
  type FinalEvaluation,
} from './final-evaluation';
