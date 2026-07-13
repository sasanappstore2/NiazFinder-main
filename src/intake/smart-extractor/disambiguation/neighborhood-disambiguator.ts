/**
 * Neighborhood disambiguation — integrates managed catalog + OSM street cache.
 * Claude Step 3 directive.
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { findManagedNeighborhoodAmbiguity } from '@/lib/neighborhoods/find-managed-neighborhood-ambiguity';
import type { ManagedNeighborhood } from '@/lib/locations/managed-types';
import type {
  DisambiguateNeighborhoodInput,
  DisambiguationResult,
  NeighborhoodCandidate,
} from './types';

type OsmStreet = { name: string; lat?: number; lng?: number };

const osmCache = new Map<string, OsmStreet[]>();

function compact(text: string): string {
  return text.replace(/\u200c/g, '').replace(/\s+/g, '').trim().toLowerCase();
}

function loadOsmStreetsForCity(citySlug: string): OsmStreet[] {
  const key = citySlug.trim().toLowerCase() || 'mashhad';
  const cached = osmCache.get(key);
  if (cached) return cached;

  const dir = path.join(process.cwd(), 'data/neighborhoods/cache/osm-streets');
  let files: string[] = [];
  try {
    files = readdirSync(dir).filter((f) => f.startsWith(`${key}-`) && f.endsWith('.json'));
  } catch {
    osmCache.set(key, []);
    return [];
  }
  if (files.length === 0) {
    osmCache.set(key, []);
    return [];
  }
  const filePath = path.join(dir, files[0]!);
  const raw = JSON.parse(readFileSync(filePath, 'utf8')) as OsmStreet[];
  const streets = Array.isArray(raw) ? raw : [];
  osmCache.set(key, streets);
  return streets;
}

function streetContext(rawText: string): 'street' | 'neighborhood' | 'unknown' {
  if (/(?:خیابان|بلوار|جاده|کوچه)\s+/u.test(rawText)) return 'street';
  if (/(?:محله|منطقه)\s+/u.test(rawText)) return 'neighborhood';
  return 'unknown';
}

function osmStreetCandidates(phrase: string, citySlug: string): NeighborhoodCandidate[] {
  const streets = loadOsmStreetsForCity(citySlug);
  const needle = compact(phrase);
  if (!needle || needle.length < 2) return [];

  const uniq = new Map<string, NeighborhoodCandidate>();
  for (const s of streets) {
    const name = s.name?.trim();
    if (!name) continue;
    const cName = compact(name);
    if (!cName.includes(needle)) continue;
    const id = `osm:${cName}`;
    if (uniq.has(id)) continue;
    const exact = cName === needle;
    uniq.set(id, {
      name,
      id,
      confidence: exact ? 0.92 : 0.72,
      matchReason: exact ? 'exact' : 'street_reference',
      context: name,
      lat: s.lat,
      lng: s.lng,
    });
  }
  return [...uniq.values()].sort((a, b) => b.confidence - a.confidence).slice(0, 8);
}

function managedToCandidates(
  hits: ReturnType<typeof findManagedNeighborhoodAmbiguity>
): NeighborhoodCandidate[] {
  return hits.map((h, i) => {
    const exact = compact(h.neighborhood.name) === compact(h.matchedLabel);
    return {
      name: h.neighborhood.name,
      id: h.neighborhood.id || h.neighborhood.name,
      confidence: exact ? 0.95 - i * 0.02 : 0.8 - i * 0.03,
      matchReason: exact ? 'exact' : 'sub_area',
      context: h.matchedLabel !== h.neighborhood.name ? h.matchedLabel : undefined,
    };
  });
}

/**
 * Disambiguate a neighborhood/street phrase for a city using managed catalog + OSM streets.
 */
export function disambiguateNeighborhood(
  input: DisambiguateNeighborhoodInput,
  neighborhoods: ManagedNeighborhood[] = []
): DisambiguationResult {
  const phrase = input.phrase.trim();
  if (!phrase) {
    return { needsDisambiguation: false, candidates: [] };
  }

  const citySlug =
    input.citySlug?.trim().toLowerCase() ||
    (input.cityName?.includes('مشهد') ? 'mashhad' : 'mashhad');
  const raw = input.rawText?.trim() || phrase;
  const ctx = streetContext(raw);

  const managedHits =
    neighborhoods.length > 0
      ? findManagedNeighborhoodAmbiguity(neighborhoods, phrase, raw)
      : [];
  const managed = managedToCandidates(managedHits);
  const osm = osmStreetCandidates(phrase, citySlug);

  // Prefer managed hoods; append OSM streets that aren't already covered by name token
  const merged = new Map<string, NeighborhoodCandidate>();
  for (const c of managed) merged.set(compact(c.name), c);
  for (const c of osm) {
    const key = compact(c.name);
    if (!merged.has(key)) merged.set(key, c);
  }

  let candidates = [...merged.values()].sort((a, b) => b.confidence - a.confidence);

  // Context boost: خیابان فردوسی → prefer OSM/street_reference; محله → prefer managed exact/sub_area
  if (ctx === 'street') {
    candidates = candidates
      .map((c) =>
        c.matchReason === 'street_reference' || /خیابان|بلوار|جاده|فردوسی\s*\d/u.test(c.name)
          ? { ...c, confidence: Math.min(0.99, c.confidence + 0.08) }
          : c
      )
      .sort((a, b) => b.confidence - a.confidence);
  } else if (ctx === 'neighborhood') {
    candidates = candidates
      .map((c) =>
        c.matchReason === 'exact' || c.matchReason === 'sub_area'
          ? { ...c, confidence: Math.min(0.99, c.confidence + 0.08) }
          : c
      )
      .sort((a, b) => b.confidence - a.confidence);
  }

  if (candidates.length === 0) {
    return { needsDisambiguation: false, candidates: [] };
  }

  if (candidates.length === 1) {
    return {
      needsDisambiguation: false,
      candidates,
      selectedId: candidates[0]!.id,
      selectedName: candidates[0]!.name,
    };
  }

  // Clear winner: high confidence gap
  const top = candidates[0]!;
  const second = candidates[1]!;
  if (top.confidence >= 0.93 && top.confidence - second.confidence >= 0.15) {
    return {
      needsDisambiguation: false,
      candidates,
      selectedId: top.id,
      selectedName: top.name,
    };
  }

  return {
    needsDisambiguation: true,
    candidates: candidates.slice(0, 8),
  };
}

export async function disambiguateNeighborhoodWithCatalog(
  input: DisambiguateNeighborhoodInput
): Promise<DisambiguationResult> {
  const cityName = input.cityName?.trim() || 'مشهد';
  try {
    const { getNeighborhoodCatalogForCity } = await import(
      '@/lib/need-intake/neighborhood-catalog.server'
    );
    const catalog = getNeighborhoodCatalogForCity(cityName);
    const neighborhoods: ManagedNeighborhood[] = catalog.map((n, i) => ({
      id: n.slug,
      name: n.name,
      areas: n.areas,
      isActive: true,
      order: i,
    }));
    return disambiguateNeighborhood(input, neighborhoods);
  } catch {
    return disambiguateNeighborhood(input, []);
  }
}
