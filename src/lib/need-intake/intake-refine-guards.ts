import { draftHasInferredCity } from '@/lib/need-intake/sync-intake-location-form';
import type { NeedDraft } from '@/contracts/need-intake';

/** Location/refine step: category leaf + city must be set before preview. */
export function hasIntakeRefineBasics(input: {
  categorySlug?: string | null;
  subcategorySlug?: string | null;
  city?: string | null;
  needDraft?: NeedDraft | null;
}): boolean {
  const category = (input.subcategorySlug || input.categorySlug || '').trim();
  const cityOk =
    Boolean((input.city || '').trim()) || draftHasInferredCity(input.needDraft ?? null);
  return Boolean(category && cityOk);
}
