import { analyzeNeedText } from '@/intake/engine/intakeEngine';
import { buildIntakeIndexesSync } from '@/intake/dictionaries/loader';
import type { IntakeAnalysisResult } from '@/intake/types';

let cachedIndexes: ReturnType<typeof buildIntakeIndexesSync> | null = null;

export function getEntityExtractorIndexes() {
  if (!cachedIndexes) cachedIndexes = buildIntakeIndexesSync();
  return cachedIndexes;
}

/** Rules-first entity extraction via canonical intake engine. */
export function extractEntities(normalizedText: string, rawText: string): IntakeAnalysisResult {
  const indexes = getEntityExtractorIndexes();
  return analyzeNeedText(rawText, indexes, { preferredCityName: undefined });
}
