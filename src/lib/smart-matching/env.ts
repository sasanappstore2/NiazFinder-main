export function isSmartMatchingEnabled(): boolean {
  const v = process.env.SMART_MATCHING_ENABLED;
  if (v === 'false' || v === '0') return false;
  return v === 'true' || v === '1' || process.env.NODE_ENV === 'production';
}

/** @deprecated use getStandardLeadFeeToman/getQualityLeadFeeToman */
export function getLeadFeeToman(): number {
  const n = parseInt(process.env.LEAD_FEE_TOMAN ?? '5000', 10);
  return Number.isFinite(n) && n > 0 ? n : 5000;
}

export function getStandardLeadFeeToman(): number {
  const n = parseInt(process.env.STANDARD_LEAD_FEE_TOMAN ?? '10000', 10);
  return Number.isFinite(n) && n > 0 ? n : 10000;
}

export function getQualityLeadFeeToman(): number {
  const n = parseInt(process.env.QUALITY_LEAD_FEE_TOMAN ?? '20000', 10);
  return Number.isFinite(n) && n > 0 ? n : 20000;
}

export function getVipTtlMs(): number {
  const n = parseInt(process.env.VIP_TTL_MS ?? '10800000', 10);
  return Number.isFinite(n) && n > 0 ? n : 10_800_000;
}

export function getMaxPrivateLeadsPerBusiness(): number {
  const n = parseInt(process.env.MAX_PRIVATE_LEADS_PER_BUSINESS ?? '100', 10);
  return Number.isFinite(n) && n > 0 ? n : 100;
}

export function getMaxActiveChatSessionsPerNeed(): number {
  const n = parseInt(process.env.MAX_ACTIVE_CHAT_SESSIONS_PER_NEED ?? '3', 10);
  return Number.isFinite(n) && n > 0 ? n : 3;
}

export function getSmartMatchingInternalSecret(): string {
  return process.env.SMART_MATCHING_INTERNAL_SECRET ?? '';
}

export function getLeadMaxPerRequest(): number {
  const n = parseInt(process.env.LEAD_OUTREACH_MAX_PER_REQUEST ?? '8', 10);
  return Number.isFinite(n) && n > 0 ? n : 8;
}

export function getLeadMinMatchScore(): number {
  const n = parseFloat(process.env.LEAD_MIN_MATCH_SCORE ?? '0.65');
  return Number.isFinite(n) ? n : 0.65;
}
