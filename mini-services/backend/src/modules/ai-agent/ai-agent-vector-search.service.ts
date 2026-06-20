import { Injectable, Logger } from '@nestjs/common';
import { LocationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LocationEmbeddingService } from './location-embedding.service';

export type LocationHit = {
  id: string;
  slug: string;
  name: string;
  type: LocationType;
  semanticPath: string | null;
  parentId: string | null;
  score: number;
};

export type NeedAgentHit = {
  id: string;
  title: string;
  city: string | null;
  province: string | null;
  address: string | null;
  categoryName: string;
  categorySlug: string;
  budgetMin: bigint | null;
  budgetMax: bigint | null;
  createdAt: Date;
  score: number;
};

@Injectable()
export class AiAgentVectorSearchService {
  private readonly logger = new Logger(AiAgentVectorSearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embed: LocationEmbeddingService,
  ) {}

  private buildLocationSql(cityNames: string[], hoodNames: string[]): string {
    const parts: string[] = [];
    for (const name of cityNames) {
      const esc = name.replace(/'/g, "''");
      parts.push(`(sr.city ILIKE '%${esc}%' OR sr.province ILIKE '%${esc}%')`);
    }
    for (const name of hoodNames) {
      const esc = name.replace(/'/g, "''");
      parts.push(`(sr.address ILIKE '%${esc}%' OR sr.description ILIKE '%${esc}%')`);
    }
    return parts.length > 0 ? `AND (${parts.join(' OR ')})` : '';
  }

  async searchLocations(
    query: string,
    opts: { type?: LocationType; limit?: number } = {},
  ): Promise<LocationHit[]> {
    const limit = Math.min(10, Math.max(1, opts.limit ?? 5));
    const literal = this.embed.pgvectorLiteral(await this.embed.embedQuery(query));

    await this.prisma.$executeRawUnsafe('SET LOCAL hnsw.ef_search = 40');

    const typeClause = opts.type ? `AND l.type = '${opts.type}'::"LocationType"` : '';

    return this.prisma.$queryRawUnsafe<LocationHit[]>(
      `
      SELECT l.id, l.slug, l.name, l.type, l."semanticPath", l."parentId",
             1 - (l.embedding <=> $1::vector) AS score
      FROM locations l
      WHERE l.embedding IS NOT NULL
        ${typeClause}
      ORDER BY l.embedding <=> $1::vector
      LIMIT $2
      `,
      literal,
      limit,
    );
  }

  async searchNeedsAgent(args: Record<string, unknown>) {
    const query = typeof args.query === 'string' ? args.query.trim() : '';
    const category = typeof args.category === 'string' ? args.category.trim() : '';
    const location = typeof args.location === 'string' ? args.location.trim() : '';
    const limitRaw = typeof args.limit === 'number' ? args.limit : 5;
    const limit = Math.min(5, Math.max(1, Math.floor(limitRaw)));

    if (!query) {
      return { error: 'query is required', count: 0, needs: [] };
    }

    try {
      const literal = this.embed.pgvectorLiteral(await this.embed.embedQuery(query));

      let resolvedLocation: LocationHit[] | undefined;
      let locationSql = '';

      if (location) {
        resolvedLocation = await this.searchLocations(location, { limit: 3 });
        const cityNames = resolvedLocation.filter((h) => h.type === LocationType.CITY).map((h) => h.name);
        const hoodNames = resolvedLocation
          .filter((h) => h.type === LocationType.NEIGHBORHOOD)
          .map((h) => h.name);
        locationSql = this.buildLocationSql(cityNames, hoodNames);
      }

      const categoryClause = category
        ? `AND (c.slug ILIKE '%${category.replace(/'/g, "''")}%' OR c.name ILIKE '%${category.replace(/'/g, "''")}%')`
        : '';

      await this.prisma.$executeRawUnsafe('SET LOCAL hnsw.ef_search = 40');

      const rows = await this.prisma.$queryRawUnsafe<NeedAgentHit[]>(
        `
        SELECT sr.id, sr.title, sr.city, sr.province, sr.address,
               c.name AS "categoryName", c.slug AS "categorySlug",
               sr."budgetMin", sr."budgetMax", sr."createdAt",
               1 - (sr."searchEmbedding" <=> $1::vector) AS score
        FROM "ServiceRequest" sr
        JOIN "Category" c ON c.id = sr."categoryId"
        WHERE sr."searchEmbedding" IS NOT NULL
          AND sr.status IN ('OPEN','IN_PROGRESS')
          AND sr."moderationStatus" = 'APPROVED'
          AND sr."needAccessStatus" = 'PUBLIC'
          ${categoryClause}
          ${locationSql}
        ORDER BY sr."searchEmbedding" <=> $1::vector
        LIMIT $2
        `,
        literal,
        limit,
      );

      if (rows.length > 0) {
        return {
          query,
          resolvedLocation,
          count: rows.length,
          needs: rows.map((r) => ({
            id: r.id,
            title: r.title,
            city: r.city,
            province: r.province,
            address: r.address,
            categoryName: r.categoryName,
            categorySlug: r.categorySlug,
            budgetMin: r.budgetMin != null ? Number(r.budgetMin) : null,
            budgetMax: r.budgetMax != null ? Number(r.budgetMax) : null,
            createdAt: r.createdAt.toISOString(),
            score: Number(r.score),
          })),
          searchMode: 'vector',
        };
      }
    } catch (err) {
      this.logger.warn(`Vector search failed, using SQL fallback: ${err}`);
    }

    const fallback = await this.searchActiveNeedsFallback({
      category,
      location,
      neighborhood: location,
      limit,
    });

    return {
      query,
      count: Array.isArray(fallback) ? fallback.length : 0,
      needs: fallback,
      searchMode: 'fallback',
    };
  }

  /** SQL contains fallback when vectors are not yet backfilled. */
  private async searchActiveNeedsFallback(args: {
    category?: string;
    location?: string;
    neighborhood?: string;
    limit: number;
  }) {
    const where: Record<string, unknown> = {
      status: { in: ['OPEN', 'IN_PROGRESS'] },
      moderationStatus: 'APPROVED',
      needAccessStatus: 'PUBLIC',
    };

    const locationFilters: Record<string, unknown>[] = [];
    if (args.location) {
      locationFilters.push(
        { city: { contains: args.location, mode: 'insensitive' } },
        { province: { contains: args.location, mode: 'insensitive' } },
      );
    }
    if (args.neighborhood) {
      locationFilters.push({ address: { contains: args.neighborhood, mode: 'insensitive' } });
      locationFilters.push({ description: { contains: args.neighborhood, mode: 'insensitive' } });
    }
    if (locationFilters.length === 1) {
      Object.assign(where, locationFilters[0]);
    } else if (locationFilters.length > 1) {
      where.OR = locationFilters;
    }

    if (args.category) {
      where.category = {
        OR: [
          { slug: { contains: args.category, mode: 'insensitive' } },
          { name: { contains: args.category, mode: 'insensitive' } },
        ],
      };
    }

    const rows = await this.prisma.serviceRequest.findMany({
      where: where as any,
      take: args.limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        city: true,
        province: true,
        budgetMin: true,
        budgetMax: true,
        createdAt: true,
        category: { select: { name: true, slug: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      city: r.city,
      province: r.province,
      categoryName: r.category.name,
      categorySlug: r.category.slug,
      budgetMin: r.budgetMin != null ? Number(r.budgetMin) : null,
      budgetMax: r.budgetMax != null ? Number(r.budgetMax) : null,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
