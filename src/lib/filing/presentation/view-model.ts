import type { RegionalFiling } from '@prisma/client';
import type { PropertyListing } from '@/contracts/business-profile';
import { routeBuilder } from '@/config/routes';
import {
  publicFilingDetailUrl,
  publicFilingSourceLabel,
} from '@/lib/filing/presentation/public-brand';
import {
  DEAL_TYPE_LABELS,
  PROPERTY_KIND_LABELS,
  type FilingDealType,
  type FilingPropertyKind,
} from '@/lib/filing/schema/attribute-schema';
import { buildRegionalFilingLocationLabel } from '@/lib/filing/adapters/prisma-to-listing';
import { propertyListingDealTypeLabel } from '@/lib/business/real-estate-listing-deal-types';
import { propertyListingCategoryLabel } from '@/lib/business/real-estate-listing-categories';
import { listingPriceDisplay } from '@/lib/business/real-estate-listing-deal-types';
import type { WorkspaceFileItem } from '@/components/workspace/types';
import {
  inferAmenitiesFromDescription,
  mergeExtendedSpecsWithDescriptionFallback,
  mergeSourceMetaWithDescriptionFallback,
  sanitizeFilingDescription,
} from '@/lib/filing/content/sanitize-description';
import type { FilingAmenities, FilingSourceMeta } from '@/lib/filing/types';

export type { FilingAmenities, FilingSourceMeta };

export type FilingViewModel = {
  id: string;
  fileCode: string | null;
  title: string;
  description: string | null;
  dealType: FilingDealType | null;
  dealLabel: string | null;
  propertyKind: FilingPropertyKind | null;
  kindLabel: string | null;
  categorySlug: string | null;
  categoryLabel: string | null;
  city: string | null;
  neighborhood: string | null;
  location: string | null;
  price: string | null;
  deposit: string | null;
  monthlyRent: string | null;
  priceDisplay: string | null;
  area: string | null;
  rooms: number | null;
  floor: number | null;
  pricePerMeter: string | null;
  buildingAge: number | null;
  documentType: string | null;
  totalFloors: number | null;
  unitsCount: number | null;
  cabinet: string | null;
  flooring: string | null;
  wallCover: string | null;
  facade: string | null;
  orientation: string | null;
  heating: string | null;
  cooling: string | null;
  district: string | null;
  detailUrl: string | null;
  dataCompleteness: number | null;
  enrichedAt: string | null;
  amenities: FilingAmenities;
  sourceMeta: FilingSourceMeta;
  postedAt: string | null;
  createdAt: string | null;
  sourceSite: string | null;
  sourceLabel: string | null;
  isOwn: boolean;
  detailPath: string;
  images: string[];
  coverImage: string | null;
};

function parseImagesJson(json: string | null | undefined): string[] {
  if (!json?.trim()) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function parseSourceMetaJson(json: string | null | undefined): FilingSourceMeta {
  if (!json?.trim() || json.trim() === '{}') return {};
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    return {
      brokerOffice: typeof parsed.brokerOffice === 'string' ? parsed.brokerOffice : null,
      brokerPhone: typeof parsed.brokerPhone === 'string' ? parsed.brokerPhone : null,
      brokerAddress: typeof parsed.brokerAddress === 'string' ? parsed.brokerAddress : null,
      ownerAddress: typeof parsed.ownerAddress === 'string' ? parsed.ownerAddress : null,
      ownerPhone: typeof parsed.ownerPhone === 'string' ? parsed.ownerPhone : null,
      rawFeatures: typeof parsed.rawFeatures === 'string' ? parsed.rawFeatures : null,
      authenticated: parsed.authenticated === true,
      plotWidth: typeof parsed.plotWidth === 'string' ? parsed.plotWidth : null,
      landUse: typeof parsed.landUse === 'string' ? parsed.landUse : null,
      frontage: typeof parsed.frontage === 'string' ? parsed.frontage : null,
      commercialUse: typeof parsed.commercialUse === 'string' ? parsed.commercialUse : null,
    };
  } catch {
    return {};
  }
}

function sourceSiteLabel(site: string | null | undefined): string | null {
  return publicFilingSourceLabel(site);
}

function formatFileCodeDisplay(fileCode: string | null | undefined, id: string): string {
  const raw = fileCode?.trim() || id.replace(/[^a-zA-Z0-9]/g, '').slice(-6) || id.slice(-6);
  return raw;
}

