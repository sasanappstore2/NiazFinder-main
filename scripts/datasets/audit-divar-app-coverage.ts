#!/usr/bin/env bun
/** Aggregate-only coverage audit: Divar real-estate offers vs the live /post catalogs. */
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { CANONICAL_CATEGORIES } from '@/config/categories';

type Json = Record<string, any>;

const ROOT = process.cwd();
const CATALOG_DIR = join(ROOT, 'src/data/neighborhoods/catalog');
const DEFAULT_SOURCE_MANIFEST = join(
  ROOT,
  'data/divar/divar-property-offer-facts-v4-exact-current-city-map-2026-09-28.jsonl.manifest.json',
);
const CROSSWALK = join(ROOT, 'data/divar/official-neighborhood-app-crosswalk-2026-09-28-legacy-aliases.json');
const REAL_ESTATE_LEAF_PARENTS = new Set([
  'residential-sale',
  'residential-rent',
  'commercial-sale',
  'commercial-rent',
  'short-term-rent',
  'real-estate-services',
]);

export type DivarCoverageInput = {
  appCategorySlugs: string[];
  sourceCategoryCounts: Record<string, number>;
  appCityCatalogCount: number;
  appNeighborhoodRows: number;
  appUniqueCityNeighborhoodIds: number;
  invalidAppCatalogs: number;
  sourceRowsRead: number;
  normalizedOfferRows: number;
  normalizedTextGroups: number;
  rowsSkippedConflict: number;
  rowsSkippedMissingText: number;
  rowsSkippedUnmappedCategory: number;
  sourceCityCount: number;
  sourceCitiesMappedToApp: number;
  sourceRowsWithMappedAppCity: number;
  sourceRowsWithMappedAppNeighborhood: number;
  sourceCityNeighborhoodPairs: number;
  exactAppCatalogMatchedPairs: number;
  legacyAliasMatchedPairs: number;
  sourceRowsWithLegacyAlias: number;
  crosswalkRowsWithExactAppCatalogMatch: number;
  unresolvedNeighborhoodPairs: number;
  cloudTransferAllowed: boolean;
  licenseReviewRequiredBeforeRedistribution: boolean;
};

function percent(numerator: number, denominator: number): number | null {
  return denominator > 0 ? Math.round((numerator / denominator) * 10_000) / 100 : null;
}

