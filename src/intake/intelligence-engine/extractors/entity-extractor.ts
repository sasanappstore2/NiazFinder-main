import { analyzeNeedText } from '@/intake/engine/intakeEngine';
import { buildIntakeIndexesSync } from '@/intake/dictionaries/loader';
import { applyTypoAliases } from '@/intake/intelligence-engine/normalizer/typo-aliases';
import type { IntakeAnalysisResult } from '@/intake/types';

let cachedIndexes: ReturnType<typeof buildIntakeIndexesSync> | null = null;

export function getEntityExtractorIndexes() {
  if (!cachedIndexes) cachedIndexes = buildIntakeIndexesSync();
  return cachedIndexes;
}

/** Rules-first entity extraction via canonical intake engine. */
export function extractEntities(
  normalizedText: string,
  rawText: string,
  opts?: { preferredCityName?: string | null }
): IntakeAnalysisResult {
  const indexes = getEntityExtractorIndexes();
  return analyzeNeedText(applyTypoAliases(rawText), indexes, {
    preferredCityName: opts?.preferredCityName ?? undefined,
  });
}
