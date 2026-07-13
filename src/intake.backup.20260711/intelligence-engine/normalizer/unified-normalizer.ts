import { normalizePersian } from '@/intake/normalizer/normalizePersian';
import { normalizeIntakeText } from '@/lib/need-intake/normalize-intake-text';
import { applyTypoAliases } from '@/intake/intelligence-engine/normalizer/typo-aliases';

export interface UnifiedNormalizeResult {
  raw: string;
  normalized: string;
  lookupKey: string;
}

/**
 * Single normalization path for Intelligence Engine v1.
 * Preserves Persian letters for display paths; lookupKey is fully normalized.
 */
export function unifiedNormalize(rawText: string): UnifiedNormalizeResult {
  const raw = rawText.trim();
  const withTypos = applyTypoAliases(raw);
  const intakeNorm = normalizeIntakeText(withTypos);
  const normalized = normalizePersian(intakeNorm);
  const lookupKey = normalized.replace(/\s+/g, ' ').trim();
  return { raw, normalized: intakeNorm, lookupKey };
}
