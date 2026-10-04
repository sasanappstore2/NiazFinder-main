import { summarizeDivarAppCoverage } from './audit-divar-app-coverage';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const report = summarizeDivarAppCoverage({
  appCategorySlugs: ['apartment-rent', 'land-rent', 'apartment-rent'],
  sourceCategoryCounts: { 'apartment-rent': 3 },
  appCityCatalogCount: 10,
  appNeighborhoodRows: 100,
  appUniqueCityNeighborhoodIds: 98,
  invalidAppCatalogs: 0,
  sourceRowsRead: 1000,
  normalizedOfferRows: 900,
  normalizedTextGroups: 875,
  rowsSkippedConflict: 90,
  rowsSkippedMissingText: 5,
  rowsSkippedUnmappedCategory: 5,
  sourceCityCount: 5,
  sourceCitiesMappedToApp: 4,
  sourceRowsWithMappedAppCity: 800,
  sourceRowsWithMappedAppNeighborhood: 300,
  sourceCityNeighborhoodPairs: 20,
  exactAppCatalogMatchedPairs: 18,
  legacyAliasMatchedPairs: 1,
  sourceRowsWithLegacyAlias: 9,
  crosswalkRowsWithExactAppCatalogMatch: 310,
  unresolvedNeighborhoodPairs: 2,
  cloudTransferAllowed: false,
  licenseReviewRequiredBeforeRedistribution: true,
});

assert(report.appCategories.count === 2, 'category slugs should be deduplicated');
assert(report.appCategories.missingFromSource.join(',') === 'land-rent', 'missing app leaves should be explicit');
assert(report.sourceCityCoverage.shareOfSourceCitiesMappedPct === 80, 'source-city mapping rate should be correct');
assert(report.sourceCityCoverage.shareOfAppCityCatalogsCoveredPct === 40, 'app-city coverage should use the app denominator');
assert(report.sourceNeighborhoodCoverage.exactPairCoveragePct === 90, 'exact neighborhood-pair coverage should be correct');
assert(report.sourceNeighborhoodCoverage.pairCoverageIncludingLegacyAliasesPct === 95, 'legacy aliases must be reported separately and in the combined coverage rate');
assert(report.sourceNeighborhoodCoverage.sourceRowsWithLegacyAlias === 9, 'legacy source rows should remain visible as alias-only matches');
assert(report.sourceNeighborhoodCoverage.crosswalkRowsWithResolvedAppCatalog === 319, 'exact and legacy crosswalk rows should share the retained-corpus location grain');
assert(report.sourceNeighborhoodCoverage.crosswalkVsManifestRowDelta === 19, 'combined crosswalk and retained mapped rows should reconcile');
assert(report.sourceRowReconciliation.rawCrosswalkResolvedNeighborhoodRows === 319, 'reconciliation should include exact and alias source rows');
assert(report.sourceRowReconciliation.rowsSkippedByNormalizer === 100, 'normalizer skip counts should be summed');
assert(report.sourceRowReconciliation.deltaFitsWithinRowsSkippedByNormalizer, 'raw-to-retained delta should be bounded by skipped rows');
assert(!report.sourceRowReconciliation.omissionReasonReconciledAtRowLevel, 'aggregate counts must not claim row-level attribution');
assert(report.transferAndRights.cloudTransferAllowed === false, 'cloud-transfer restriction should remain visible');

console.log('Divar app coverage audit: 10 checks passed');
