import type { Business } from '@/contracts/business-profile';
import type {
  ReputationComponentScores,
  ReputationLevel,
  ReputationResult,
} from './types';
import { getEcosystemExtension } from './accessor';

/**
 * Phase 2 — Business Reputation Engine.
 *
 * Pure, deterministic 0–100 score from 8 weighted components. No DB access — the
 * caller passes the resolved `Business` object so it can run on server or client.
 */

interface ComponentSpec {
  key: keyof ReputationComponentScores;
  label: string;
  weight: number;
}

/** Weights sum to 100. */
const COMPONENTS: ComponentSpec[] = [
  { key: 'profileCompleteness', label: 'تکمیل پروفایل', weight: 15 },
  { key: 'activeListings', label: 'آگهی‌های فعال', weight: 12 },
  { key: 'successfulMatches', label: 'تطابق‌های موفق', weight: 18 },
  { key: 'userEngagement', label: 'تعامل کاربران', weight: 10 },
  { key: 'responseSpeed', label: 'سرعت پاسخ', weight: 12 },
  { key: 'reviews', label: 'نظرات', weight: 15 },
  { key: 'verification', label: 'احراز هویت', weight: 10 },
  { key: 'activityFrequency', label: 'فعالیت مستمر', weight: 8 },
];

const VERIFICATION_SCORE: Record<string, number> = {
  basic: 0.25,
  verified: 0.6,
  professional: 0.85,
  enterprise: 1,
};

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Each returns 0–1 (normalized). */
function computeComponents(business: Business): ReputationComponentScores {
  const ext = getEcosystemExtension(business);

  // Profile completeness — presence of key fields
  const completenessChecks = [
    Boolean(business.identity.logo),
    Boolean(business.identity.coverImage),
    Boolean(business.identity.description && business.identity.description.length > 40),
    business.identity.category.length > 0,
    business.identity.tags.length > 0,
    Boolean(business.contact.phone || business.contact.whatsapp),
    business.offers.length > 0,
    business.portfolio.length > 0,
    Boolean(business.identity.location?.city),
    (ext.specializations?.length ?? 0) > 0,
  ];
  const profileCompleteness = clamp01(
    completenessChecks.filter(Boolean).length / completenessChecks.length
  );

  const listingsCount = business.extensions?.realEstate?.listings?.length ?? 0;
  const activeListings = clamp01(listingsCount / 10);

  // Successful matches — proxied by conversions
  const successfulMatches = clamp01(business.analytics.conversions / 25);

  // Engagement — views + saves + clicks
  const engagementRaw =
    business.analytics.views * 0.2 +
    business.analytics.clicks * 0.5 +
    business.analytics.saves * 1.5;
  const userEngagement = clamp01(engagementRaw / 500);

  const responseSpeed = clamp01(business.trust.responseRate / 100);

  // Reviews — rating (0–5) scaled, dampened by low review counts
  const ratingScore = clamp01(business.trust.rating / 5);
  const volumeFactor = clamp01(business.trust.reviewCount / 10);
  const reviews = clamp01(ratingScore * (0.5 + 0.5 * volumeFactor));

  const verification = VERIFICATION_SCORE[ext.verification?.level ?? 'basic'] ?? 0.25;

  const activityFrequency = clamp01(business.trust.yearsActive / 5);

  return {
    profileCompleteness,
    activeListings,
    successfulMatches,
    userEngagement,
    responseSpeed,
    reviews,
    verification,
    activityFrequency,
  };
}

export function levelForScore(score: number): ReputationLevel {
  if (score >= 85) return 'platinum';
  if (score >= 65) return 'gold';
  if (score >= 40) return 'silver';
  return 'bronze';
}

export const REPUTATION_LEVEL_LABELS: Record<ReputationLevel, string> = {
  bronze: 'برنز',
  silver: 'نقره‌ای',
  gold: 'طلایی',
  platinum: 'پلاتینیوم',
};

export function computeReputation(business: Business): ReputationResult {
  const components = computeComponents(business);

  let score = 0;
  const breakdown = COMPONENTS.map((spec) => {
    const normalized = components[spec.key];
    const value = normalized * spec.weight;
    score += value;
    return {
      key: spec.key,
      label: spec.label,
      value: Math.round(value),
      max: spec.weight,
    };
  });

  const finalScore = Math.round(clamp01(score / 100) * 100);

  return {
    score: finalScore,
    level: levelForScore(finalScore),
    components,
    breakdown,
  };
}
