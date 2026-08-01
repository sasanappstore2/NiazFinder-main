import type { ListingPreview, NeedDraft } from '@/contracts/need-intake';
import { CANONICAL_CITIES } from '@/config/locations';
import { recordToEntities } from '@/intake/entities/entityRecord';
import { draftToLegacyPayload } from '@/intake/legacy/draftToLegacyPayload';
import { composeListingFromDraft } from '@/lib/need-intake/listing-composer';
import { toListingPreview } from '@/intake/projections/listingProjection';

export interface LiveListingCopyLike {
  title?: string;
  description?: string;
}

/** Canonical city from entities / legacy projection — not stale answers.location. */
export function authoritativeIntakeCity(draft: NeedDraft): string | undefined {
  const entities = recordToEntities(draft.entities);
  const { parsedIntent: parsed } = draftToLegacyPayload(draft);
  return entities.city?.trim() || parsed.city?.trim() || undefined;
}

/** Title mentions a different canonical city than the draft's authoritative city. */
export function listingTitleConflictsIntakeCity(title: string, city: string): boolean {
  const t = title.trim();
  const c = city.trim();
  if (!t || !c) return false;
  for (const canon of CANONICAL_CITIES) {
    if (canon.title === c) continue;
    if (t.includes(canon.title)) return true;
  }
  return !t.includes(c);
}

function acceptListingTitle(title: string | undefined, draft: NeedDraft): boolean {
  const trimmed = title?.trim();
  if (!trimmed) return false;
  const city = authoritativeIntakeCity(draft);
  if (!city) return true;
  return !listingTitleConflictsIntakeCity(trimmed, city);
}

/** Ephemeral browse preview for details/location before formal preview step. */
export function resolveLiveBrowseListingPreview(
  draft: NeedDraft | null | undefined,
  listingPreview: ListingPreview | null | undefined,
  liveCopy: LiveListingCopyLike | null | undefined
): ListingPreview | null {
  if (!draft) return null;

  if (listingPreview?.title?.trim() && acceptListingTitle(listingPreview.title, draft)) {
    return listingPreview;
  }

  const liveTitle = liveCopy?.title?.trim() ?? '';
  const liveDesc = liveCopy?.description?.trim() ?? '';
  const base = toListingPreview(draft);
  const composed = composeListingFromDraft(draft);
  const title =
    (acceptListingTitle(liveTitle, draft) ? liveTitle : '') ||
    base.title.trim() ||
    composed.title.trim();
  if (!title) return null;

  const description = liveDesc || base.description.trim() || composed.description.trim();
  return {
    title,
    description,
    extras: base.extras,
    budgetMin: base.budgetMin,
    budgetMax: base.budgetMax,
    qualityScore: base.qualityScore,
  };
}
