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

  if (parsed.neighborhoodSlug) {
    answers._neighborhoodSlug = parsed.neighborhoodSlug;
  }

  if (e.area && parsed.city && !answers.location) {
    answers.location = `${e.area}، ${parsed.city}`;
  } else if (e.area && !answers.location) {
    answers.location = String(e.area);
  } else if (parsed.city && !answers.location) {
    answers.location = parsed.city;
  }
  if (parsed.budgetMax && !answers.budget) answers.budget = parsed.budgetMax;
  if (parsed.budgetMax && e.dealType === 'rent_rahn_full' && !answers.rahnAmount) {
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
