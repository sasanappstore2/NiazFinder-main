import type { FieldSchema, ParsedIntent } from '@/contracts/need-intake';
import { toAsciiDigits } from '@/lib/need-intake/extract-property-slots';

/** Whether an intake field is already satisfied from answers or parsed slots. */
export function isIntakeFieldAnswered(
  field: Pick<FieldSchema, 'key'>,
  answers: Record<string, unknown>,
  parsed: ParsedIntent
): boolean {
  const val = answers[field.key];
  if (val !== undefined && val !== null && val !== '') return true;

  const e = parsed.entities ?? {};

  if (field.key === 'dealType' && (answers.dealType || e.dealType)) return true;
  if (field.key === 'propertyKind' && e.propertyKind) return true;
  if (field.key === 'vehicleKind' && e.vehicleKind) return true;
  if (field.key === 'roleType' && e.roleType) return true;
  if (field.key === 'serviceCategory' && e.serviceCategory) return true;

  if (field.key === 'budget' && (parsed.budgetMax || parsed.budgetMin)) return true;
  if (field.key === 'rahnAmount' && parsed.budgetMax && e.dealType?.includes('rahn')) {
    return true;
  }
  if (field.key === 'deposit' && answers.deposit) return true;
  if (field.key === 'monthlyRent' && answers.monthlyRent) return true;

  if (field.key === 'location') {
    if (parsed.locationAmbiguous === true) return false;
    if (answers.location) return true;
    if (parsed.neighborhoodSlug && parsed.city) return true;
    if (parsed.city && e.area) return true;
    if (parsed.city) return true;
  }

  if (field.key === 'rooms' && (answers.rooms || e.rooms)) return true;
  if (field.key === 'areaMin' && (answers.areaMin || e.areaMin)) return true;
  if (field.key === 'areaMax' && (answers.areaMax || e.areaMax)) return true;

  if (field.key === 'areaMin' && (answers.areaMax || e.areaMax) && parsed.rawText) {
    const t = toAsciiDigits(parsed.rawText.toLowerCase());
    if (t.includes('حداکثر') || (t.includes('تا ') && !t.includes('حداقل'))) return true;
  }
  if (field.key === 'areaMax' && (answers.areaMin || e.areaMin) && parsed.rawText) {
    const t = toAsciiDigits(parsed.rawText.toLowerCase());
    if (t.includes('حداقل') && !t.includes('حداکثر')) return true;
  }
  if (field.key === 'yearMin' && (answers.yearMin || e.yearMin)) return true;
  if (field.key === 'yearMax' && (answers.yearMax || e.yearMax)) return true;
  if (field.key === 'familyCount' && answers.familyCount) return true;
  if (field.key === 'amenities' && answers.amenities) return true;
  if (field.key === 'plotWidth' && (answers.plotWidth || e.plotWidth)) return true;
  if (field.key === 'floorMin' && (answers.floorMin != null || e.floorMin)) return true;
  if (field.key === 'floorMax' && (answers.floorMax != null || e.floorMax)) return true;
  if (field.key === 'pricePerMeterMin' && (answers.pricePerMeterMin != null || e.pricePerMeterMin)) {
    return true;
  }
  if (field.key === 'pricePerMeterMax' && (answers.pricePerMeterMax != null || e.pricePerMeterMax)) {
    return true;
  }
  if (field.key === 'deedType' && (answers.deedType || e.deedType)) return true;
  if (field.key === 'guestCount' && (answers.guestCount || e.guestCount)) return true;
  if (field.key === 'nightlyRent' && (answers.nightlyRent != null || e.nightlyRent)) return true;
  if (field.key === 'serviceKind' && (answers.serviceKind || e.serviceKind)) return true;

  if (
    (field.key === 'phone' || field.key === 'contact') &&
    answers._leadPhone
  ) {
    return true;
  }
  if (field.key === 'area' && parsed.city) return true;

  if (field.key === 'productName' && parsed.title && parsed.intentType === 'product_search') {
    const t = parsed.rawText.toLowerCase();
    if (t.length > 4) return true;
  }
  if (field.key === 'serviceType' && parsed.description && parsed.description.length > 12) {
    return true;
  }
  if (field.key === 'jobTitle' && parsed.title && parsed.title.length > 5) {
    return true;
  }

  return false;
}
