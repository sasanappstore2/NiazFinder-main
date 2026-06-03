import type { ParsedIntent } from '@/contracts/need-intake';

/** Pre-fill answers from parser entities + inferred intent. */
export function seedAnswersFromParsed(
  parsed: ParsedIntent,
  leadPhone?: string | null
): Record<string, string | number | boolean | string[]> {
  const answers: Record<string, string | number | boolean | string[]> = {};
  const e = parsed.entities ?? {};

  if (leadPhone?.trim()) {
    answers._leadPhone = leadPhone.trim();
  }

  if (e.dealType) answers.dealType = e.dealType;
  if (e.propertyKind) answers.propertyKind = e.propertyKind;
  if (e.vehicleKind) answers.vehicleKind = e.vehicleKind;
  if (e.roleType) answers.roleType = e.roleType;
  if (e.serviceCategory) answers.serviceCategory = e.serviceCategory;
  if (e.socialType) answers.socialType = e.socialType;
  if (e.projectName) answers.projectName = e.projectName;

  if (e.rooms) answers.rooms = e.rooms;
  if (e.areaMin) answers.areaMin = Number(e.areaMin);
  if (e.areaMax) answers.areaMax = Number(e.areaMax);
  if (e.plotWidth) answers.plotWidth = e.plotWidth;
  if (e.floorMin) answers.floorMin = Number(e.floorMin);
  if (e.floorMax) answers.floorMax = Number(e.floorMax);
  if (e.pricePerMeterMin) answers.pricePerMeterMin = Number(e.pricePerMeterMin);
  if (e.pricePerMeterMax) answers.pricePerMeterMax = Number(e.pricePerMeterMax);
  if (e.deposit) answers.deposit = Number(e.deposit);
  if (e.monthlyRent) answers.monthlyRent = Number(e.monthlyRent);
  if (e.rahnAmount) answers.rahnAmount = Number(e.rahnAmount);
  if (e.nightlyRent) answers.nightlyRent = Number(e.nightlyRent);
  if (e.guestCount) answers.guestCount = e.guestCount;
  if (e.deedType) answers.deedType = e.deedType;
  if (e.serviceKind) answers.serviceKind = e.serviceKind;

  if (parsed.neighborhoodSlug) {
    answers._neighborhoodSlug = parsed.neighborhoodSlug;
  }

  if (e.area && parsed.city && !answers.location) {
    const area = String(e.area).trim();
    const city = parsed.city.trim();
    if (area.length >= 2) {
      answers.location = area === city ? city : `${area}، ${city}`;
    } else if (city) {
      answers.location = city;
    }
  } else if (e.area && !answers.location) {
    const area = String(e.area).trim();
    if (area.length >= 2) answers.location = area;
  } else if (parsed.city && !answers.location) {
    answers.location = parsed.city;
  }

  if (parsed.budgetMax && !answers.budget) answers.budget = parsed.budgetMax;
  if (!answers.rahnAmount && e.rahnAmount) {
    answers.rahnAmount = Number(e.rahnAmount);
  }
  if (
    !answers.rahnAmount &&
    parsed.budgetMax &&
    parsed.budgetMax >= 50_000_000 &&
    (e.dealType === 'rent_rahn_full' || e.dealType === 'rent_rahn_ejare')
  ) {
    answers.rahnAmount = parsed.budgetMax;
  } else if (parsed.budgetMax && e.dealType === 'rent_rahn_full' && !answers.rahnAmount) {
    answers.rahnAmount = parsed.budgetMax;
  }

  if (parsed.intentType === 'property_listing' && !answers.dealType) {
    answers.dealType = 'sell';
  }
  if (parsed.intentType === 'vehicle_listing' && !answers.dealType) {
    answers.dealType = 'sell';
  }
  if (parsed.intentType === 'product_listing' && !answers.dealType) {
    answers.dealType = 'sell';
  }
  if (parsed.intentType === 'property_search' && !answers.dealType && e.dealType) {
    answers.dealType = e.dealType;
  }

  return answers;
}
