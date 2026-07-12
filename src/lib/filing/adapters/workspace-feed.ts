import { db } from '@/lib/db';
import type { RegionalFiling } from '@prisma/client';
import type { ServiceAreaEntry } from '@/lib/business/ecosystem/types';
import { regionalFilingToPropertyListing } from '@/lib/filing/adapters/prisma-to-listing';
import type { PropertyListing } from '@/contracts/business-profile';

export type RegionalFilingsFeedStatus = 'unconfigured' | 'pending' | 'active';

export function formatServiceAreaLabel(areas: ServiceAreaEntry[]): string | null {
  if (!areas.length) return null;

  const labels = areas.map((area) => {
    const parts = [area.neighborhood, area.district, area.city].filter(Boolean);
    return parts.join('، ');
  });

  const preview = labels.slice(0, 2).join(' / ');
  return labels.length > 2 ? `${preview}…` : preview;
}

export function resolveRegionalFilingsFeedStatus(
  areas: ServiceAreaEntry[]
): RegionalFilingsFeedStatus {
  if (!areas.length) return 'unconfigured';
  return 'active';
}

function normalizeToken(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function cityMatches(
  filing: { city: string; cityId?: string | null },
  area: ServiceAreaEntry
): boolean {
  if (filing.cityId && area.cityId && filing.cityId === area.cityId) return true;
  const filingCity = normalizeToken(filing.city);
  const areaCity = normalizeToken(area.city);
  if (!filingCity || !areaCity) return false;
  return areaCity === filingCity || areaCity.includes(filingCity) || filingCity.includes(areaCity);
}

function neighborhoodMatches(
  filing: { neighborhood?: string | null; neighborhoodId?: string | null },
  area: ServiceAreaEntry
): boolean {
  if (filing.neighborhoodId && area.neighborhoodId) {
    return filing.neighborhoodId === area.neighborhoodId;
  }
  const filingN = normalizeToken(filing.neighborhood);
  const areaN = normalizeToken(area.neighborhood);
  if (!filingN || !areaN) return false;
  return filingN === areaN || areaN.includes(filingN) || filingN.includes(areaN);
}

export function regionalFilingMatchesServiceArea(
  filing: {
    city: string;
    cityId?: string | null;
    neighborhood?: string | null;
    neighborhoodId?: string | null;
  },
  area: ServiceAreaEntry
): boolean {
  if (!cityMatches(filing, area)) return false;

  if (filing.neighborhoodId || filing.neighborhood) {
    return neighborhoodMatches(filing, area);
  }

  return true;
}

export async function listRegionalFilingRowsForWorkspace(
  areas: ServiceAreaEntry[]
): Promise<RegionalFiling[]> {
  if (!areas.length) return [];

  const rows = await db.regionalFiling.findMany({
    where: { status: 'active' },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  return rows.filter((row) =>
    areas.some((area) => regionalFilingMatchesServiceArea(row, area))
  );
}

export async function listRegionalFilingsForWorkspace(
  areas: ServiceAreaEntry[]
): Promise<{ listings: PropertyListing[]; feedStatus: RegionalFilingsFeedStatus }> {
  const feedStatus = resolveRegionalFilingsFeedStatus(areas);
  if (feedStatus === 'unconfigured') {
    return { listings: [], feedStatus };
  }

  const listings = (await listRegionalFilingRowsForWorkspace(areas)).map(
    regionalFilingToPropertyListing
  );

  return { listings, feedStatus };
}

export function regionalFilingsEmptyMessage(
  feedStatus: RegionalFilingsFeedStatus,
  regionLabel: string | null
): string {
  switch (feedStatus) {
    case 'unconfigured':
      return 'محدوده خدمات خود را در پروفایل کسب‌وکار تعریف کنید تا فایل‌های منطقه نمایش داده شوند.';
    case 'pending':
      return regionLabel
        ? `فید فایلینگ منطقه «${regionLabel}» به‌زودی از پنل مدیریت فعال می‌شود.`
        : 'فید فایلینگ منطقه‌ای به‌زودی از پنل مدیریت فعال می‌شود.';
    case 'active':
    default:
      return regionLabel
        ? `فایل‌های پروفایل و منطقه «${regionLabel}» — در صورت نبود فایل جدید، فایل خود را در پروفایل اضافه کنید.`
        : 'فایل‌های پروفایل شما اینجا نمایش داده می‌شوند.';
  }
}
