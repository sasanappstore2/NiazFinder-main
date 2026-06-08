import type { NeedDraft } from '@/contracts/need-intake';
import { composeListingFromDraft } from '@/lib/need-intake/listing-composer';
import { buildListingCopyContext } from '@/lib/need-intake/listing-copy-prompt';
import { resolveDeterministicListingTitle } from '@/lib/need-intake/resolve-listing-title';
import type { ListingTitleSource } from '@/lib/need-intake/generate-listing-title';

export interface BaselineListingCopy {
  title: string;
  description: string;
  titleSource: ListingTitleSource;
  descriptionSource: 'template';
}

/** Baseline title + description from rules (instant, no LLM). Safe for client bundles. */
export function buildBaselineListingCopy(draft: NeedDraft): BaselineListingCopy {
  const composed = composeListingFromDraft(draft);
  return {
    title: resolveDeterministicListingTitle(draft).title,
    description: composed.description,
    titleSource: 'template',
    descriptionSource: 'template',
  };
}

/** Lightweight preview while user still fills location/details (no full AI wait). */
export function buildLiveListingCopyHint(draft: NeedDraft): { title: string; description: string } {
  const baseline = buildBaselineListingCopy(draft);
  const ctx = buildListingCopyContext(draft);
  return {
    title: baseline.title,
    description: ctx.detailsText
      ? `${ctx.needText}\n\n${ctx.detailsText}`.slice(0, 500)
      : baseline.description.slice(0, 500),
  };
}
