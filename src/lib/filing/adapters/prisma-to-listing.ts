import { z } from 'zod';
import type { RegionalFiling } from '@prisma/client';
import type { PropertyListing } from '@/contracts/business-profile';
import type { WorkspacePropertyKind } from '@/lib/business/ecosystem/types';
import { WORKSPACE_PROPERTY_KIND_OPTIONS } from '@/lib/filing/schema/preferences';

const dealTypeSchema = z.enum([
  'sell',
  'rent_rahn_ejare',
  'rent_rahn_full',
  'rent_short_term',
]);

import { resolveCategorySlug } from '@/lib/filing/schema/attribute-schema';

const propertyKindSchema = z.enum(['apartment', 'villa', 'land', 'office', 'shop', 'commercial']);

export const regionalFilingWriteSchema = z.object({
  fileCode: z.string().trim().max(32).optional().nullable(),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  dealType: dealTypeSchema.optional().nullable(),
  categorySlug: z.string().trim().max(80).optional().nullable(),
  propertyKind: propertyKindSchema.optional().nullable(),
  city: z.string().trim().min(2).max(80),
  cityId: z.string().trim().max(64).optional().nullable(),
  district: z.string().trim().max(80).optional().nullable(),
  neighborhood: z.string().trim().max(80).optional().nullable(),
  neighborhoodId: z.string().trim().max(64).optional().nullable(),
  location: z.string().trim().max(120).optional().nullable(),
  price: z.string().trim().max(40).optional().nullable(),
  deposit: z.string().trim().max(40).optional().nullable(),
  monthlyRent: z.string().trim().max(40).optional().nullable(),
  area: z.string().trim().max(20).optional().nullable(),
  rooms: z.coerce.number().int().min(0).max(30).optional().nullable(),
  floor: z.coerce.number().int().min(-3).max(60).optional().nullable(),
  pricePerMeter: z.string().trim().max(40).optional().nullable(),
  postedAt: z.coerce.date().optional().nullable(),
  totalFloors: z.coerce.number().int().min(0).max(60).optional().nullable(),
  unitsCount: z.coerce.number().int().min(0).max(200).optional().nullable(),
  buildingAge: z.coerce.number().int().min(0).max(150).optional().nullable(),
  documentType: z.string().trim().max(80).optional().nullable(),
  cabinet: z.string().trim().max(80).optional().nullable(),
  flooring: z.string().trim().max(80).optional().nullable(),
  wallCover: z.string().trim().max(80).optional().nullable(),
  facade: z.string().trim().max(80).optional().nullable(),
  orientation: z.string().trim().max(80).optional().nullable(),
  heating: z.string().trim().max(80).optional().nullable(),
  cooling: z.string().trim().max(80).optional().nullable(),
  exchangeable: z.boolean().optional().nullable(),
  hasParking: z.boolean().optional().nullable(),
  hasStorage: z.boolean().optional().nullable(),
  hasElevator: z.boolean().optional().nullable(),
  hasSecurityDoor: z.boolean().optional().nullable(),
  hasTerrace: z.boolean().optional().nullable(),
  hasBuiltInWardrobe: z.boolean().optional().nullable(),
  detailUrl: z.string().trim().max(500).optional().nullable(),
  sourceMetaJson: z.string().optional().nullable(),
  imagesJson: z.string().optional().nullable(),
  image: z.string().trim().max(500).optional().nullable(),
  status: z.enum(['active', 'archived', 'pending_review']).optional(),
});

export type RegionalFilingWriteInput = z.infer<typeof regionalFilingWriteSchema>;

