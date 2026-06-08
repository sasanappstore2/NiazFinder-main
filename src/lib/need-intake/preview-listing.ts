import type { ListingPreview, NeedDraft } from '@/contracts/need-intake';
import { getIntakeMigrationFeatureFlags } from '@/intake/migration/feature-flags';
import { toListingPreview } from '@/intake/projections/listingProjection';
import { generateListingCopy } from '@/lib/need-intake/generate-listing-copy';
import type { ListingTitleSource } from '@/lib/need-intake/generate-listing-title';

export interface BuiltListingPreview extends ListingPreview {
  titleSource?: ListingTitleSource;
  descriptionSource?: 'qwen' | 'template';
}

/** Build listing preview: rules baseline + AI copy (title + description). */
export async function buildListingPreview(
  draft: NeedDraft,
  extras?: string[]
): Promise<BuiltListingPreview> {
  const copy = await generateListingCopy(draft);

  if (getIntakeMigrationFeatureFlags().listingUseCanonical) {
    const canonical = toListingPreview(draft, extras);
    return {
      title: copy.title,
      description: copy.description || canonical.description,
      extras: canonical.extras,
      budgetMin: canonical.budgetMin,
      budgetMax: canonical.budgetMax,
      titleSource: copy.titleSource,
      descriptionSource: copy.descriptionSource,
    };
  }

  return {
    title: copy.title,
    description: copy.description,
    extras: extras?.length ? extras : undefined,
    budgetMin: draft.parsedIntent.budgetMin,
    budgetMax: draft.parsedIntent.budgetMax,
    titleSource: copy.titleSource,
    descriptionSource: copy.descriptionSource,
  };
}
