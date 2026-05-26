export function isLeadOutreachEnabled(): boolean {
  const v = process.env.LEAD_OUTREACH_ENABLED;
  if (v === 'false' || v === '0') return false;
  return true;
}

export function getLeadMinMatchScore(): number {
  const n = parseFloat(process.env.LEAD_MIN_MATCH_SCORE ?? '0.65');
  return Number.isFinite(n) ? n : 0.65;
}

export function getLeadDailyCapPerBusiness(): number {
  const n = parseInt(process.env.LEAD_OUTREACH_DAILY_CAP_PER_BUSINESS ?? '3', 10);
  return Number.isFinite(n) && n > 0 ? n : 3;
}

export function getLeadMaxPerRequest(): number {
  const n = parseInt(process.env.LEAD_OUTREACH_MAX_PER_REQUEST ?? '8', 10);
  return Number.isFinite(n) && n > 0 ? n : 8;
}
