import type { Prisma } from '@prisma/client';
import { citySlugToPersianName } from '@/lib/search/city-slugs';
import { provinceSlugsToPersianNames } from '@/lib/search/province-slugs';

function resolveCityFilterName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  return citySlugToPersianName(trimmed) ?? trimmed;
}

/** Build Prisma filters for `city` and `province` columns from API query params. */
export function buildGeoAndFilters(opts: {
  citiesParam?: string | null;
  provincesParam?: string | null;
  legacyCity?: string | null;
  legacyProvince?: string | null;
}): Prisma.ServiceRequestWhereInput[] {
  const and: Prisma.ServiceRequestWhereInput[] = [];

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
    and.push({ province: provinceNames[0] });
  } else if (provinceNames.length > 1) {
    and.push({
      OR: provinceNames.map((name) => ({ province: name })),
    });
  }

  const cityNames: string[] = [];
  if (opts.citiesParam) {
    cityNames.push(
      ...opts.citiesParam
        .split(',')
        .map((s) => resolveCityFilterName(s))
        .filter(Boolean)
    );
  } else if (opts.legacyCity) {
    cityNames.push(resolveCityFilterName(opts.legacyCity));
  }

  if (cityNames.length === 1) {
    and.push({ city: cityNames[0] });
  } else if (cityNames.length > 1) {
    and.push({
      OR: cityNames.map((name) => ({ city: name })),
    });
  }

  return and;
}