function parseReviewIssues(json: string | null | undefined): string[] {
  if (!json?.trim()) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function resolveCategorySlugFromKind(
  propertyKind: WorkspacePropertyKind | null | undefined,
  dealType?: string | null
): string | undefined {
  return resolveCategorySlug(dealType, propertyKind);
}

export function buildRegionalFilingLocationLabel(input: {
  city: string;
  district?: string | null;
  neighborhood?: string | null;
  location?: string | null;
}): string {
  if (input.location?.trim()) return input.location.trim();
  return [input.neighborhood, input.district, input.city].filter(Boolean).join('، ');
}

export function regionalFilingToPropertyListing(row: RegionalFiling): PropertyListing {
  let images: string[] = [];
  try {
    const parsed = JSON.parse(row.imagesJson || '[]');
    images = Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    images = [];
  }

  let sourceMeta: Record<string, string> = {};
  try {
    const meta = JSON.parse(row.sourceMetaJson || '{}');
    if (meta && typeof meta === 'object') {
      sourceMeta = meta as Record<string, string>;
    }
  } catch {
    sourceMeta = {};
  }

  const categorySlug =
    row.categorySlug ??
    resolveCategorySlugFromKind(row.propertyKind as WorkspacePropertyKind | null, row.dealType);

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    dealType: (row.dealType as PropertyListing['dealType']) ?? undefined,
    categorySlug,
    propertyType: row.propertyKind ?? undefined,
    cityId: row.cityId ?? undefined,
    neighborhoodId: row.neighborhoodId ?? undefined,
    location: buildRegionalFilingLocationLabel(row),
    price: row.price ?? undefined,
    deposit: row.deposit ?? undefined,
    monthlyRent: row.monthlyRent ?? undefined,
    area: row.area ?? undefined,
    rooms: row.rooms ?? undefined,
    floor: row.floor ?? undefined,
    pricePerMeter: row.pricePerMeter ?? undefined,
    deedType: row.documentType ?? undefined,
    fileCode: row.fileCode ?? undefined,
    buildingAge: row.buildingAge ?? undefined,
    orientation: row.orientation ?? undefined,
    facade: row.facade ?? undefined,
    plotWidth: typeof sourceMeta.plotWidth === 'string' ? sourceMeta.plotWidth : undefined,
    landUse: typeof sourceMeta.landUse === 'string' ? sourceMeta.landUse : undefined,
    frontage: typeof sourceMeta.frontage === 'string' ? sourceMeta.frontage : undefined,
    commercialUse:
      typeof sourceMeta.commercialUse === 'string' ? sourceMeta.commercialUse : undefined,
    postedAt: row.postedAt?.toISOString() ?? row.scrapedAt?.toISOString() ?? undefined,
    sourceSite: row.sourceSite ?? undefined,
    image: row.image ?? images[0],
    images: images.length ? images : row.image ? [row.image] : undefined,
    status: 'active',
    createdAt: (row.postedAt ?? row.scrapedAt ?? row.createdAt).toISOString(),
    amenities: {
      parking: row.hasParking === true,
      storage: row.hasStorage === true,
      elevator: row.hasElevator === true,
      securityDoor: row.hasSecurityDoor === true,
      exchangeable: row.exchangeable === true,
      terrace: row.hasTerrace === true,
      builtInWardrobe: row.hasBuiltInWardrobe === true,
    },
  };
}

export function serializeRegionalFilingRow(row: RegionalFiling) {
  return {
    id: row.id,
    fileCode: row.fileCode,
    title: row.title,
    description: row.description,
    dealType: row.dealType,
    categorySlug: row.categorySlug,
    propertyKind: row.propertyKind,
    city: row.city,
    cityId: row.cityId,
    district: row.district,
    neighborhood: row.neighborhood,
    neighborhoodId: row.neighborhoodId,
    location: row.location ?? buildRegionalFilingLocationLabel(row),
    price: row.price,
    deposit: row.deposit,
    monthlyRent: row.monthlyRent,
    area: row.area,
    rooms: row.rooms,
    floor: row.floor,
    pricePerMeter: row.pricePerMeter,
    postedAt: row.postedAt?.toISOString() ?? null,
    totalFloors: row.totalFloors,
    unitsCount: row.unitsCount,
    buildingAge: row.buildingAge,
    documentType: row.documentType,
    cabinet: row.cabinet,
    flooring: row.flooring,
    wallCover: row.wallCover,
    facade: row.facade,
    orientation: row.orientation,
    heating: row.heating,
    cooling: row.cooling,
    exchangeable: row.exchangeable,
    hasParking: row.hasParking,
    hasStorage: row.hasStorage,
    hasElevator: row.hasElevator,
    hasSecurityDoor: row.hasSecurityDoor,
    hasTerrace: row.hasTerrace,
    hasBuiltInWardrobe: row.hasBuiltInWardrobe,
    sourceMetaJson: row.sourceMetaJson,
    image: row.image,
    status: row.status,
    reviewIssues: parseReviewIssues(row.reviewIssuesJson),
    scrapedAt: row.scrapedAt?.toISOString() ?? null,
    sourceSite: row.sourceSite,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    propertyKindLabel:
      WORKSPACE_PROPERTY_KIND_OPTIONS.find((o) => o.value === row.propertyKind)?.label ?? null,
  };
}
