import type { NeedDraft } from '@/contracts/need-intake';
import { patchNeedDraftEntities, recomputeNeedDraft } from '@/intake/aggregate/needDraftAggregate';
import type { IntakeUserCorrection } from '@/intake/agent/types';

/**
 * Draft layer: apply a single user correction without wiping other AI fields.
 * Returns a new NeedDraft (immutable merge).
 */
export function applyUserCorrectionToDraft(
  draft: NeedDraft,
  correction: IntakeUserCorrection
): NeedDraft {
  const patch: Record<string, unknown> = {
    [correction.fieldKey]: correction.value,
    ...(correction.extras ?? {}),
  };

  // Keep category pair coherent when leaf slug is corrected
  if (
    correction.fieldKey === 'categorySlug' ||
    correction.fieldKey === 'subcategorySlug'
  ) {
    const slug = String(correction.value ?? '').trim();
    if (slug) {
      patch.categorySlug = slug;
      patch.subcategorySlug = slug;
    }
  }

  if (correction.fieldKey === 'city') {
    patch.city = correction.value;
    if (!correction.extras?.citySlug) {
      patch.citySlug = null;
    }
  }

  if (correction.fieldKey === 'neighborhood') {
    patch.neighborhood = correction.value;
    if (!correction.extras?.neighborhoodSlug) {
      patch.neighborhoodSlug = null;
    }
  }

  const patched = patchNeedDraftEntities(draft, patch);
  const recomputed = recomputeNeedDraft(patched);
  // Preserve any extra entity keys that the typed IntakeEntities round-trip drops.
  return {
    ...recomputed,
    entities: {
      ...draft.entities,
      ...recomputed.entities,
      ...patch,
    },
    answers: {
      ...recomputed.answers,
      ...(correction.fieldKey in (recomputed.answers as object)
        ? { [correction.fieldKey]: correction.value }
        : {}),
    },
  };
}
