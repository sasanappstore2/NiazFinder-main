import type { ListingPreview, NeedDraft } from '@/contracts/need-intake';
import { getIntakeMigrationFeatureFlags } from '@/intake/migration/feature-flags';
import { toListingPreview } from '@/intake/projections/listingProjection';
import { composeListingFromDraft } from '@/lib/need-intake/listing-composer';
import { generateListingTitle } from '@/lib/need-intake/generate-listing-title';
import type { ListingTitleSource } from '@/lib/need-intake/generate-listing-title';

export interface BuiltListingPreview extends ListingPreview {
  titleSource?: ListingTitleSource;
}

/** Build listing preview: template description + AI title (Qwen → template). */
export async function buildListingPreview(
  draft: NeedDraft,
  extras?: string[]
): Promise<BuiltListingPreview> {
  const composed = composeListingFromDraft(draft);
  const titleResult = await generateListingTitle(draft, composed.title);

  if (getIntakeMigrationFeatureFlags().listingUseCanonical) {
    const canonical = toListingPreview(draft, extras);
    return {
      title: titleResult.title,
      description: canonical.description || composed.description,
      extras: canonical.extras,
      budgetMin: canonical.budgetMin,
      budgetMax: canonical.budgetMax,
      titleSource: titleResult.source,
    };
  }

  return {
    title: titleResult.title,
    description: composed.description,
    extras: extras?.length ? extras : undefined,
    budgetMin: draft.parsedIntent.budgetMin,
    budgetMax: draft.parsedIntent.budgetMax,
    titleSource: titleResult.source,
  };
}
