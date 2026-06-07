/**
 * Central intake decision policy — rules-first, no-guess location, slot conflict guards.
 * Re-exports shared helpers; add new cross-cutting rules here to avoid drift.
 */

export {
  isAreaLikeRentConflict,
  isLandPurchaseSignal,
  GENERIC_STREET_TOKENS,
  pickStreetOrHoodDisplay,
} from '@/lib/need-intake/intake-launch-policy';
