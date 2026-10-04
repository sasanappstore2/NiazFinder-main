import { extractLocationFragment } from '@/lib/need-intake/location-fragment';
import { parseCity } from '@/lib/need-intake/intent-parser';
import { searchLocationIndex } from '@/intake/intelligence-engine/indexes/location-fuse-index';
import { CANONICAL_CITIES, CANONICAL_PROVINCES } from '@/config/locations';
import {
  createEmptyFieldBag,
  setField,
  type IntakeFieldBag,
  type IntakeIntelligenceInput,
} from '@/intake/intelligence-engine/types';

export function provinceTitleFor(
  citySlug?: string | null,
  cityName?: string | null,
  provinceSlug?: string | null
): string | null {
  const slug =
    provinceSlug ??
    (citySlug ? CANONICAL_CITIES.find((c) => c.slug === citySlug)?.provinceSlug : undefined) ??
    (cityName ? CANONICAL_CITIES.find((c) => c.title === cityName)?.provinceSlug : undefined);
  if (!slug) return null;
  return CANONICAL_PROVINCES.find((p) => p.slug === slug)?.title ?? null;
}

function setProvinceFromCity(
  bag: Partial<IntakeFieldBag>,
  citySlug?: string | null,
  cityName?: string | null,
  provinceSlug?: string | null,
  confidence = 0.85
): void {
  const title = provinceTitleFor(citySlug, cityName, provinceSlug);
  if (title) {
    setField(bag as IntakeFieldBag, 'province', { value: title, confidence, source: 'resolver', evidence: 'city→province' });
  }
}

export interface LocationResolverResult {
  fields: Partial<IntakeFieldBag>;
  candidates: Array<{ slug: string; label: string; city?: string; score: number }>;
  status: 'resolved' | 'ambiguous' | 'unresolved';
}

export async function resolveLocation(
  normalizedText: string,
  rawText: string,
  input: IntakeIntelligenceInput
): Promise<LocationResolverResult> {
  const bag = createEmptyFieldBag();
  const fragment = extractLocationFragment(rawText)?.trim();
  const query = fragment || normalizedText;

  let citySlug = input.citySlug?.trim() || null;
  let cityName = input.cityName?.trim() || parseCity(rawText) || input.formHints?.city?.trim() || null;

  if (cityName && !citySlug) {
    const cityHits = await searchLocationIndex(cityName, { limit: 3 });
    const cityHit = cityHits.find((h) => h.record.type === 'city');
    if (cityHit) {
      citySlug = cityHit.record.slug;
      cityName = cityHit.record.name;
    }
  }

  const searchQuery = fragment || cityName || query;
  const hits = await searchLocationIndex(searchQuery, { citySlug, limit: 6 });

  const hoodHits = hits.filter((h) => h.record.type === 'neighborhood');
  const cityHits = hits.filter((h) => h.record.type === 'city');

  const candidates = hoodHits.map((h) => ({
    slug: h.record.slug,
    label: h.record.name,
    city: h.record.cityName,
    score: h.confidence,
  }));

  // RFC-0004: write neighborhood only when clearly resolved (≥0.85, single candidate).
  if (hoodHits.length === 1 && hoodHits[0]!.confidence >= 0.85) {
    const h = hoodHits[0]!;
    setField(bag, 'city', { value: h.record.cityName ?? cityName, confidence: 0.9, source: 'resolver', evidence: h.evidence });
    setField(bag, 'citySlug', { value: h.record.citySlug ?? citySlug, confidence: 0.9, source: 'resolver', evidence: h.evidence });
    setProvinceFromCity(bag, h.record.citySlug ?? citySlug, h.record.cityName ?? cityName, h.record.provinceSlug);
    setField(bag, 'neighborhood', { value: h.record.name, confidence: h.confidence, source: 'resolver', evidence: h.evidence });
    setField(bag, 'neighborhoodSlug', { value: h.record.slug, confidence: h.confidence, source: 'resolver', evidence: h.evidence });
    return { fields: bag, candidates, status: 'resolved' };
  }

  // Single weak hit or multiple hits: refuse to write a winner (ambiguity ⇒ no write).
  // The city/province from the text is still trustworthy — write it so matching and the
  // neighborhood picker stay scoped even when the neighborhood itself stays ambiguous.
  if (hoodHits.length >= 1) {
    if (cityName || citySlug) {
      setField(bag, 'city', {
        value: cityName ?? null,
        confidence: 0.85,
        source: 'dictionary',
        evidence: 'parseCity',
      });
      if (citySlug) {
        setField(bag, 'citySlug', { value: citySlug, confidence: 0.8, source: 'resolver' });
      }
      setProvinceFromCity(bag, citySlug, cityName, null, 0.8);
    }
    return { fields: bag, candidates, status: 'ambiguous' };
  }

  if (cityName || cityHits.length) {
    const ch = cityHits[0];
    setField(bag, 'city', {
      value: cityName ?? ch?.record.name ?? null,
      confidence: cityName ? 0.85 : (ch?.confidence ?? 0.7),
      source: 'dictionary',
      evidence: cityName ? 'parseCity' : ch?.evidence,
    });
    if (ch || citySlug) {
      setField(bag, 'citySlug', { value: citySlug ?? ch?.record.slug ?? null, confidence: 0.8, source: 'resolver' });
    }
    setProvinceFromCity(bag, citySlug ?? ch?.record.slug, cityName ?? ch?.record.name, ch?.record.provinceSlug, 0.8);
    if (fragment) {
      setField(bag, 'neighborhood', { value: fragment, confidence: 0.5, source: 'rule', evidence: 'fragment-unresolved' });
    }
    return { fields: bag, candidates, status: fragment ? 'ambiguous' : 'resolved' };
  }

  if (fragment) {
    setField(bag, 'neighborhood', { value: fragment, confidence: 0.4, source: 'rule', evidence: 'fragment-only' });
  }

  return { fields: bag, candidates, status: 'unresolved' };
}
