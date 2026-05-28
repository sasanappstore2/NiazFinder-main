import type { NeedDraft } from '@/contracts/need-intake';
import { recordToEntities } from '@/intake/aggregate/needDraftAggregate';
import type { ProjectionMetadata } from '@/intake/projections/metadata';
import { buildProjectionMetadata } from '@/intake/projections/metadata';

export interface ChatProjection {
  projection: ProjectionMetadata;
  summaryText: string;
  knownFields: string[];
  missingFields: string[];
}

export function toChatProjection(draft: NeedDraft): ChatProjection {
  const entities = recordToEntities(draft.entities);
  const knownFields = Object.entries(entities)
    .filter(([, value]) => value != null && value !== '')
    .map(([key]) => key);

  const missingFields = draft.missingFields.map((f) => f.field);
  const summaryText = [
    entities.category ? `دسته: ${entities.category}` : null,
    entities.city ? `شهر: ${entities.city}` : null,
    entities.neighborhood ? `محله: ${entities.neighborhood}` : null,
    entities.transactionType ? `معامله: ${entities.transactionType}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  return {
    projection: buildProjectionMetadata(draft, 1),
    summaryText,
    knownFields,
    missingFields,
  };
}
