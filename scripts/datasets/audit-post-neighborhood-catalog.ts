#!/usr/bin/env bun
/** Aggregate-only exhaustive consistency audit for the live /post neighborhood resolver. */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { ManagedNeighborhood } from '@/lib/neighborhoods/types';
import { extractPostNaturalFields } from '@/lib/need-intake/si/post-natural-extractor';
import { resolvePostNeighborhoodInCity } from '@/lib/need-intake/si/post-neighborhood-resolver';

type Catalog = {
  cityId: string;
  cityName: string;
  neighborhoods: ManagedNeighborhood[];
};

type VariantStats = {
  tested: number;
  exactTopOne: number;
  targetInAmbiguousCandidates: number;
  ambiguousWithoutTarget: number;
  wrongUniqueHit: number;
  unresolved: number;
  emptyExtractedPhrase: number;
};

type CityStats = VariantStats & { cityId: string; cityName: string };

const CATALOG_DIR = join(process.cwd(), 'src/data/neighborhoods/catalog');
const VARIANTS: Array<(name: string, city: string) => string> = [
  (name, city) => 'یک واحد در محدودهٔ ' + name + ' در ' + city + ' می‌خواهم.',
  (name, city) => 'برای اجاره حوالی ' + name + '، در ' + city + ' ملک می‌خواهم.',
  (name, city) => 'برای خرید، حاشیهٔ ' + name + ' در ' + city + ' را در نظر دارم.',
];

function emptyStats(): VariantStats {
  return {
    tested: 0,
    exactTopOne: 0,
    targetInAmbiguousCandidates: 0,
    ambiguousWithoutTarget: 0,
    wrongUniqueHit: 0,
    unresolved: 0,
    emptyExtractedPhrase: 0,
  };
}

function readCatalogs(): { catalogs: Catalog[]; invalidFiles: number } {
  const catalogs: Catalog[] = [];
  let invalidFiles = 0;
  for (const filename of readdirSync(CATALOG_DIR).sort()) {
    if (!filename.endsWith('.json')) continue;
    try {
      const value = JSON.parse(readFileSync(join(CATALOG_DIR, filename), 'utf8')) as Partial<Catalog>;
      const slug = filename.slice(0, -'.json'.length);
      if (
        value.cityId !== slug ||
        typeof value.cityName !== 'string' ||
        !Array.isArray(value.neighborhoods)
      ) {
        invalidFiles += 1;
        continue;
      }
      catalogs.push(value as Catalog);
    } catch {
      invalidFiles += 1;
    }
  }
  return { catalogs, invalidFiles };
}

