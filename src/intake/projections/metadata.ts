import type { NeedDraft } from '@/contracts/need-intake';
import { resolveTemplateFromDraftEntities } from '@/intake/template/resolveTemplate';
import { recordToEntities } from '@/intake/entities/entityRecord';

export interface ProjectionMetadata {
  sourceTemplateId: string;
  sourceTemplateVersion: number;
  sourceRootSlug: string;
  generatedAt: string;
  projectionVersion: number;
}

export function buildProjectionMetadata(
  draft: NeedDraft,
  projectionVersion = 1
): ProjectionMetadata {
  const template = resolveTemplateFromDraftEntities(recordToEntities(draft.entities));
  return {
    sourceTemplateId: draft.templateId,
    sourceTemplateVersion: draft.templateVersion,
    sourceRootSlug: template.rootSlug,
    generatedAt: new Date().toISOString(),
    projectionVersion,
  };
}
