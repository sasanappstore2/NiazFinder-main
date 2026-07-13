import type { Result } from '../../types/errors';
import type { EnrichedProperty, NormalizedProperty } from '../domain/property';

export interface IEnrichmentStage {
  readonly enabled: boolean;
  enrich(property: NormalizedProperty): Promise<Result<EnrichedProperty>>;
}
