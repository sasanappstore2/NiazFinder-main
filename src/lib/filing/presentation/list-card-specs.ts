import type { PropertyListing } from '@/contracts/business-profile';
import { inferListingPropertyKind } from '@/lib/filing/schema/preferences';
import {
  isFilingPropertyKind,
  type FilingPropertyKind,
} from '@/lib/filing/schema/attribute-schema';
import type { FilingTemplateSpecKey } from '@/lib/filing/schema/category-templates';
import { resolveFilingCategoryTemplate } from '@/lib/filing/schema/category-templates';
import { filingSpecValue, type FilingSpecCarrier } from '@/lib/filing/content/spec-values';
import { toPersianDigits } from '@/lib/format/digits';

export type FilingListSpecChip = {
  key: string;
  label: string;
  icon:
    | 'area'
    | 'rooms'
    | 'age'
    | 'floor'
    | 'document'
    | 'landUse'
    | 'frontage'
    | 'orientation'
    | 'commercialUse'
    | 'plotWidth'
    | 'facade';
};

const SPEC_ICON: Record<FilingTemplateSpecKey, FilingListSpecChip['icon']> = {
  floor: 'floor',
  totalFloors: 'floor',
  unitsCount: 'rooms',
  rooms: 'rooms',
  buildingAge: 'age',
  documentType: 'document',
  cabinet: 'document',
  flooring: 'document',
  wallCover: 'document',
  facade: 'facade',
  orientation: 'orientation',
  heating: 'document',
  cooling: 'document',
  exchangeable: 'document',
  plotWidth: 'plotWidth',
  landUse: 'landUse',
  frontage: 'frontage',
  commercialUse: 'commercialUse',
};

export function resolveListingFilingKind(listing: PropertyListing): FilingPropertyKind {
  const raw = listing.propertyType?.trim();
  if (raw && isFilingPropertyKind(raw)) return raw;

  const inferred = inferListingPropertyKind(listing);
  if (inferred === 'apartment' || inferred === 'villa' || inferred === 'land') return inferred;
  if (inferred === 'commercial') {
    const slug = `${listing.categorySlug ?? ''} ${listing.propertyType ?? ''}`.toLowerCase();
    if (slug.includes('shop') || slug.includes('مغازه')) return 'shop';
    if (slug.includes('office') || slug.includes('دفتر')) return 'office';
    return 'commercial';
  }
  return 'apartment';
}

function parseBuildAgeYears(listing: PropertyListing): number | null {
  if (typeof listing.buildingAge === 'number' && listing.buildingAge > 0) {
    return listing.buildingAge;
  }
  const hay = `${listing.title ?? ''} ${listing.description ?? ''}`;
  const ageMatch = hay.match(/(\d{1,2})\s*سال\s*ساخت/u);
  if (!ageMatch) return null;
  const n = Number(ageMatch[1]);
  return Number.isFinite(n) && n > 0 && n < 100 ? n : null;
}

export function propertyListingToSpecCarrier(listing: PropertyListing): FilingSpecCarrier {
  return {
    floor: listing.floor ?? null,
    rooms: listing.rooms ?? null,
    totalFloors: null,
    unitsCount: null,
    buildingAge: parseBuildAgeYears(listing),
    documentType: listing.deedType ?? null,
    cabinet: null,
    flooring: null,
    wallCover: null,
    facade: listing.facade ?? null,
    orientation: listing.orientation ?? null,
    heating: null,
    cooling: null,
    amenities: { exchangeable: false },
    sourceMeta: {
      plotWidth: listing.plotWidth ?? null,
      landUse: listing.landUse ?? null,
      frontage: listing.frontage ?? null,
      commercialUse: listing.commercialUse ?? null,
    },
  };
}

function formatBrowseSpecLabel(key: FilingTemplateSpecKey, rawValue: string): string {
  const value = rawValue.trim();
  if (!value) return value;

  switch (key) {
    case 'floor':
      return value.includes('طبقه') ? value : `طبقه ${value}`;
    case 'rooms':
      return value.includes('خواب') ? value : `${value} خوابه`;
    case 'buildingAge':
      return value.includes('سال') ? value : `${value} سال ساخت`;
    case 'landUse':
      return value.startsWith('کاربری') ? value : value;
    case 'frontage':
      return value.includes('بر') ? value : `بر ${value}`;
    case 'plotWidth':
      return value.includes('عرض') ? value : `عرض ${value}`;
    case 'commercialUse':
      return value.startsWith('نوع') ? value : value;
    default:
      return value;
  }
}

export function buildCategoryFilingListSpecs(listing: PropertyListing): FilingListSpecChip[] {
  const kind = resolveListingFilingKind(listing);
  const template = resolveFilingCategoryTemplate(kind);
  const carrier = propertyListingToSpecCarrier(listing);
  const specs: FilingListSpecChip[] = [];

  for (const key of template.browseListSpecKeys) {
    const raw = filingSpecValue(carrier, key);
    if (!raw) continue;
    specs.push({
      key,
      icon: SPEC_ICON[key],
      label: formatBrowseSpecLabel(key, raw),
    });
  }

  return specs;
}

/** Area chip for legacy cards when template specs omit it (shown in `.size` box on /f). */
export function buildListingAreaSpecChip(
  listing: PropertyListing,
  areaSqm: number | null
): FilingListSpecChip | null {
  if (!areaSqm) return null;
  return {
    key: 'area',
    icon: 'area',
    label: `${toPersianDigits(areaSqm)} متر زیربنا`,
  };
}
