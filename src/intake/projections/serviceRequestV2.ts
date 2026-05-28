import type { NeedDraft } from '@/contracts/need-intake';
import type { ProjectionMetadata } from '@/intake/projections/metadata';
import { buildProjectionMetadata } from '@/intake/projections/metadata';
import type { MatchabilityAnalysis } from '@/intake/projections/matchProjection';
import { toMatchProjection } from '@/intake/projections/matchProjection';
import { recordToEntities } from '@/intake/entities/entityRecord';
import { computeCanonicalHash } from '@/intake/legacy/canonical-hash';

export interface ServiceRequestV2 {
  needType: string;
  schemaVersion: number;
  vertical: string;
  category: string;
  city?: string;
  neighborhood?: string;
  entities: Record<string, unknown>;
  completionScore: number;
  matchabilityScore: number;
  canonicalHash: string;
  publishedAt: string;
  projection: ProjectionMetadata;
  matchability: MatchabilityAnalysis;
}

export function toServiceRequestV2(draft: NeedDraft): ServiceRequestV2 {
  const entities = recordToEntities(draft.entities);
  const match = toMatchProjection(draft);
  const core = {
    needType: draft.needType,
    schemaVersion: draft.schemaVersion,
    vertical: draft.vertical,
    category: draft.category,
    city: entities.city ?? undefined,
    neighborhood: entities.neighborhood ?? undefined,
    entities: draft.entities,
    completionScore: draft.completionScore,
    matchabilityScore: draft.matchabilityScore,
  };

  return {
    ...core,
    canonicalHash: computeCanonicalHash(core),
    publishedAt: new Date().toISOString(),
    projection: buildProjectionMetadata(draft, 1),
    matchability: match.analysis,
  };
}
