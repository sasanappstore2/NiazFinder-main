import type { ComparisonStatus, OntologyRelationship } from '../../types';

export interface StrategyOutcome {
  status: ComparisonStatus;
  relationship: OntologyRelationship | null;
  reasonCode: string;
  reasonParams: Record<string, unknown>;
}
