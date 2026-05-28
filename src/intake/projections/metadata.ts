import type { NeedDraft } from '@/contracts/need-intake';

export interface ProjectionMetadata {
  sourceNeedType: string;
  sourceSchemaVersion: number;
  generatedAt: string;
  projectionVersion: number;
}

export function buildProjectionMetadata(
  draft: NeedDraft,
  projectionVersion = 1
): ProjectionMetadata {
  return {
    sourceNeedType: draft.needType,
    sourceSchemaVersion: draft.schemaVersion,
    generatedAt: new Date().toISOString(),
    projectionVersion,
  };
}
