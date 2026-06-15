import { normalizeIntakeText } from '@/lib/need-intake/normalize-intake-text';

/** Tenant budget: paying rent, not offering property. */
export function isTenantRentBudgetPhrase(text: string): boolean {
  const t = normalizeIntakeText(text);
  if (!t.includes('\u0627\u062C\u0627\u0631\u0647 \u0628\u062F\u0645')) return false;
  if (
    t.includes('\u0627\u062C\u0627\u0631\u0647 \u062F\u0627\u062F\u0646') ||
    t.includes('\u0627\u062C\u0627\u0631\u0647 \u062F\u0627\u062F\u0646\u06CC')
  ) {
    return false;
  }
  const tenantPay =
    /\u0645\u06CC\u062A\u0648\u0646\u0645|\u0645\u06CC\u200C\u062A\u0648\u0646\u0645|\u0645\u06CC\u062A\u0648\u0627\u0646\u0645|\u062A\u0648\u0627\u0646\u0645|\u062F\u0627\u0631\u0645|\u067E\u0631\u062F\u0627\u062E\u062A|\u0628\u0648\u062F\u062C\u0647|\u0645\u06CC\s*\u062F\u0645/u.test(
      t
    ) || /\d+\s*\u0645\u06CC\u0644\u06CC\u0648\u0646/u.test(t);
  return tenantPay;
}

/** Landlord listing: offering property for rent. */
export function isLandlordRentOfferPhrase(text: string): boolean {
  const t = normalizeIntakeText(text);
  if (isTenantRentBudgetPhrase(t)) return false;
  if (
    t.includes('\u0627\u062C\u0627\u0631\u0647 \u062F\u0627\u062F\u0646') ||
    t.includes('\u0627\u062C\u0627\u0631\u0647 \u062F\u0627\u062F\u0646\u06CC')
  ) {
    return true;
  }
  if (
    /\u0627\u062C\u0627\u0631\u0647\s*\u0645\u06CC[\s\u200C]?\u062F\u0645|\u0627\u062C\u0627\u0631\u0647\s*\u0645\u06CC\u062F\u0645/u.test(
      t
    )
  ) {
    return true;
  }
  if (t.includes('\u0627\u062C\u0627\u0631\u0647 \u0628\u062F\u0645')) return true;
  if (
    /\u0631\u0647\u0646\s*\u0645\u06CC[\s\u200C]?\u062F\u0645|\u0631\u0647\u0646\s*\u0645\u06CC\u062F\u0645/u.test(t)
  ) {
    return true;
  }
  if (t.includes('\u0631\u0647\u0646 \u0628\u062F\u0645')) return true;
  return false;
}
