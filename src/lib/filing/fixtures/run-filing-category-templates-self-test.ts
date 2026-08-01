import assert from 'node:assert/strict';
import {
  exportFilingCrawlManifest,
  FILING_CATEGORY_TEMPLATES,
  resolveFilingCategoryTemplate,
} from '@/lib/filing/filing-category-templates';
import { buildFilingDetailSections } from '@/lib/filing/filing-detail-sections';
import type { FilingViewModel } from '@/lib/filing/filing-view-model';

function baseVm(overrides: Partial<FilingViewModel> = {}): FilingViewModel {
  return {
    id: 'test',
    fileCode: '610101',
    title: 'فروش زمین',
    description: null,
    dealType: 'sell',
    dealLabel: 'فروش',
    propertyKind: 'land',
    kindLabel: 'زمین',
    categorySlug: null,
    categoryLabel: null,
    city: 'مشهد',
    neighborhood: 'احمدآباد',
    district: null,
    location: 'مشهد - احمدآباد',
    price: '8000000000',
    deposit: null,
    monthlyRent: null,
    priceDisplay: null,
    area: '500',
    rooms: null,
    floor: null,
    pricePerMeter: '16000000',
    buildingAge: null,
    documentType: 'سند تک برگ',
    totalFloors: null,
    unitsCount: null,
    cabinet: null,
    flooring: null,
    wallCover: null,
    facade: null,
    orientation: 'شمالی',
    heating: null,
    cooling: null,
    amenities: {
      parking: false,
      storage: false,
      elevator: false,
      securityDoor: false,
      exchangeable: false,
      terrace: false,
      builtInWardrobe: false,
      builtInGas: false,
    },
    sourceMeta: {
      landUse: 'مسکونی',
      frontage: '25',
      plotWidth: '20',
    },
    postedAt: null,
    createdAt: null,
    sourceSite: 'maskanyaban',
    sourceLabel: null,
    isOwn: false,
    detailUrl: null,
    dataCompleteness: 70,
    enrichedAt: null,
    detailPath: '/f/test',
    images: [],
    coverImage: null,
    ...overrides,
  };
}

function main() {
  const kinds = ['apartment', 'villa', 'land', 'shop', 'office', 'commercial'] as const;
  for (const kind of kinds) {
    const tpl = resolveFilingCategoryTemplate(kind);
    assert.equal(tpl.kind, kind);
    assert.ok(tpl.specKeys.length >= 4, `${kind}: specKeys`);
    assert.ok(tpl.crawlDetailRequired.includes('fileCode'), `${kind}: crawl required`);
  }

  const landSections = buildFilingDetailSections(baseVm());
  assert.equal(landSections.specsSectionTitle, 'مشخصات زمین');
  assert.equal(landSections.specs.length, FILING_CATEGORY_TEMPLATES.land.specKeys.length);
  assert.ok(landSections.filledSpecs.some((s) => s.key === 'landUse'));
  assert.ok(landSections.filledSpecs.some((s) => s.key === 'frontage'));

  const aptSections = buildFilingDetailSections(
    baseVm({
      propertyKind: 'apartment',
      sourceMeta: {},
      floor: 3,
      rooms: 2,
    })
  );
  assert.equal(aptSections.specsSectionTitle, 'مشخصات آپارتمان');
  assert.equal(aptSections.specs.length, 14);

  const manifest = exportFilingCrawlManifest();
  assert.equal(Object.keys(manifest).length, 6);
  assert.ok(manifest.land.specLabels.landUse === 'کاربری');

  console.log('filing-category-templates OK');
}

main();
