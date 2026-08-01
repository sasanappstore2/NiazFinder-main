import assert from 'node:assert/strict';
import { FILING_CATEGORY_TEMPLATES } from '@/lib/filing/filing-category-templates';
import { buildFilingDetailSections } from '@/lib/filing/filing-detail-sections';
import type { FilingViewModel } from '@/lib/filing/filing-view-model';

function baseVm(overrides: Partial<FilingViewModel> = {}): FilingViewModel {
  return {
    id: 'test',
    fileCode: '525823',
    title: 'رهن و اجاره آپارتمان 220 متری',
    description: null,
    dealType: 'rent_rahn_ejare',
    dealLabel: 'رهن و اجاره',
    propertyKind: 'apartment',
    kindLabel: 'آپارتمان',
    categorySlug: null,
    categoryLabel: null,
    city: 'مشهد',
    neighborhood: 'شهید فرامرز عباسی',
    district: null,
    location: 'مشهد - شهید فرامرز عباسی ۶',
    price: null,
    deposit: '1000000000',
    monthlyRent: '70000000',
    priceDisplay: null,
    area: '220',
    rooms: 3,
    floor: 1,
    pricePerMeter: null,
    buildingAge: null,
    documentType: null,
    totalFloors: null,
    unitsCount: null,
    cabinet: null,
    flooring: null,
    wallCover: null,
    facade: null,
    orientation: null,
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
    sourceMeta: {},
    postedAt: null,
    createdAt: null,
    sourceSite: 'maskanyaban',
    sourceLabel: null,
    isOwn: false,
    detailUrl: null,
    dataCompleteness: 40,
    enrichedAt: null,
    detailPath: '/f/test',
    images: [],
    coverImage: null,
    ...overrides,
  };
}

function main() {
  const sections = buildFilingDetailSections(baseVm());
  assert.equal(sections.specs.length, FILING_CATEGORY_TEMPLATES.apartment.specKeys.length);
  assert.equal(sections.specsSectionTitle, 'مشخصات آپارتمان');
  assert.ok(sections.specs.every((s) => 'value' in s));
  assert.equal(sections.priceRows.length, 2);
  assert.ok(sections.priceRows[0]?.hint);
  assert.equal(sections.showCompletenessBanner, true);

  const full = buildFilingDetailSections(
    baseVm({
      dataCompleteness: 85,
      totalFloors: 5,
      documentType: 'سند تک برگ',
      description: 'توضیح تست',
    })
  );
  assert.equal(full.showCompletenessBanner, false);
  assert.ok(full.filledSpecs.length >= 2);

  const shop = buildFilingDetailSections(
    baseVm({
      propertyKind: 'shop',
      dealType: 'sell',
      sourceMeta: { commercialUse: 'تجاری', frontage: '8' },
      buildingAge: 10,
      documentType: 'سند تک برگ',
    })
  );
  assert.equal(shop.specsSectionTitle, 'مشخصات مغازه');
  assert.ok(shop.filledSpecs.some((s) => s.key === 'commercialUse'));

  console.log('filing-detail-sections OK');
}

main();
