import type { NeedDraft } from '@/contracts/need-intake';
import { patchNeedDraftEntities, recordToEntities } from '@/intake/aggregate/needDraftAggregate';
import { isInIranLatLng } from '@/lib/map/coords';
import { resolveIntakeDefaultPin } from '@/lib/need/resolve-intake-default-pin';

/** Seed lat/lng from city/neighborhood when the draft has no Iran pin yet. */
export function ensureDraftMapPin(draft: NeedDraft, seed?: string): NeedDraft {
  const entities = recordToEntities(draft.entities);
  if (
    entities.lat != null &&
    entities.lng != null &&
    isInIranLatLng(entities.lat, entities.lng)
  ) {
    return draft;
  }
  const pin = resolveIntakeDefaultPin({
    cityName: entities.city,
    citySlug: entities.citySlug,
    neighborhoodName: entities.neighborhood,
    neighborhoodSlug: entities.neighborhoodSlug,
    seed: seed || draft.sourceText,
  });
  if (!pin) return draft;
  return patchNeedDraftEntities(draft, { lat: pin.lat, lng: pin.lng });
}
