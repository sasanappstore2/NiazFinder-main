import {
  normalizeIranMobile as normalizeIranMobileDigits,
  toAsciiDigits,
} from '@/lib/format/digits';

const LEAD_PHONE_KEY = 'needfinder_lead_phone';

export function setLeadPhone(phone: string): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(LEAD_PHONE_KEY, phone.trim());
}

export function getLeadPhone(): string {
  if (typeof sessionStorage === 'undefined') return '';
  return sessionStorage.getItem(LEAD_PHONE_KEY) ?? '';
}

export function clearLeadPhone(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(LEAD_PHONE_KEY);
}

/** Iranian mobile: 09XXXXXXXXX (ASCII) */
export function isValidIranMobile(phone: string): boolean {
  return normalizeIranMobileDigits(phone) != null;
}

export function normalizeIranMobile(phone: string): string {
  return normalizeIranMobileDigits(phone) ?? toAsciiDigits(phone).replace(/\s|-/g, '');
}
