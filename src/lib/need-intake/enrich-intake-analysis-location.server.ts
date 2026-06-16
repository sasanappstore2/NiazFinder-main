import type { IntakeAnalysisResult, IntakeLocationHints, TransactionType } from '@/intake/types';
import type { ParsedIntent } from '@/contracts/need-intake';
import { applyLaunchIntakeEntityPolicy } from '@/lib/need-intake/intake-launch-policy';
import { mapDealTypeToTransaction } from '@/lib/need-intake/deal-type-transaction';
import { parseAndEnrichIntentFromText } from '@/lib/need-intake/parse-and-enrich-intent.server';

function locationHintsFromParsed(parsed: ParsedIntent): IntakeLocationHints {
  return {
    locationAmbiguous: parsed.locationAmbiguous,
    neighborhoodSlug: parsed.neighborhoodSlug,
    neighborhoodCandidates: parsed.neighborhoodCandidates?.map((n) => ({
      slug: n.slug,
      label: n.label,
      city: n.city,
    })),
    cityCandidates: parsed.cityCandidates?.map((c) => ({
      cityId: c.cityId,
      label: c.label,
    })),
    locationResolutionStatus: parsed.locationResolutionStatus,
    rejectLocationAutoConfirm: parsed.rejectLocationAutoConfirm,
    areaLabel: parsed.entities?.area,
  };
}

const TX_RANK: Record<TransactionType, number> = {
  HOURLY_RENT: 1,
  DAILY_RENT: 2,
  RENT: 3,
  BUY: 3,
  SELL: 3,
  FULL_DEPOSIT: 4,
  DEPOSIT_AND_RENT: 5,
};

function preferTransactionType(
  current: TransactionType | null | undefined,
  candidate: TransactionType | null | undefined
): TransactionType | null {
  if (!candidate) return current ?? null;
  if (!current) return candidate;
  return TX_RANK[candidate] >= TX_RANK[current] ? candidate : current;
}

/** Run full parse+enrich pipeline and merge location/deal into analyze entities (API-only). */
export function enrichIntakeAnalysisLocation(
  analysis: IntakeAnalysisResult,
  sourceText: string,
  opts?: {
    preferredCitySlug?: string | null;
    preferredCityName?: string | null;
  }
): IntakeAnalysisResult {
  const text = sourceText.trim();
  if (!text) return analysis;

  const parsed = parseAndEnrichIntentFromText(text, {
    preferredCityId: opts?.preferredCitySlug ?? analysis.entities.citySlug,
    preferredCityName: opts?.preferredCityName ?? analysis.entities.city ?? undefined,
    locationText: text,
  });

  const policyEntities = applyLaunchIntakeEntityPolicy(text, { ...analysis.entities });
  const entities = { ...policyEntities };

  if (parsed.city?.trim()) {
    entities.city = parsed.city.trim();
  }
  if (parsed.neighborhoodSlug?.trim()) {
    entities.neighborhoodSlug = parsed.neighborhoodSlug.trim();
    const catalogName = parsed.entities?.area?.trim();
    if (catalogName && /[^\d]/.test(catalogName)) {
      entities.neighborhood = catalogName;
    }
  } else if (parsed.entities?.area?.trim() && !entities.neighborhood?.trim()) {
    const area = parsed.entities.area.trim();
    if (/[^\d]/.test(area)) {
      entities.neighborhood = area;
    }
  }

  const fromParsedDeal = mapDealTypeToTransaction(parsed.entities?.dealType);
  entities.transactionType = preferTransactionType(entities.transactionType, fromParsedDeal);

  return {
    ...analysis,
    entities,
    locationHints: locationHintsFromParsed(parsed),
  };
}
