import type { ParsedIntent } from '@/contracts/need-intake';
import { CANONICAL_CITIES } from '@/config/locations';
import {
  extractCitiesMentionedInText,
} from '@/lib/need-intake/extract-cities-from-text';
import {
  resolveLocation as resolveLocationLre,
  type LocationResolutionResult,
} from '@/lib/need-intake/location-resolution-engine';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';
import { searchLocationIndex } from '@/intake/intelligence-engine/indexes/location-fuse-index';
import {
  resolveLocation as resolveLocationFuse,
  provinceTitleFor,
  type LocationResolverResult,
} from '@/intake/intelligence-engine/resolvers/location-resolver';
import {
  createEmptyFieldBag,
  setField,
  type IntakeIntelligenceInput,
} from '@/intake/intelligence-engine/types';

export interface LocationLreBridgeResult extends LocationResolverResult {
  parsedLocationPatch?: Partial<ParsedIntent>;
}

function lreConfidenceToField(confidence: number): number {
  return Math.min(0.95, Math.max(0.4, confidence / 100));
}

/**
 * Canonical confidence contract (Cognitive Engine quality pass, confidence-normalization audit):
 * `location-resolution-engine.ts` reports raw fuzzy-match scores on a 0-100+ scale (see its
 * `RESOLVE_CONFIDENCE_MIN = 72`, `MIN_GLOBAL_NEIGHBORHOOD_SCORE = 10` etc.). Every value that
 * crosses THIS module's boundary — i.e. every `score`/`confidence` field on `ParsedIntent` and on
 * anything `groundLocation()` reads — MUST already be on the [0,1] scale the rest of the pipeline
 * assumes (`GroundedCandidate.confidence`, `CNOSemanticEntity.confidence`, etc.).
 *
 * Deliberately NOT `lreConfidenceToField()` above: that helper floors at 0.4, which is correct for
 * a single displayed "field confidence" (never show a resolved field as near-zero-confidence) but
 * WRONG for a ranked candidate-list score, where a genuinely weak/zero match must stay
 * distinguishable from a strong one — flooring every candidate to >=0.4 would compress the exact
 * signal the Decision Engine needs to rank candidates and detect ambiguity.
 */
function toUnitConfidence(rawScore: number): number {
  if (!Number.isFinite(rawScore)) return 0;
  return Math.max(0, Math.min(1, rawScore / 100));
}

function mapLreStatus(
  status: LocationResolutionResult['status']
): LocationResolverResult['status'] {
  if (status === 'resolved') return 'resolved';
  if (status === 'neighborhood_ambiguous' || status === 'city_ambiguous') return 'ambiguous';
  return 'unresolved';
}

function mergeTextCityCandidates(
  result: LocationResolutionResult,
  rawText: string,
  scopedCityName: string | null
): NonNullable<LocationResolutionResult['cityCandidates']> {
  const scoped = scopedCityName?.trim() ?? '';
  const merged = new Map<string, NonNullable<LocationResolutionResult['cityCandidates']>[number]>();

  for (const candidate of result.cityCandidates ?? []) {
    merged.set(candidate.label, candidate);
  }

  for (const title of extractCitiesMentionedInText(rawText)) {
    if (scoped && title === scoped) continue;
    if (merged.has(title)) continue;
    const canon = CANONICAL_CITIES.find((c) => c.title === title);
    merged.set(title, {
      cityId: canon?.slug ?? title,
      city: title,
      label: title,
      score: 0, // genuinely zero confidence (text-mention only, no LRE score) — already unit-scale
    });
  }

  return [...merged.values()];
}

function buildParsedLocationPatch(
  result: LocationResolutionResult,
  scopedCityName: string | null,
  rawText: string
): Partial<ParsedIntent> {
  const patch: Partial<ParsedIntent> = {
    locationResolutionStatus: result.status,
    rejectLocationAutoConfirm: result.rejectAutoConfirm,
    locationAmbiguous: result.status !== 'resolved',
    cityCandidates: mergeTextCityCandidates(result, rawText, scopedCityName).map((c) => ({
      cityId: c.cityId,
      label: c.label,
      score: toUnitConfidence(c.score),
    })),
    neighborhoodCandidates: result.neighborhoodCandidates?.slice(0, 6).map((c) => ({
      slug: c.slug,
      label: c.label,
      city: c.city,
    })),
  };

  if (scopedCityName) {
    patch.city = scopedCityName;
  } else if (result.city) {
    patch.city = result.city;
  }

  if (result.status === 'resolved' && result.neighborhoodSlug && !result.rejectAutoConfirm) {
    patch.neighborhoodSlug = result.neighborhoodSlug;
    const area = result.neighborhoodLabel?.trim() || result.fragment?.trim();
    if (area) {
      patch.entities = { area };
    }
  } else if (result.fragment?.trim()) {
    patch.entities = { area: result.fragment.trim() };
  }

  return patch;
}

