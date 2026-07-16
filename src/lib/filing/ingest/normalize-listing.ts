import {
  buildRegionalFilingLocationLabel,
  resolveCategorySlugFromKind,
} from '@/lib/business/workspace/regional-filings-admin';
import type { WorkspacePropertyKind } from '@/lib/business/ecosystem/types';
import { JALALI_MONTHS, jalaaliToDate } from '@/lib/format/jalali-calendar';
import type { ScrapedFilingRow } from '@/lib/filing/ingest/estate-scrape-filing-client';
import {
  DEAL_TYPE_LABELS,
  PROPERTY_KIND_LABELS,
  type FilingDealType,
  type FilingPropertyKind,
} from '@/lib/filing/schema/attribute-schema';
import {
  canonicalizeDealType,
  canonicalizePropertyKind,
  mergeListingRows,
  parseListingAttributes,
} from '@/lib/filing/ingest/parse-listing-attributes';
import {
  isCriticalValidationIssue,
  validateListingByDeal,
  type ExtendedValidationIssue,
} from '@/lib/filing/content/validate-by-deal';
import { resolveNeighborhoodSlug } from '@/lib/need-intake/neighborhood-catalog.server';
import type { RegionalFilingScraper } from '@prisma/client';
import { computeFilingDataCompleteness } from '@/lib/filing/ingest/filing-data-completeness';

export type ValidationIssue = ExtendedValidationIssue;

/** Normalize Persian/Arabic digits to ASCII. */
export function normalizeDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[^\d]/g, '');
}

