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
  type LocationResolverResult,
} from '@/intake/intelligence-engine/resolvers/location-resolver';
import {
  createEmptyFieldBag,
  setField,
  type IntakeFieldBag,
  type IntakeIntelligenceInput,
} from '@/intake/intelligence-engine/types';
import {
  smartResolveLocation,
  findNeighborhoodInScopedCity,
  resolveCatalogCitySlugByName,
} from '@/intake/intelligence-engine/semantic/smart-location';
import {
  isSemanticLocationEnabled,
  isLocationRagEnabled,
} from '@/intake/intelligence-engine/semantic/config';
import { ragResolveLocation } from '@/intake/intelligence-engine/semantic/location-grounding-rag';

export interface LocationLreBridgeResult extends LocationResolverResult {
  parsedLocationPatch?: Partial<ParsedIntent>;
}

function lreConfidenceToField(confidence: number): number {
  return Math.min(0.95, Math.max(0.4, confidence / 100));
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
      score: 0,
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
      score: c.score,
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
    const area = result.neighborhoodLabel?.trim();
    if (area) {
      patch.entities = { area };
    }
  }
  // NOTE: intentionally no fallback to `result.fragment` here — a fragment is
  // raw, unvalidated text (sometimes a whole trailing clause like "کرمانشاه
  // ساکن هستم"), not a catalog-checked neighborhood. Showing it as a
  // "confirmed" area let users approve garbage that the neighborhood picker
  // (which only lists real catalog entries) could never actually match.

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
  },
  rawText: string
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
  } else if (result.city) {
    setField(bag, 'city', { value: result.city, confidence, source: 'resolver' });
    if (result.cityId) {
      setField(bag, 'citySlug', { value: result.cityId, confidence, source: 'resolver' });
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
  } else if (isSemanticLocationEnabled()) {
    // LRE wasn't confident enough to auto-confirm. NEVER fall back to its raw
    // `fragment` (unvalidated text — could be a whole trailing clause). Instead
    // look up a real, catalog-validated neighborhood, scoped to the known city
    // when one is set, so we either get a genuine match or correctly nothing.
    // Resolve to the CATALOG's own slug by name — scopedCitySlug/result.cityId
    // come from a different (and observably unreliable, e.g. "کرمانشاه" ->
    // "کرمان") slug scheme and must not be used to scope a catalog lookup.
    const cityNameForLookup = hasScope
      ? scopedCityName
      : (String(bag.city?.value ?? '') || null);
    const citySlugForLookup = cityNameForLookup
      ? resolveCatalogCitySlugByName(cityNameForLookup)
      : null;
    const validated = citySlugForLookup
      ? findNeighborhoodInScopedCity(rawText, citySlugForLookup)
      : null;
    if (validated) {
      setField(bag, 'neighborhood', { value: validated.name, confidence: 0.85, source: 'resolver', evidence: 'smart' });
      setField(bag, 'neighborhoodSlug', { value: validated.slug, confidence: 0.85, source: 'resolver' });
    }
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
        score: c.score,
      })) ?? [];

    const fields = applyLreToFieldBag(
      lreResult,
      {
        scopedCitySlug: scopedCitySlug ?? scopedCitySlugInput,
        scopedCityName,
        hasScope,
      },
      rawText
    ) as IntakeFieldBag;
    const parsedLocationPatch = buildParsedLocationPatch(
      lreResult,
      hasScope ? scopedCityName : null,
      rawText
    );

    // Authoritative city pass for the UNSCOPED case: the smart resolver (full
    // 1207-city/48k-neighborhood catalog + stoplist + prominence) overrides a
    // wrong/weak LRE city guess (e.g. نارمک correctly → تهران, not سمیرم) and
    // clears a hallucinated city/neighborhood when the text names no real place.
    if (isSemanticLocationEnabled() && !hasScope) {
      const smart = smartResolveLocation(rawText);
      const f = fields as Record<string, unknown>;
      if (smart.citySlug && smart.cityName) {
        setField(fields, 'city', { value: smart.cityName, confidence: 0.92, source: 'resolver', evidence: `smart:${smart.method}` });
        setField(fields, 'citySlug', { value: smart.citySlug, confidence: 0.92, source: 'resolver' });
        parsedLocationPatch.city = smart.cityName;
        if (smart.neighborhoodSlug && smart.neighborhoodName) {
          setField(fields, 'neighborhood', { value: smart.neighborhoodName, confidence: 0.88, source: 'resolver', evidence: 'smart' });
          setField(fields, 'neighborhoodSlug', { value: smart.neighborhoodSlug, confidence: 0.88, source: 'resolver' });
          parsedLocationPatch.neighborhoodSlug = smart.neighborhoodSlug;
        } else {
          delete f.neighborhood;
          delete f.neighborhoodSlug;
          parsedLocationPatch.neighborhoodSlug = undefined;
        }
      } else {
        // Deterministic resolver found no city. Optionally try the RAG fallback
        // (bge-m3 over the grounding corpus) for Persian fuzzy/paraphrase mentions
        // the catalog can't match. Flag-gated + conservative score so it never
        // hallucinates a city on no-location text (preserves the "don't guess"
        // behavior). Slug comes from the authoritative catalog, not the model.
        let ragCity: { name: string; slug: string } | null = null;
        if (isLocationRagEnabled()) {
          const rag = await ragResolveLocation(rawText, { minScore: 0.6 });
          if (rag?.cityName) {
            const slug = resolveCatalogCitySlugByName(rag.cityName);
            if (slug) ragCity = { name: rag.cityName, slug };
          }
        }
        if (ragCity) {
          setField(fields, 'city', { value: ragCity.name, confidence: 0.8, source: 'resolver', evidence: 'rag' });
          setField(fields, 'citySlug', { value: ragCity.slug, confidence: 0.8, source: 'resolver' });
          parsedLocationPatch.city = ragCity.name;
          // RAG doesn't reliably pin a specific neighborhood slug → leave it cleared.
          delete f.neighborhood;
          delete f.neighborhoodSlug;
          parsedLocationPatch.neighborhoodSlug = undefined;
        } else {
          delete f.city;
          delete f.citySlug;
          delete f.neighborhood;
          delete f.neighborhoodSlug;
          parsedLocationPatch.city = undefined;
          parsedLocationPatch.neighborhoodSlug = undefined;
          parsedLocationPatch.locationAmbiguous = true;
        }
      }
    }

    return {
      fields,
      candidates,
      status: mapLreStatus(lreResult.status),
      parsedLocationPatch,
    };
  } catch {
    return resolveLocationFuse(normalizedText, rawText, input);
  }
}
