import type { EnrichedProperty, NormalizedProperty } from '../types/property';
import type { Result } from '../types/errors';

/** AI enriches extracted data — never crawls. */
export interface AiEnricher {
  readonly enabled: boolean;
  enrich(property: NormalizedProperty): Promise<Result<EnrichedProperty>>;
}
