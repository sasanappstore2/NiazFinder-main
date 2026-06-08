import type { IntakeAnalysisResult, IntakeLocationHints } from '@/intake/types';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';
import { applyLocationResolutionToParsed } from '@/lib/need-intake/location-resolution-engine';
import { applyLaunchIntakeEntityPolicy } from '@/lib/need-intake/intake-launch-policy';

function locationHintsFromParsed(parsed: ReturnType<typeof applyLocationResolutionToParsed>): IntakeLocationHints {
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

/** Run LRE on analyze text and merge neighborhood/city into intake entities (API-only). */
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

  const parsed = applyLocationResolutionToParsed(parseIntentFromText(text), {
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

  return {
    ...analysis,
    entities,
    locationHints: locationHintsFromParsed(parsed),
  };
}