async function resolveScopedCitySlug(
  citySlug: string | null,
  cityName: string | null
): Promise<string | null> {
  if (citySlug) return citySlug;
  if (!cityName) return null;
  const hits = await searchLocationIndex(cityName, { limit: 3 });
  const cityHit = hits.find((h) => h.record.type === 'city');
  return cityHit?.record.slug ?? null;
}

function applyLreToFieldBag(
  result: LocationResolutionResult,
  opts: {
    scopedCitySlug: string | null;
    scopedCityName: string | null;
    hasScope: boolean;
  }
): LocationResolverResult['fields'] {
  const bag = createEmptyFieldBag();
  const confidence = lreConfidenceToField(result.confidence);
  const { scopedCitySlug, scopedCityName, hasScope } = opts;

  if (hasScope) {
    const cityName = scopedCityName || result.city || '';
    const citySlug = scopedCitySlug || result.cityId || null;
    if (cityName) {
      setField(bag, 'city', {
        value: cityName,
        confidence: 0.9,
        source: 'dictionary',
        evidence: 'user-scope',
      });
    }
    if (citySlug) {
      setField(bag, 'citySlug', { value: citySlug, confidence: 0.9, source: 'resolver' });
    }
    const province = provinceTitleFor(citySlug, cityName);
    if (province) {
      setField(bag, 'province', { value: province, confidence: 0.85, source: 'resolver', evidence: 'city→province' });
    }
  } else if (result.city) {
    // Explicit/inferred city must beat dictionary province hits (e.g. «استان همدان»
    // → همدان) even when neighborhood stays unresolved.
    const cityConfidence = Math.max(confidence, 0.93);
    setField(bag, 'city', { value: result.city, confidence: cityConfidence, source: 'resolver' });
    if (result.cityId) {
      setField(bag, 'citySlug', { value: result.cityId, confidence: cityConfidence, source: 'resolver' });
    }
    const province = provinceTitleFor(result.cityId, result.city);
    if (province) {
      setField(bag, 'province', { value: province, confidence: cityConfidence, source: 'resolver', evidence: 'city→province' });
    }
  }

  const canAutoConfirmNeighborhood =
    result.status === 'resolved' &&
    Boolean(result.neighborhoodSlug) &&
    !result.rejectAutoConfirm;

  if (canAutoConfirmNeighborhood) {
    setField(bag, 'neighborhood', {
      value: result.neighborhoodLabel ?? result.fragment ?? '',
      confidence,
      source: 'resolver',
    });
    setField(bag, 'neighborhoodSlug', {
      value: result.neighborhoodSlug!,
      confidence,
      source: 'resolver',
    });
  } else if (result.fragment) {
    setField(bag, 'neighborhood', {
      value: result.fragment,
      confidence: 0.5,
      source: 'rule',
      evidence: result.status,
    });
  }

  return bag;
}

/** Rules-first location resolution via LRE with user city scope; fuse fallback on failure. */
export async function resolveLocationViaLre(
  normalizedText: string,
  rawText: string,
  input: IntakeIntelligenceInput
): Promise<LocationLreBridgeResult> {
  const scopedCitySlugInput = input.citySlug?.trim() || null;
  const scopedCityName =
    input.cityName?.trim() || input.formHints?.city?.trim() || null;
  const hasScope = Boolean(scopedCitySlugInput || scopedCityName);

  try {
    const parsed = parseIntentFromText(rawText);
    const explicitCity = hasScope
      ? scopedCityName || undefined
      : parsed.city?.trim() || undefined;

    const scopedCitySlug = hasScope
      ? await resolveScopedCitySlug(scopedCitySlugInput, scopedCityName)
      : null;

    const lreResult = resolveLocationLre(rawText, {
      explicitCity,
      preferredCityId: scopedCitySlug ?? scopedCitySlugInput,
      parsed,
    });

    const candidates =
      lreResult.neighborhoodCandidates?.map((c) => ({
        slug: c.slug,
        label: c.label,
        city: c.city,
        score: toUnitConfidence(c.score),
      })) ?? [];

    return {
      fields: applyLreToFieldBag(lreResult, {
        scopedCitySlug: scopedCitySlug ?? scopedCitySlugInput,
        scopedCityName,
        hasScope,
      }),
      candidates,
      status: mapLreStatus(lreResult.status),
      parsedLocationPatch: buildParsedLocationPatch(
        lreResult,
        hasScope ? scopedCityName : null,
        rawText
      ),
    };
  } catch {
    return resolveLocationFuse(normalizedText, rawText, input);
  }
}
