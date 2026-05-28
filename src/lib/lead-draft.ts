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

/** Iranian mobile: 09XXXXXXXXX */
export function isValidIranMobile(phone: string): boolean {
  const n = phone.replace(/\s|-/g, '');
  return /^09\d{9}$/.test(n);
}

export function normalizeIranMobile(phone: string): string {
  let n = phone.replace(/\s|-/g, '');
  if (n.startsWith('+98')) n = '0' + n.slice(3);
  if (n.startsWith('98') && n.length === 12) n = '0' + n.slice(2);
  return n;
}