export function parsePostedAtText(text: string | null | undefined): Date | null {
  if (!text?.trim()) return null;
  const normalized = text.replace(/\s+/g, ' ').trim();

  // MaskanYaban's .FDate is US-format Gregorian: "7/16/2026 7:20:42 PM"
  const us = normalized.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i
  );
  if (us) {
    const [, mo, day, year, hh, mm, ss, meridiem] = us;
    let hours = hh ? parseInt(hh, 10) : 0;
    if (meridiem?.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (meridiem?.toUpperCase() === 'AM' && hours === 12) hours = 0;
    const date = new Date(
      parseInt(year!, 10),
      parseInt(mo!, 10) - 1,
      parseInt(day!, 10),
      hours,
      mm ? parseInt(mm, 10) : 0,
      ss ? parseInt(ss, 10) : 0
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const m = normalized.match(/(\d{1,2})\s+([\u0600-\u06FF]+)\s+(\d{4})/);
  if (!m) return null;
  const jd = parseInt(normalizeDigits(m[1]!), 10);
  const jy = parseInt(normalizeDigits(m[3]!), 10);
  const monthName = m[2]!.replace(/\s+/g, '');
  const jm = JALALI_MONTHS.findIndex((name) => monthName.includes(name.replace(/\s+/g, ''))) + 1;
  if (!jd || !jy || jm < 1) return null;
  try {
    return jalaaliToDate({ jy, jm, jd });
  } catch {
    return null;
  }
}

export function buildScrapedFilingTitle(input: {
  dealType?: string | null;
  propertyKind?: string | null;
  area?: string | null;
  title?: string | null;
  titleTemplate?: string | null;
}): string {
  const existing = input.title?.trim();
  if (existing && existing.length >= 8) return existing;

  const dealLabel =
    (input.dealType && DEAL_TYPE_LABELS[input.dealType as FilingDealType]) ||
    input.dealType ||
    '';
  const kindRaw = input.propertyKind ?? '';
  const kindLabel =
    PROPERTY_KIND_LABELS[kindRaw as FilingPropertyKind] ||
    kindRaw ||
    '';
  const area = input.area?.trim() ? normalizeDigits(input.area) || input.area.trim() : '';

  const template = input.titleTemplate ?? '{dealType} {propertyKind} {area} متری';
  const built = template
    .replace('{dealType}', dealLabel)
    .replace('{propertyKind}', kindLabel)
    .replace('{area}', area)
    .replace(/\s+/g, ' ')
    .trim();

  if (built.length >= 5) return built;
  return existing || built || 'فایل املاک';
}

export type NormalizedScrapedRow = Omit<ScrapedFilingRow, 'city' | 'postedAt'> & {
  city: string;
  cityId: string | null;
  neighborhoodId: string | null;
  categorySlug: string | null;
  status: 'active' | 'pending_review';
  reviewIssues: ValidationIssue[];
  postedAt: Date | null;
};

function enrichRowFromText(row: ScrapedFilingRow): ScrapedFilingRow {
  const titleHint = row.title?.trim() || '';
  const descHint = row.description?.trim() || '';
  const fromTitle = titleHint ? parseListingAttributes(titleHint) : {};
  const fromDesc = descHint ? parseListingAttributes(descHint) : {};
  let merged = mergeListingRows(row, fromTitle);
  merged = mergeListingRows(merged, fromDesc);

  const dealType =
    canonicalizeDealType(row.dealType) ??
    canonicalizeDealType(titleHint) ??
    (merged.dealType as FilingDealType | null);
  const propertyKind =
    canonicalizePropertyKind(row.propertyKind) ??
    canonicalizePropertyKind(titleHint) ??
    (merged.propertyKind as FilingPropertyKind | null);

  return {
    ...merged,
    dealType: dealType ?? merged.dealType ?? row.dealType,
    propertyKind: propertyKind ?? merged.propertyKind ?? row.propertyKind,
  } as ScrapedFilingRow;
}

export function normalizeScrapedListing(
  row: ScrapedFilingRow,
  scraper: RegionalFilingScraper,
  options?: { titleTemplate?: string | null }
): NormalizedScrapedRow {
  const enriched = enrichRowFromText(row);
  const city = enriched.city?.trim() || scraper.defaultCity;
  const rawNeighborhood = enriched.neighborhood?.trim() || scraper.defaultNeighborhood?.trim() || '';
  const dealType = canonicalizeDealType(enriched.dealType) ?? enriched.dealType ?? null;
  const propertyKind =
    canonicalizePropertyKind(enriched.propertyKind) ??
    (enriched.propertyKind as WorkspacePropertyKind | null);
  const categorySlug = resolveCategorySlugFromKind(propertyKind, dealType) ?? null;

  let neighborhood = rawNeighborhood;
  let neighborhoodId = scraper.defaultNeighborhoodId;

  if (rawNeighborhood) {
    const resolved = resolveNeighborhoodSlug(city, rawNeighborhood);
    if (resolved) {
      neighborhood = resolved.name;
      neighborhoodId = resolved.slug;
    }
  } else if (scraper.defaultNeighborhoodId) {
    neighborhood = scraper.defaultNeighborhood ?? neighborhood;
    neighborhoodId = scraper.defaultNeighborhoodId;
  }

  const title = buildScrapedFilingTitle({
    dealType,
    propertyKind,
    area: enriched.area,
    title: enriched.title,
    titleTemplate: options?.titleTemplate,
  });

  const location =
    enriched.location?.trim() ||
    buildRegionalFilingLocationLabel({
      city,
      neighborhood: neighborhood || null,
      location: null,
    });

  const reviewIssues = validateListingByDeal({
    ...enriched,
    dealType,
    propertyKind,
    neighborhood,
    location,
    title,
  }) as ValidationIssue[];

  const critical = reviewIssues.some(isCriticalValidationIssue);
  const postedAt =
    parsePostedAtText(enriched.postedAt) ??
    parsePostedAtText(enriched.title) ??
    null;

  return {
    ...enriched,
    dealType,
    propertyKind,
    city,
    neighborhood: neighborhood || null,
    location,
    title,
    cityId: scraper.defaultCityId,
    neighborhoodId,
    categorySlug,
    status: critical ? 'pending_review' : 'active',
    reviewIssues,
    postedAt,
  };
}

export function filingAttributeDbFields(
  normalized: NormalizedScrapedRow & { image?: string | null; images?: string[] | null },
  opts?: { enriched?: boolean }
): Record<string, unknown> {
  const sourceMeta: Record<string, unknown> = {
    ...(normalized.sourceMeta ?? {}),
  };

  const image = normalized.image?.trim() || null;
  const images = (normalized.images ?? []).filter((u) => u?.trim());
  const cover = image ?? images[0] ?? null;

  const dataCompleteness = computeFilingDataCompleteness({
    ...normalized,
    image: cover,
    images,
  });

  return {
    postedAt: normalized.postedAt,
    totalFloors: normalized.totalFloors ?? null,
    unitsCount: normalized.unitsCount ?? null,
    buildingAge: normalized.buildingAge ?? null,
    documentType: normalized.documentType ?? null,
    cabinet: normalized.cabinet ?? null,
    flooring: normalized.flooring ?? null,
    wallCover: normalized.wallCover ?? null,
    facade: normalized.facade ?? null,
    orientation: normalized.orientation ?? null,
    heating: normalized.heating ?? null,
    cooling: normalized.cooling ?? null,
    exchangeable: normalized.exchangeable ?? null,
    hasParking: normalized.hasParking ?? null,
    hasStorage: normalized.hasStorage ?? null,
    hasElevator: normalized.hasElevator ?? null,
    hasSecurityDoor: normalized.hasSecurityDoor ?? null,
    hasTerrace: normalized.hasTerrace ?? null,
    hasBuiltInWardrobe: normalized.hasBuiltInWardrobe ?? null,
    detailUrl: normalized.detailUrl?.trim() || null,
    image: cover,
    imagesJson: JSON.stringify(images.length ? images : cover ? [cover] : []),
    dataCompleteness,
    enrichedAt: opts?.enriched ? new Date() : undefined,
    sourceMetaJson: JSON.stringify(sourceMeta),
  };
}
