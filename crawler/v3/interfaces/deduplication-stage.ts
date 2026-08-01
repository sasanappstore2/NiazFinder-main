import type { DedupeMatch, DedupeSignal } from '../../interfaces/dedupe';
import type { EnrichedProperty, NormalizedProperty } from '../domain/property';

export type { DedupeSignal };

export interface IDeduplicationStage {
  check(property: NormalizedProperty): Promise<DedupeMatch | null>;
  register(property: EnrichedProperty): Promise<void>;
}