export function regionalFilingToViewModel(
  row: RegionalFiling,
  opts?: { isOwn?: boolean; sourceLabel?: string | null }
): FilingViewModel {
  const images = parseImagesJson(row.imagesJson);
  const cover = row.image ?? images[0] ?? null;
  const rawDescription = row.description;
  const sourceMeta = mergeExtendedSpecsWithDescriptionFallback(
    mergeSourceMetaWithDescriptionFallback(
      parseSourceMetaJson(row.sourceMetaJson),
      rawDescription
    ),
    rawDescription
  );
  const description = sanitizeFilingDescription(rawDescription);
  const descAmenities = inferAmenitiesFromDescription(rawDescription);
  const dealType = (row.dealType as FilingDealType | null) ?? null;
  const propertyKind = (row.propertyKind as FilingPropertyKind | null) ?? null;
  const postedAt = row.postedAt?.toISOString() ?? row.scrapedAt?.toISOString() ?? null;

  return {
    id: row.id,
    fileCode: row.fileCode,
    title: row.title,
    description,
    dealType,
    dealLabel: dealType ? DEAL_TYPE_LABELS[dealType] : null,
    propertyKind,
    kindLabel: propertyKind ? PROPERTY_KIND_LABELS[propertyKind] : null,
    categorySlug: row.categorySlug,
    categoryLabel: propertyListingCategoryLabel(row.categorySlug ?? undefined) ?? null,
    city: row.city,
    neighborhood: row.neighborhood,
    district: row.district,
    location: row.location ?? buildRegionalFilingLocationLabel(row),
    price: row.price,
    deposit: row.deposit,
    monthlyRent: row.monthlyRent,
    priceDisplay: listingPriceDisplay({
      dealType: dealType ?? undefined,
      price: row.price ?? undefined,
      deposit: row.deposit ?? undefined,
      monthlyRent: row.monthlyRent ?? undefined,
    }) ?? null,
    area: row.area,
    rooms: row.rooms,
    floor: row.floor,
    pricePerMeter: row.pricePerMeter,
    buildingAge: row.buildingAge,
    documentType: row.documentType,
    totalFloors: row.totalFloors,
    unitsCount: row.unitsCount,
    cabinet: row.cabinet,
    flooring: row.flooring,
    wallCover: row.wallCover,
    facade: row.facade,
    orientation: row.orientation,
    heating: row.heating,
    cooling: row.cooling,
    amenities: {
      parking: row.hasParking === true || descAmenities.parking === true,
      storage: row.hasStorage === true || descAmenities.storage === true,
      elevator: row.hasElevator === true || descAmenities.elevator === true,
      securityDoor: row.hasSecurityDoor === true || descAmenities.securityDoor === true,
      exchangeable: row.exchangeable === true,
      terrace: row.hasTerrace === true || sourceMeta.rawFeatures?.includes('تراس') === true,
      builtInWardrobe:
        row.hasBuiltInWardrobe === true ||
        descAmenities.builtInWardrobe === true ||
        sourceMeta.rawFeatures?.includes('کمد') === true ||
        sourceMeta.rawFeatures?.includes('کمد دیواری') === true,
      builtInGas:
        descAmenities.builtInGas === true ||
        sourceMeta.rawFeatures?.includes('گاز') === true,
    },
    sourceMeta,
    postedAt,
    createdAt: row.createdAt.toISOString(),
    sourceSite: row.sourceSite,
    sourceLabel: opts?.sourceLabel ?? sourceSiteLabel(row.sourceSite),
    isOwn: opts?.isOwn === true,
    detailUrl: publicFilingDetailUrl(row.detailUrl),
    dataCompleteness: row.dataCompleteness,
    enrichedAt: row.enrichedAt?.toISOString() ?? null,
    detailPath: routeBuilder.filingDetail(row.id),
    images,
    coverImage: cover,
  };
}

export function workspaceFileItemToViewModel(item: WorkspaceFileItem): FilingViewModel {
  const listing = item.listing;
  const dealType = (listing.dealType as FilingDealType | null) ?? null;
  const propertyKind = (listing.propertyType as FilingPropertyKind | null) ?? null;

  return {
    id: item.id,
    fileCode: listing.fileCode ?? null,
    title: listing.title,
    description: listing.description ?? null,
    dealType,
    dealLabel: item.dealLabel || propertyListingDealTypeLabel(listing.dealType),
    propertyKind,
    kindLabel: propertyKind ? PROPERTY_KIND_LABELS[propertyKind] : null,
    categorySlug: listing.categorySlug ?? null,
    categoryLabel: item.categoryLabel,
    city: null,
    neighborhood: null,
    district: null,
    location: listing.location ?? null,
    price: listing.price ?? null,
    deposit: listing.deposit ?? null,
    monthlyRent: listing.monthlyRent ?? null,
    priceDisplay: item.priceDisplay,
    area: listing.area ?? null,
    rooms: listing.rooms ?? null,
    floor: listing.floor ?? null,
    pricePerMeter: listing.pricePerMeter ?? null,
    buildingAge: listing.buildingAge ?? null,
    documentType: listing.deedType ?? null,
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
    postedAt: listing.postedAt ?? null,
    createdAt: item.createdAt ?? listing.createdAt ?? null,
    sourceSite: listing.sourceSite ?? null,
    sourceLabel: item.sourceProvider === 'پروفایل من' ? 'پروفایل من' : publicFilingSourceLabel(listing.sourceSite),
    isOwn: item.sourceProvider === 'پروفایل من',
    detailUrl: publicFilingDetailUrl(item.detailUrl ?? null),
    dataCompleteness: null,
    enrichedAt: null,
    detailPath: item.detailUrl ?? routeBuilder.filingDetail(item.id),
    images: listing.images ?? (listing.image ? [listing.image] : []),
    coverImage: listing.image ?? listing.images?.[0] ?? null,
  };
}

export function viewModelFileCodeDisplay(vm: FilingViewModel): string {
  return formatFileCodeDisplay(vm.fileCode, vm.id);
}

export function viewModelDisplayDate(vm: FilingViewModel): string | null {
  return vm.postedAt ?? vm.createdAt;
}
