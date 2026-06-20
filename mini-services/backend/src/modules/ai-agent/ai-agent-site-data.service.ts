import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import path from 'path';
import { PrismaService } from '../../prisma/prisma.service';

type ManagedCity = {
  id: string;
  name: string;
  nameEn?: string;
  isActive?: boolean;
};

type ManagedProvince = {
  id: string;
  name: string;
  nameEn?: string;
  isActive?: boolean;
  cities: ManagedCity[];
};

type ManagedLocationData = {
  countries: Array<{ isActive?: boolean; provinces: ManagedProvince[] }>;
};

type CatalogNeighborhood = { id: string; name: string; nameEn?: string; areas?: string[] };

function repoRoot(): string {
  return path.resolve(process.cwd(), '../..');
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/\u200c/g, '').replace(/\s+/g, ' ');
}

function textMatches(query: string, ...parts: Array<string | null | undefined>): boolean {
  if (!query) return true;
  const q = normalizeSearchText(query);
  return parts.some((part) => {
    if (!part) return false;
    const normalized = normalizeSearchText(part);
    return normalized.includes(q) || q.includes(normalized);
  });
}

function citySlugFromId(id: string): string {
  return id.replace(/-city$/i, '');
}

@Injectable()
export class AiAgentSiteDataService {
  constructor(private readonly prisma: PrismaService) {}

  private async readLocations(): Promise<ManagedLocationData> {
    const filePath = path.join(repoRoot(), 'src', 'data', 'admin-locations.json');
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      return JSON.parse(raw) as ManagedLocationData;
    } catch {
      return { countries: [] };
    }
  }

  private async readManifestCounts(): Promise<Record<string, number>> {
    const filePath = path.join(repoRoot(), 'src', 'data', 'neighborhoods', 'manifest.json');
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw) as { counts?: Record<string, number> };
      return parsed.counts ?? {};
    } catch {
      return {};
    }
  }

  private async loadNeighborhoodCatalog(cityId: string): Promise<CatalogNeighborhood[]> {
    const slug = citySlugFromId(cityId);
    for (const candidate of [cityId, slug, `${slug}-city`]) {
      const filePath = path.join(
        repoRoot(),
        'src',
        'data',
        'neighborhoods',
        'catalog',
        `${candidate}.json`,
      );
      try {
        const raw = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(raw) as { neighborhoods?: CatalogNeighborhood[] };
        if (parsed.neighborhoods?.length) return parsed.neighborhoods;
      } catch {
        // try next candidate
      }
    }
    return [];
  }

  async searchSiteCategories(args: Record<string, unknown>) {
    const query = typeof args.query === 'string' ? args.query.trim() : '';
    const limit = clampInt(args.limit, 1, 40, 20);

    const rows = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ parentId: 'asc' }, { order: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        parentId: true,
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,
            parent: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    const mapped = rows.map((c) => {
      const pathParts = [c.parent?.parent?.name, c.parent?.name, c.name].filter(Boolean);
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        parentId: c.parentId,
        parentSlug: c.parent?.slug ?? null,
        path: pathParts.join(' > '),
        level: c.parent?.parent ? 3 : c.parent ? 2 : 1,
      };
    });

    const filtered = query
      ? mapped.filter((c) => textMatches(query, c.name, c.slug, c.path, c.parentSlug ?? undefined))
      : mapped.filter((c) => c.level <= 2);

    return filtered.slice(0, limit);
  }

  async searchSiteCities(args: Record<string, unknown>) {
    const query = typeof args.query === 'string' ? args.query.trim() : '';
    const province = typeof args.province === 'string' ? args.province.trim() : '';
    const limit = clampInt(args.limit, 1, 40, 20);

    const [data, counts] = await Promise.all([this.readLocations(), this.readManifestCounts()]);
    const results: Array<Record<string, unknown>> = [];

    for (const country of data.countries) {
      if (country.isActive === false) continue;
      for (const prov of country.provinces) {
        if (prov.isActive === false) continue;
        if (province && !textMatches(province, prov.name, prov.id, prov.nameEn)) continue;
        for (const city of prov.cities) {
          if (city.isActive === false) continue;
          if (query && !textMatches(query, city.name, city.id, city.nameEn, citySlugFromId(city.id))) {
            continue;
          }
          const neighborhoodCount = counts[city.id] ?? counts[citySlugFromId(city.id)] ?? 0;
          results.push({
            id: city.id,
            name: city.name,
            slug: citySlugFromId(city.id),
            province: prov.name,
            provinceId: prov.id,
            hasNeighborhoods: neighborhoodCount > 0,
            neighborhoodCount: neighborhoodCount > 0 ? neighborhoodCount : undefined,
          });
        }
      }
    }

    results.sort((a, b) => String(a.name).localeCompare(String(b.name), 'fa'));
    return results.slice(0, limit);
  }

  async searchSiteNeighborhoods(args: Record<string, unknown>) {
    const neighborhoodQuery = typeof args.query === 'string' ? args.query.trim() : '';
    const limit = clampInt(args.limit, 1, 50, 25);

    let cityId = typeof args.cityId === 'string' ? args.cityId.trim() : '';
    if (!cityId) {
      const cityName =
        (typeof args.cityName === 'string' && args.cityName.trim()) ||
        (typeof args.city === 'string' && args.city.trim()) ||
        '';
      if (cityName) {
        const matches = await this.searchSiteCities({ query: cityName, limit: 5 });
        cityId = String(matches[0]?.id ?? '');
      }
    }

    if (!cityId) {
      return { error: 'شهر مشخص نشده یا یافت نشد.', neighborhoods: [] };
    }

    const rows = await this.loadNeighborhoodCatalog(cityId);
    const filtered = rows
      .filter((n) =>
        neighborhoodQuery
          ? textMatches(neighborhoodQuery, n.name, n.nameEn, n.id, ...(n.areas ?? []))
          : true,
      )
      .slice(0, limit)
      .map((n) => ({
        id: n.id,
        name: n.name,
        nameEn: n.nameEn,
        cityId,
        areas: n.areas ?? [],
      }));

    return { cityId, count: filtered.length, neighborhoods: filtered };
  }
}
