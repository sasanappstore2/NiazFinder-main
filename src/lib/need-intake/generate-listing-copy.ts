import 'server-only';

import type { NeedDraft } from '@/contracts/need-intake';
import { composeListingFromDraft } from '@/lib/need-intake/listing-composer';
import { generateListingTitle, type ListingTitleSource } from '@/lib/need-intake/generate-listing-title';

export interface GeneratedListingCopy {
  title: string;
  description: string;
  titleSource: ListingTitleSource;
  descriptionSource: 'template';
}

/** Template-only listing copy (no AI). */
export async function generateListingCopy(draft: NeedDraft): Promise<GeneratedListingCopy> {
  const composed = composeListingFromDraft(draft);
  const titleResult = await generateListingTitle(draft);
  return {
    title: titleResult.title || composed.title,
    description: composed.description,
    titleSource: titleResult.source,
    descriptionSource: 'template',
  };
}
