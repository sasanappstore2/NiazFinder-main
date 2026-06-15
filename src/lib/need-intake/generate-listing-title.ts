import type { NeedDraft } from '@/contracts/need-intake';
import { resolveDeterministicListingTitle } from '@/lib/need-intake/resolve-listing-title';

export type ListingTitleSource = 'template';

export interface GenerateListingTitleResult {
  title: string;
  source: ListingTitleSource;
  latencyMs: number;
}

/** Template-only listing title (no AI). */
export async function generateListingTitle(
  draft: NeedDraft
): Promise<GenerateListingTitleResult> {
  const started = performance.now();
  return {
    title: resolveDeterministicListingTitle(draft).title,
    source: 'template',
    latencyMs: Math.round(performance.now() - started),
  };
}
