import type { EcosystemReferral, EcosystemRelationType } from './types';

/**
 * Phase 1 + 7 — Ecosystem connections + Business Network Graph + referrals.
 *
 * Encodes the canonical real-estate relationship map (Agent → Architect,
 * Agent → Lawyer, Owner → Maintenance, …) and referral-success tracking.
 */

export const RELATION_LABELS: Record<EcosystemRelationType, string> = {
  partner: 'شریک',
  referral: 'ارجاع‌دهنده',
  subcontractor: 'پیمانکار جزء',
  supplier: 'تأمین‌کننده',
  affiliate: 'همکار',
};

export interface ReferralStats {
  total: number;
  accepted: number;
  converted: number;
  conversionRate: number;
}

export function computeReferralStats(referrals: EcosystemReferral[]): ReferralStats {
  const total = referrals.length;
  const accepted = referrals.filter((r) => r.status === 'accepted' || r.status === 'converted').length;
  const converted = referrals.filter((r) => r.status === 'converted').length;
  const conversionRate = total ? Math.round((converted / total) * 100) : 0;
  return { total, accepted, converted, conversionRate };
}
