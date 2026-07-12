import type { ListingPreview, NeedDraft } from '@/contracts/need-intake';
import { composeListingFromDraft } from '@/lib/need-intake/listing-composer';
import { toPublishCommand } from '@/intake/projections/publishProjection';
import type { ProjectionMetadata } from '@/intake/projections/metadata';
import { buildProjectionMetadata } from '@/intake/projections/metadata';

export interface ListingProjection extends ListingPreview {
  projection: ProjectionMetadata;
}

export function toListingPreview(draft: NeedDraft, extras?: string[]): ListingProjection {
  const publish = toPublishCommand(draft, 'preview', null);
  const composed = composeListingFromDraft(draft);
  const mergedExtras = [...(extras ?? []), ...(draft.listingPreview?.extras ?? [])].filter(Boolean);

  return {
    projection: buildProjectionMetadata(draft, 1),
    title: composed.title || publish.title,
    description: composed.description || publish.description,
    extras: mergedExtras.length > 0 ? mergedExtras : undefined,
    budgetMin: publish.budgetMin,
    budgetMax: publish.budgetMax,
  };
}
