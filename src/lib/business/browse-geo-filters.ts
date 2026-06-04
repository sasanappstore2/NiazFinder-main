import type { Prisma } from '@prisma/client';
import { cityFromSlug, slugsToPersianNames } from '@/lib/search/city-slugs';
import { provinceSlugsToPersianNames } from '@/lib/search/province-slugs';

/** Resolve `?cities=` values (canonical slugs or legacy Persian names). */
export function cityNamesFromParam(citiesParam: string): string[] {
  const parts = citiesParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const fromSlugs = slugsToPersianNames(parts);
  if (fromSlugs.length > 0) return fromSlugs;
  return parts.filter((p) => cityFromSlug(p) == null && /[\u0600-\u06FF]/.test(p));
}

/** Build Prisma filters for BusinessProfile `city` / `province` from API query params. */
export function buildBusinessGeoWhere(opts: {
  citiesParam?: string | null;
  provincesParam?: string | null;
  legacyCity?: string | null;
  legacyProvince?: string | null;
}): Prisma.BusinessProfileWhereInput[] {
  const and: Prisma.BusinessProfileWhereInput[] = [];

  const provinceNames: string[] = [];
  if (opts.provincesParam) {
    const slugs = opts.provincesParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    provinceNames.push(...provinceSlugsToPersianNames(slugs));
  }
  if (opts.legacyProvince && !provinceNames.length) {
    provinceNames.push(opts.legacyProvince);
  }

  if (provinceNames.length === 1) {
    and.push({ province: { contains: provinceNames[0] } });
  } else if (provinceNames.length > 1) {
    and.push({
      OR: provinceNames.map((name) => ({ province: { contains: name } })),
    });
  }

  const cityNames: string[] = [];
  if (opts.citiesParam) {
    cityNames.push(...cityNamesFromParam(opts.citiesParam));
  } else if (opts.legacyCity) {
    cityNames.push(opts.legacyCity);
  }

  const cityClause = (name: string): Prisma.BusinessProfileWhereInput => ({
    OR: [
      { city: { contains: name } },
      {
        locations: {
          some: { isPublished: true, city: { contains: name } },
        },
      },
    ],
  });

  if (cityNames.length === 1) {
    and.push(cityClause(cityNames[0]));
  } else if (cityNames.length > 1) {
    and.push({ OR: cityNames.map(cityClause) });
  }

  return and;
}