function main(): void {
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const { catalogs, invalidFiles } = readCatalogs();
  const variants = VARIANTS.map(emptyStats);
  let catalogNeighborhoodRows = 0;
  let uniqueCityNeighborhoodIds = 0;
  let malformedRows = 0;
  let duplicateIds = 0;
  const byCity = new Map<string, CityStats>();
  const firstWrongUniqueHits: Array<Record<string, unknown>> = [];
  const firstUnresolved: Array<Record<string, unknown>> = [];

  for (const catalog of catalogs) {
    const seenIds = new Set<string>();
    const cityStats: CityStats = { ...emptyStats(), cityId: catalog.cityId, cityName: catalog.cityName };
    byCity.set(catalog.cityId, cityStats);
    for (const neighborhood of catalog.neighborhoods) {
      if (
        !neighborhood ||
        typeof neighborhood.id !== 'string' ||
        !neighborhood.id.trim() ||
        typeof neighborhood.name !== 'string' ||
        !neighborhood.name.trim()
      ) {
        malformedRows += 1;
        continue;
      }
      catalogNeighborhoodRows += 1;
      const scopedId = catalog.cityId + '\u0000' + neighborhood.id;
      if (seenIds.has(scopedId)) duplicateIds += 1;
      else {
        seenIds.add(scopedId);
        uniqueCityNeighborhoodIds += 1;
      }

      const variantIndex = (catalogNeighborhoodRows - 1) % VARIANTS.length;
      const sourceText = VARIANTS[variantIndex]!(neighborhood.name, catalog.cityName);
      const extracted = extractPostNaturalFields(sourceText);
      const result = resolvePostNeighborhoodInCity(
        catalog.neighborhoods,
        extracted.neighborhoodPhrase ?? '',
        catalog.cityName,
        sourceText,
      );
      const stats = variants[variantIndex]!;
      for (const bucket of [stats, cityStats]) {
        bucket.tested += 1;
        if (!extracted.neighborhoodPhrase) bucket.emptyExtractedPhrase += 1;
        if (result.hit?.id === neighborhood.id) bucket.exactTopOne += 1;
        else if (result.hit) bucket.wrongUniqueHit += 1;
        else if (result.candidates.some((candidate) => candidate.id === neighborhood.id)) {
          bucket.targetInAmbiguousCandidates += 1;
        } else if (result.candidates.length) bucket.ambiguousWithoutTarget += 1;
        else bucket.unresolved += 1;
      }
      if (result.hit && result.hit.id !== neighborhood.id && firstWrongUniqueHits.length < 16) {
        firstWrongUniqueHits.push({
          cityId: catalog.cityId,
          cityName: catalog.cityName,
          targetId: neighborhood.id,
          targetName: neighborhood.name,
          resolvedId: result.hit.id,
          resolvedName: result.hit.name,
          extractedPhrase: extracted.neighborhoodPhrase ?? null,
          variantIndex,
          state: sourceText,
        });
      }
      if (!result.hit && !result.candidates.some((candidate) => candidate.id === neighborhood.id) && firstUnresolved.length < 12) {
        firstUnresolved.push({
          cityId: catalog.cityId,
          cityName: catalog.cityName,
          targetId: neighborhood.id,
          targetName: neighborhood.name,
          extractedPhrase: extracted.neighborhoodPhrase ?? null,
          variantIndex,
          state: sourceText,
        });
      }
    }
  }

  const sum = (key: keyof VariantStats) => variants.reduce((total, item) => total + item[key], 0);
  const exactTopOne = sum('exactTopOne');
  const targetInCandidates = sum('targetInAmbiguousCandidates');
  const tested = sum('tested');
  console.log(JSON.stringify({
    status: 'complete',
    startedAt,
    elapsedMs: Math.round(performance.now() - started),
    auditScope: 'Every valid catalog neighborhood, one deterministic Persian location phrase, selected catalog city supplied as context.',
    interpretation: 'Catalog consistency and false-auto-apply audit only; generated text contains the expected catalog name and is not real-user recognition accuracy.',
    cityCatalogs: catalogs.length,
    invalidCityCatalogFiles: invalidFiles,
    catalogNeighborhoodRows,
    uniqueCityNeighborhoodIds,
    malformedNeighborhoodRows: malformedRows,
    duplicateCityScopedIds: duplicateIds,
    tested,
    exactTopOne,
    exactTopOnePct: tested ? Math.round((exactTopOne / tested) * 10_000) / 100 : null,
    targetInAmbiguousCandidates: targetInCandidates,
    candidateRecallPct: tested ? Math.round(((exactTopOne + targetInCandidates) / tested) * 10_000) / 100 : null,
    wrongUniqueHit: sum('wrongUniqueHit'),
    unresolved: sum('unresolved'),
    ambiguousWithoutTarget: sum('ambiguousWithoutTarget'),
    emptyExtractedPhrase: sum('emptyExtractedPhrase'),
    citiesWithMostWrongUniqueHits: [...byCity.values()]
      .filter((city) => city.wrongUniqueHit > 0)
      .sort((left, right) => right.wrongUniqueHit - left.wrongUniqueHit)
      .slice(0, 20)
      .map((city) => ({
        cityId: city.cityId,
        cityName: city.cityName,
        tested: city.tested,
        wrongUniqueHit: city.wrongUniqueHit,
        wrongUniqueHitPct: city.tested ? Math.round((city.wrongUniqueHit / city.tested) * 10_000) / 100 : null,
        unresolved: city.unresolved,
      })),
    firstWrongUniqueHits,
    firstUnresolved,
    variants,
  }, null, 2));
}

main();
