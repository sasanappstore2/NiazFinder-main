import type { StoredProperty } from '../types/property';
import type { ScrapedFilingRow } from '@/lib/filing-scrapers/estate-scrape-filing-client';

/** Maps internal V2 schema → legacy ScrapedFilingRow (downstream contract). */
export function storedPropertyToScrapedRow(property: StoredProperty): ScrapedFilingRow {
  const images = property.images ?? [];
  return {
    externalId: property.externalId,
    fileCode: property.fileCode ?? null,
    title: property.title,
    description: property.description ?? null,
    dealType: property.dealType === 'unknown' ? null : property.dealType,
    propertyKind: property.propertyKind === 'unknown' ? null : property.propertyKind,
    city: property.city ?? null,
    neighborhood: property.neighborhood ?? null,
    location: property.location ?? null,
    price: property.price ?? null,
    deposit: property.deposit ?? null,
    monthlyRent: property.monthlyRent ?? null,
    area: property.area ?? null,
    rooms: property.rooms ?? null,
    floor: property.floor ?? null,
    pricePerMeter: property.pricePerMeter ?? null,
    postedAt: property.postedAt ?? null,
    buildingAge: property.buildingAge ?? null,
    documentType: property.documentType ?? null,
    totalFloors: (property as { totalFloors?: number }).totalFloors ?? null,
    unitsCount: (property as { unitsCount?: number }).unitsCount ?? null,
    cabinet: (property as { cabinet?: string }).cabinet ?? null,
    flooring: (property as { flooring?: string }).flooring ?? null,
    wallCover: (property as { wallCover?: string }).wallCover ?? null,
    facade: (property as { facade?: string }).facade ?? null,
    orientation: (property as { orientation?: string }).orientation ?? null,
    heating: (property as { heating?: string }).heating ?? null,
    cooling: (property as { cooling?: string }).cooling ?? null,
    hasParking: property.amenities.parking ?? null,
    hasStorage: property.amenities.storage ?? null,
    hasElevator: property.amenities.elevator ?? null,
    hasSecurityDoor: property.amenities.securityDoor ?? null,
    exchangeable: property.amenities.exchangeable ?? null,
    hasTerrace: (property.amenities as { terrace?: boolean }).terrace ?? null,
    hasBuiltInWardrobe: (property.amenities as { builtInWardrobe?: boolean }).builtInWardrobe ?? null,
    detailUrl: property.detailUrl ?? null,
    image: images[0] ?? null,
    images,
    enrichedAt: property.enrichedAt ?? null,
    sourceMeta: (property as { sourceMeta?: Record<string, unknown> }).sourceMeta ?? null,
  };
}

export function storedPropertiesToScrapedRows(properties: StoredProperty[]): ScrapedFilingRow[] {
  return properties.map(storedPropertyToScrapedRow);
}
