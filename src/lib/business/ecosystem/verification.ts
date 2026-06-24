import type { VerificationLevel } from './types';

/**
 * Phase 6 — Verification levels + trust badges.
 */

export const VERIFICATION_LEVELS: VerificationLevel[] = [
  'basic',
  'verified',
  'professional',
  'enterprise',
];

export const VERIFICATION_LABELS: Record<VerificationLevel, string> = {
  basic: 'پایه',
  verified: 'تأییدشده',
  professional: 'حرفه‌ای',
  enterprise: 'سازمانی',
};

export const VERIFICATION_BADGE_COLOR: Record<VerificationLevel, string> = {
  basic: '#9ca3af',
  verified: '#10b981',
  professional: '#3b82f6',
  enterprise: '#8b5cf6',
};

