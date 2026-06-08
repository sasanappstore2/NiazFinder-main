import type { NeedDraft } from '@/contracts/need-intake';
import { draftToLegacyPayload } from '@/intake/legacy/draftToLegacyPayload';

/** Keys stored in answers but not written to browse-facing dynamicAnswers. */
const SKIP_ANSWER_KEYS = new Set(['_leadPhone']);

/**
 * Flat browse filter keys from draft (legacy answers + entity-derived chips).
 * Browse `/api/requests` matches top-level dynamicAnswers keys like dealType, rooms.
 */
export function flattenDraftAnswersForPublish(draft: NeedDraft): Record<string, unknown> {
  const { answers, parsedIntent } = draftToLegacyPayload(draft);
  const flat: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(answers)) {
    if (SKIP_ANSWER_KEYS.has(key)) continue;
    if (val == null || val === '') continue;
    if (Array.isArray(val) && val.length === 0) continue;
    flat[key] = val;
  }

  const entities = parsedIntent.entities ?? {};
  const fallbacks: Array<[string, string | undefined]> = [
    ['propertyKind', entities.propertyKind],
    ['vehicleKind', entities.vehicleKind],
    ['roleType', entities.roleType],
    ['serviceCategory', entities.serviceCategory],
    ['socialType', entities.socialType],
    ['serviceKind', entities.serviceKind],
    ['brand', entities.brand],
    ['deedType', entities.deedType],
    ['condition', entities.condition],
    ['guestCount', entities.guestCount],
    ['plotWidth', entities.plotWidth],
  ];

  for (const [key, val] of fallbacks) {
    if (flat[key] != null && flat[key] !== '') continue;
    if (val?.trim()) flat[key] = val.trim();
  }

  if (flat.rooms == null && entities.rooms) {
    const n = Number(entities.rooms);
    if (Number.isFinite(n)) flat.rooms = n;
  }
  if (flat.areaMin == null && entities.areaMin) {
    const n = Number(entities.areaMin);
    if (Number.isFinite(n)) flat.areaMin = n;
  }
  if (flat.areaMax == null && entities.areaMax) {
    const n = Number(entities.areaMax);
    if (Number.isFinite(n)) flat.areaMax = n;
  }
  if (flat.floorMin == null && entities.floorMin) {
    const n = Number(entities.floorMin);
    if (Number.isFinite(n)) flat.floorMin = n;
  }
  if (flat.floorMax == null && entities.floorMax) {
    const n = Number(entities.floorMax);
    if (Number.isFinite(n)) flat.floorMax = n;
  }
  if (flat.pricePerMeterMin == null && entities.pricePerMeterMin) {
    const n = Number(entities.pricePerMeterMin);
    if (Number.isFinite(n)) flat.pricePerMeterMin = n;
  }
  if (flat.pricePerMeterMax == null && entities.pricePerMeterMax) {
    const n = Number(entities.pricePerMeterMax);
    if (Number.isFinite(n)) flat.pricePerMeterMax = n;
  }
  if (flat.deposit == null && entities.deposit) {
    const n = Number(entities.deposit);
    if (Number.isFinite(n)) flat.deposit = n;
  }
  if (flat.monthlyRent == null && entities.monthlyRent) {
    const n = Number(entities.monthlyRent);
    if (Number.isFinite(n)) flat.monthlyRent = n;
  }
  if (flat.rahnAmount == null && entities.rahnAmount) {
    const n = Number(entities.rahnAmount);
    if (Number.isFinite(n)) flat.rahnAmount = n;
  }
  if (flat.nightlyRent == null && entities.nightlyRent) {
    const n = Number(entities.nightlyRent);
    if (Number.isFinite(n)) flat.nightlyRent = n;
  }

  return flat;
}
