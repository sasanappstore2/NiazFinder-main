import type { ListingPreview, NeedDraft } from '@/contracts/need-intake';

const STORAGE_KEY = 'needfinder_pending_intake_publish';

export interface PendingIntakePublish {
  needText: string;
  detailsText: string;
  categorySlug: string;
  subcategorySlug: string;
  city: string;
  neighborhood: string;
  neighborhoodSlug?: string | null;
  listingPreview: ListingPreview;
  linkToBusinessProfile?: boolean;
  /** Serialized needDraft for faithful resume after login. */
  needDraft?: NeedDraft;
}

export function savePendingIntakePublish(payload: PendingIntakePublish): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function loadPendingIntakePublish(): PendingIntakePublish | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingIntakePublish;
  } catch {
    return null;
  }
}

export function clearPendingIntakePublish(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}