export function summarizeDivarAppCoverage(input: DivarCoverageInput) {
  const appCategories = [...new Set(input.appCategorySlugs)].sort();
  const sourceCategories = Object.keys(input.sourceCategoryCounts).sort();
  const appCategorySet = new Set(appCategories);
  const sourceCategorySet = new Set(sourceCategories);
  const rowsSkippedByNormalizer =
    input.rowsSkippedConflict + input.rowsSkippedMissingText + input.rowsSkippedUnmappedCategory;
  const rawCrosswalkResolvedNeighborhoodRows =
    input.crosswalkRowsWithExactAppCatalogMatch + input.sourceRowsWithLegacyAlias;
  const rawToNormalizedNeighborhoodDelta =
    rawCrosswalkResolvedNeighborhoodRows - input.sourceRowsWithMappedAppNeighborhood;

  return {
    sourceRowsRead: input.sourceRowsRead,
    normalizedOfferRows: input.normalizedOfferRows,
    normalizedTextGroups: input.normalizedTextGroups,
    sourceRowReconciliation: {
      rowsSkippedByNormalizer,
      skippedBreakdown: {
        conflict: input.rowsSkippedConflict,
        missingText: input.rowsSkippedMissingText,
        unmappedCategory: input.rowsSkippedUnmappedCategory,
      },
      rawCrosswalkResolvedNeighborhoodRows,
      retainedCorpusResolvedNeighborhoodRows: input.sourceRowsWithMappedAppNeighborhood,
      rawMatchedRowsAbsentFromRetainedCorpus: rawToNormalizedNeighborhoodDelta,
      deltaFitsWithinRowsSkippedByNormalizer:
        rawToNormalizedNeighborhoodDelta >= 0 && rawToNormalizedNeighborhoodDelta <= rowsSkippedByNormalizer,
      omissionReasonReconciledAtRowLevel: false,
      note: 'Exact and legacy-alias crosswalk rows are combined to match the v4 manifest grain of retained rows with any resolved app neighborhood. Aggregate manifests do not identify which skipped rows were mapped.',
    },
    appCategories: {
      count: appCategories.length,
      sourceCategoryCount: sourceCategories.length,
      missingFromSource: appCategories.filter((slug) => !sourceCategorySet.has(slug)),
      sourceOutsideApp: sourceCategories.filter((slug) => !appCategorySet.has(slug)),
    },
    appLocations: {
      cityCatalogs: input.appCityCatalogCount,
      invalidCityCatalogs: input.invalidAppCatalogs,
      neighborhoodRows: input.appNeighborhoodRows,
      uniqueCityNeighborhoodIds: input.appUniqueCityNeighborhoodIds,
    },
    sourceCityCoverage: {
      sourceCities: input.sourceCityCount,
      sourceCitiesMappedToApp: input.sourceCitiesMappedToApp,
      shareOfSourceCitiesMappedPct: percent(input.sourceCitiesMappedToApp, input.sourceCityCount),
      shareOfAppCityCatalogsCoveredPct: percent(input.sourceCitiesMappedToApp, input.appCityCatalogCount),
      sourceRowsWithMappedAppCity: input.sourceRowsWithMappedAppCity,
      shareOfNormalizedOffersWithMappedCityPct: percent(input.sourceRowsWithMappedAppCity, input.normalizedOfferRows),
    },
    sourceNeighborhoodCoverage: {
      sourceCityNeighborhoodPairs: input.sourceCityNeighborhoodPairs,
      exactAppCatalogMatchedPairs: input.exactAppCatalogMatchedPairs,
      unresolvedPairs: input.unresolvedNeighborhoodPairs,
      exactPairCoveragePct: percent(input.exactAppCatalogMatchedPairs, input.sourceCityNeighborhoodPairs),
      legacyAliasMatchedPairs: input.legacyAliasMatchedPairs,
      sourceRowsWithLegacyAlias: input.sourceRowsWithLegacyAlias,
      resolvedPairsIncludingLegacyAliases:
        input.exactAppCatalogMatchedPairs + input.legacyAliasMatchedPairs,
      pairCoverageIncludingLegacyAliasesPct: percent(
        input.exactAppCatalogMatchedPairs + input.legacyAliasMatchedPairs,
        input.sourceCityNeighborhoodPairs,
      ),
      crosswalkRowsWithExactAppCatalogMatch: input.crosswalkRowsWithExactAppCatalogMatch,
      crosswalkRowsWithResolvedAppCatalog:
        input.crosswalkRowsWithExactAppCatalogMatch + input.sourceRowsWithLegacyAlias,
      rowsWithMappedAppNeighborhoodFromSourceManifest: input.sourceRowsWithMappedAppNeighborhood,
      crosswalkVsManifestRowDelta: rawToNormalizedNeighborhoodDelta,
      shareOfNormalizedOffersWithMappedNeighborhoodPct: percent(
        input.sourceRowsWithMappedAppNeighborhood,
        input.normalizedOfferRows,
      ),
    },
    transferAndRights: {
      cloudTransferAllowed: input.cloudTransferAllowed,
      licenseReviewRequiredBeforeRedistribution: input.licenseReviewRequiredBeforeRedistribution,
    },
  };
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, 'utf8')) as Json;
}

