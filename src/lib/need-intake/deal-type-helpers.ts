/** Shared tenant vs landlord deal-type signals for property intake text. */

import { extractPropertySlotsFromText } from '@/lib/need-intake/extract-property-slots';

export const TENANT_SEEKER_OPENER =
  /(?:^|[\s?])?(?:\u0645\u06CC\s*\u062E\u0648(?:\u0627\u0645|\u0627\u0647\u0645|\u0648\u0627\u0647)|\u0645\u06CC\u062A\u0648\u0646\u0645|\u0645\u06CC\s*\u062A\u0648\u0646\u0645|\u0645\u06CC\s*\u062A\u0648\u0627\u0646\u0645|\u062F\u0646\u0628\u0627\u0644|\u0646\u06CC\u0627\u0632\s*\u062F\u0627\u0631(?:\u0645|\u06CC\u0645)|\u0628\u0647\s*\u062F\u0646\u0628\u0627\u0644|\u0644\u0627\u0632\u0645\s*\u062F\u0627\u0631(?:\u0645|\u06CC\u0645)|\u067E\u0648\u0644\s*\u062F\u0627\u0631(?:\u0645|\u06CC\u0645)|\u0628\u0648\u062F\u062C\u0647\s*\u062F\u0627\u0631(?:\u0645|\u06CC\u0645))/u;

const VADIYEH = '\u0648\u062F\u06CC\u0647\u0647';
const EJARE = '\u0627\u062C\u0627\u0631\u0647';
const RAHN_BEDAM = '\u0631\u0647\u0646 \u0628\u062F\u0645';
const RAHN_MIDAM1 = '\u0631\u0647\u0646 \u0645\u06CC\u200C\u062F\u0645';
const RAHN_MIDAM2 = '\u0631\u0647\u0646 \u0645\u06CC\u062F\u0645';
const RAHN_MIDAM3 = '\u0631\u0647\u0646 \u0645\u06CC \u062F\u0645';
const EJARE_BEDAM = '\u0627\u062C\u0627\u0631\u0647 \u0628\u062F\u0645';
const EJARE_DADAN = '\u0627\u062C\u0627\u0631\u0647 \u062F\u0627\u062F\u0646';
const EJARE_DADANI = '\u0627\u062C\u0627\u0631\u0647 \u062F\u0627\u062F\u0646\u06CC';
const NA_EJARE = '\u0646\u0647 \u0627\u062C\u0627\u0631\u0647';
const EJARE_NADARAM = '\u0627\u062C\u0627\u0631\u0647 \u0646\u062F\u0627\u0631\u0645';

/** True deposit/رهن cue — never treat «رهگیری» or «فرهنگ» as رهن. */
export function textHasRahnSignal(text: string): boolean {
  return /(?<![\u0600-\u06FF])رهن(?!گیری|گ)/u.test(text) || text.includes(VADIYEH);
}

export function textHasRentSignal(text: string): boolean {
  if (text.includes(NA_EJARE) || text.includes(EJARE_NADARAM)) return false;
  return text.includes(EJARE);
}

/** Tenant offering deposit + monthly rent (not landlord listing). */
export function isTenantSeekerRahnEjare(text: string): boolean {
  return (
    textHasRahnSignal(text) &&
    textHasRentSignal(text) &&
    TENANT_SEEKER_OPENER.test(text)
  );
}

/** Both rahn and monthly rent amounts extracted from free text. */
export function hasExplicitRahnAndRentAmounts(text: string): boolean {
  const slots = extractPropertySlotsFromText(text);
  return Boolean(slots.rahnAmount && slots.monthlyRent);
}

const RAHN_AND_EJARE = /\u0631\u0647\u0646\s*\u0648\s*\u0627\u062C\u0627\u0631\u0647/u;

/**
 * Seeker wants deposit + rent: tenant budget, adjacent rahn+ejare phrase, or explicit dual amounts.
 * Excludes pure landlord offers without seeker context.
 */
export function isSeekerRahnEjareDeal(text: string): boolean {
  if (isLandlordOfferRent(text)) return false;
  if (isLandlordOfferRahn(text) && !TENANT_SEEKER_OPENER.test(text)) return false;
  if (RAHN_AND_EJARE.test(text) && textHasRahnSignal(text) && textHasRentSignal(text)) {
    return true;
  }
  if (isTenantSeekerRahnEjare(text)) return true;
  if (
    hasExplicitRahnAndRentAmounts(text) &&
    textHasRahnSignal(text) &&
    textHasRentSignal(text) &&
    TENANT_SEEKER_OPENER.test(text)
  ) {
    return true;
  }
  return false;
}

export function isLandlordOfferRahn(text: string): boolean {
  return (
    text.includes(RAHN_BEDAM) ||
    text.includes(RAHN_MIDAM1) ||
    text.includes(RAHN_MIDAM2) ||
    text.includes(RAHN_MIDAM3)
  );
}

export function isLandlordOfferRent(text: string): boolean {
  return (
    text.includes(EJARE_BEDAM) ||
    text.includes(EJARE_DADAN) ||
    text.includes(EJARE_DADANI)
  );
}
