/**
 * Validate LLM-proposed city/province/neighborhoods against the REAL location
 * catalog (+ RAG fallback). City is resolved FIRST; neighborhoods are validated
 * strictly inside that city's catalog — any proposed name without a catalog hit
 * is dropped (no hallucinated slugs). Slugs ALWAYS come from the catalog.
 */
import 'server-only';

import {
  smartResolveLocation,
  findNeighborhoodInScopedCity,
  resolveCatalogCitySlugByName,
} from '@/intake/intelligence-engine/semantic/smart-location';
import { queryLocationGrounding } from '@/intake/intelligence-engine/semantic/location-grounding-rag';
import { proposeValidateThresholds } from '@/intake/rules/config';
import type { ProposeParsed } from '@/intake/intelligence-engine/propose-validate/propose-schema';

const norm = (s: string): string =>
  String(s || '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, ' ').replace(/\s+/g, ' ').trim();

export interface ValidatedLocation {
  citySlug: string | null;
  cityName: string | null;
  province: string | null;
  neighborhoodSlug: string | null;
  neighborhoodName: string | null;
  cityCandidates: Array<{ cityId: string; label: string; score?: number }>;
  neighborhoodCandidates: Array<{ slug: string; label: string; city?: string }>;
  citySource: 'scope' | 'catalog' | 'smart' | 'rag' | 'none';
}

export async function validateProposedLocation(
  rawText: string,
  proposal: ProposeParsed,
  input: { citySlug?: string | null; cityName?: string | null },
): Promise<ValidatedLocation> {
  const th = proposeValidateThresholds();

  let citySlug: string | null = null;
  let cityName: string | null = null;
  let province: string | null = proposal.province ?? null;
  let citySource: ValidatedLocation['citySource'] = 'none';

  const normTxt = norm(rawText);
  const mentionedInText = (name: string) => {
    const n = norm(name);
    return n.length > 1 && normTxt.includes(n);
  };

  // 1) User scope wins.
  if (input.citySlug || input.cityName) {
    citySlug = input.citySlug ?? (input.cityName ? resolveCatalogCitySlugByName(input.cityName) : null);
    cityName = input.cityName ?? null;
    if (citySlug) citySource = 'scope';
  }

  // 2) TEXT-GROUNDED first: the deterministic catalog only matches cities (or
  //    neighborhood→city) that are actually present in the text. This prevents the
  //    LLM from inventing a city that isn't mentioned (e.g. a job post → کرمانشاه).
  if (!citySlug) {
    const smart = smartResolveLocation(rawText);
    if (smart.citySlug && smart.cityName) {
      citySlug = smart.citySlug;
      cityName = smart.cityName;
      citySource = 'smart';
    }
  }

  // 3) LLM-proposed city — ONLY if it actually appears in the text (corroboration).
  if (!citySlug && proposal.city && mentionedInText(proposal.city)) {
    const slug = resolveCatalogCitySlugByName(proposal.city);
    if (slug) {
      citySlug = slug;
      cityName = proposal.city;
      citySource = 'catalog';
    }
  }

  // 4) RAG fallback — only for a text-corroborated proposed city the catalog missed.
  if (!citySlug && proposal.city && mentionedInText(proposal.city)) {
    const cands = await queryLocationGrounding(proposal.city, { k: 5, types: ['city', 'province'] });
    const top = cands[0];
    if (top && top.score >= th.cityCrossCheckMin && top.type === 'city') {
      const slug = resolveCatalogCitySlugByName(top.name);
      if (slug) {
        citySlug = slug;
        cityName = top.name;
        province = top.province ?? province;
        citySource = 'rag';
      }
    }
  }

  // 5) Neighborhoods — only with a resolved city; catalog-validated only.
  const neighborhoodCandidates: ValidatedLocation['neighborhoodCandidates'] = [];
  let neighborhoodSlug: string | null = null;
  let neighborhoodName: string | null = null;
  if (citySlug) {
    const seen = new Set<string>();
    const cityKey = (cityName ?? '').replace(/\s+/g, '').trim();
    const isCityEcho = (name: string) => name.replace(/\s+/g, '').trim() === cityKey && cityKey.length > 0;
    const tryAdd = (name: string) => {
      if (!name?.trim()) return;
      const hit = findNeighborhoodInScopedCity(name, citySlug!);
      // Drop a "neighborhood" that is just the city name echoed (e.g. سمیرم→سمیرم).
      if (hit && !seen.has(hit.slug) && !isCityEcho(hit.name)) {
        seen.add(hit.slug);
        neighborhoodCandidates.push({ slug: hit.slug, label: hit.name, city: cityName ?? undefined });
      }
    };
    for (const n of proposal.neighborhoods) tryAdd(n);
    // Safety net: a catalog neighborhood in the raw text the model may have missed.
    const fromText = findNeighborhoodInScopedCity(rawText, citySlug);
    if (fromText && !seen.has(fromText.slug) && !isCityEcho(fromText.name)) {
      seen.add(fromText.slug);
      neighborhoodCandidates.push({ slug: fromText.slug, label: fromText.name, city: cityName ?? undefined });
    }
    if (neighborhoodCandidates.length) {
      neighborhoodSlug = neighborhoodCandidates[0]!.slug;
      neighborhoodName = neighborhoodCandidates[0]!.label;
    }
  }

  return {
    citySlug,
    cityName,
    province,
    neighborhoodSlug,
    neighborhoodName,
    cityCandidates: [],
    neighborhoodCandidates,
    citySource,
  };
}
