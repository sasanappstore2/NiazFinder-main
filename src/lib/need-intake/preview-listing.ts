import type { ListingPreview, NeedDraft } from '@/contracts/need-intake';
import { composeListingFromDraft } from '@/lib/need-intake/listing-composer';
import { mapDraftToCreateRequest } from '@/lib/need-intake/map-to-request';

function budgetFromDraft(draft: NeedDraft): {
  budgetMin?: number;
  budgetMax?: number;
} {
  const b = draft.answers.budget;
  if (typeof b === 'number') return { budgetMax: b };
  if (typeof b === 'string' && b) {
    const n = Number(String(b).replace(/,/g, ''));
    if (!Number.isNaN(n)) return { budgetMax: n };
  }
  return {
    budgetMin: draft.parsedIntent.budgetMin,
    budgetMax: draft.parsedIntent.budgetMax,
  };
}

/** Build listing preview from draft using internal template composer. */
export async function buildListingPreview(
  draft: NeedDraft,
  extras?: string[]
): Promise<ListingPreview> {
  const mapped = mapDraftToCreateRequest(draft, 'preview', null);
  const composed = composeListingFromDraft(draft);
  const title = composed.title || mapped.title;
  const description = composed.description || mapped.description;

  const budget = budgetFromDraft(draft);
  const mergedExtras = [
    ...(extras ?? []),
    ...(draft.listingPreview?.extras ?? []),
  ].filter(Boolean);

  return {
    title,
    description,
    extras: mergedExtras.length > 0 ? mergedExtras : undefined,
    budgetMin: budget.budgetMin,
    budgetMax: budget.budgetMax,
  };
}
