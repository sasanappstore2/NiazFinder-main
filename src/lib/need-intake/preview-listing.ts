import type { ListingPreview, NeedDraft } from '@/contracts/need-intake';
import { getIntakeMigrationFeatureFlags } from '@/intake/migration/feature-flags';
import { toListingPreview } from '@/intake/projections/listingProjection';
import { composeListingFromDraft } from '@/lib/need-intake/listing-composer';

/** Build listing preview from draft using internal template composer. */
export async function buildListingPreview(
  draft: NeedDraft,
  extras?: string[]
): Promise<ListingPreview> {
  if (getIntakeMigrationFeatureFlags().listingUseCanonical) {
    return toListingPreview(draft, extras);
  }
  const composed = composeListingFromDraft(draft);
  return {
    title: composed.title,
    description: composed.description,
    extras: extras?.length ? extras : undefined,
    budgetMin: draft.parsedIntent.budgetMin,
    budgetMax: draft.parsedIntent.budgetMax,
  };
}