function main(): void {
  const sourceManifestFlag = process.argv.indexOf('--source-manifest');
  const sourceManifestPath = sourceManifestFlag >= 0
    ? resolve(ROOT, process.argv[sourceManifestFlag + 1] ?? '')
    : DEFAULT_SOURCE_MANIFEST;
  const source = readJson(sourceManifestPath);
  const crosswalk = readJson(CROSSWALK);
  const appCategorySlugs = CANONICAL_CATEGORIES
    .filter((category) => category.depth === 2 && REAL_ESTATE_LEAF_PARENTS.has(category.parentSlug ?? ''))
    .map((category) => category.slug);
  const validCatalogs: Json[] = [];
  let invalidAppCatalogs = 0;
  for (const filename of readdirSync(CATALOG_DIR)) {
    if (!filename.endsWith('.json')) continue;
    try {
      const catalog = readJson(join(CATALOG_DIR, filename));
      if (
        catalog.cityId === filename.slice(0, -'.json'.length) &&
        typeof catalog.cityName === 'string' &&
        Array.isArray(catalog.neighborhoods)
      ) validCatalogs.push(catalog);
      else invalidAppCatalogs += 1;
    } catch {
      invalidAppCatalogs += 1;
    }
  }

  let appNeighborhoodRows = 0;
  const uniqueCityNeighborhoodIds = new Set<string>();
  for (const catalog of validCatalogs) {
    for (const neighborhood of catalog.neighborhoods as Array<{ id?: unknown }>) {
      appNeighborhoodRows += 1;
      if (typeof neighborhood?.id === 'string' && neighborhood.id.trim()) {
        uniqueCityNeighborhoodIds.add(`${catalog.cityId}\u0000${neighborhood.id}`);
      }
    }
  }

  const report = summarizeDivarAppCoverage({
    appCategorySlugs,
    sourceCategoryCounts: source.categoryCounts ?? {},
    appCityCatalogCount: validCatalogs.length,
    appNeighborhoodRows,
    appUniqueCityNeighborhoodIds: uniqueCityNeighborhoodIds.size,
    invalidAppCatalogs,
    sourceRowsRead: Number(source.sourceRowsRead ?? 0),
    normalizedOfferRows: Number(source.outputRows ?? 0),
    normalizedTextGroups: Number(source.normalizedTextGroups ?? 0),
    rowsSkippedConflict: Number(source.rowsSkippedConflict ?? 0),
    rowsSkippedMissingText: Number(source.rowsSkippedMissingText ?? 0),
    rowsSkippedUnmappedCategory: Number(source.rowsSkippedUnmappedCategory ?? 0),
    sourceCityCount: Number(source.distinctSourceCities ?? 0),
    sourceCitiesMappedToApp: Number(source.sourceCitiesMappedToApp ?? 0),
    sourceRowsWithMappedAppCity: Number(source.rowsWithMappedAppCity ?? 0),
    sourceRowsWithMappedAppNeighborhood: Number(source.rowsWithMappedAppNeighborhood ?? 0),
    sourceCityNeighborhoodPairs: Number(crosswalk.coverage?.sourceCityNeighborhoodPairs ?? 0),
      exactAppCatalogMatchedPairs: Number(crosswalk.coverage?.exactAppCatalogMatchedPairs ?? 0),
      legacyAliasMatchedPairs: Number(crosswalk.coverage?.legacyAliasMatchedPairs ?? 0),
      sourceRowsWithLegacyAlias: Number(crosswalk.coverage?.sourceRowsWithLegacyAlias ?? 0),
      crosswalkRowsWithExactAppCatalogMatch: Number(crosswalk.coverage?.sourceRowsWithExactAppCatalogMatch ?? 0),
    unresolvedNeighborhoodPairs: Number(crosswalk.coverage?.unresolvedPairs ?? 0),
    cloudTransferAllowed: source.cloudTransferAllowed === true,
    licenseReviewRequiredBeforeRedistribution: source.licenseReviewRequiredBeforeRedistribution === true,
  });

  console.log(JSON.stringify(report, null, 2));
}

if (import.meta.main) main();
