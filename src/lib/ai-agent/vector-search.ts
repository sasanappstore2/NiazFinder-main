import { LocationType } from '@prisma/client';
import { db } from '@/lib/db';
import { embedQuery } from '@/lib/ai-agent/embedding-client';
import { pgvectorLiteral } from '@/lib/ai-agent/pgvector';
import { searchActiveNeedsWithLocation } from '@/lib/ai-agent/site-data';

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
  budgetMin: number | null;
  budgetMax: number | null;
  createdAt: Date;
  score: number;
};

function buildLocationSql(cityNames: string[], hoodNames: string[]): string {
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

export async function searchLocationsVector(
  query: string,
  opts: { type?: LocationType; limit?: number } = {},
): Promise<LocationHit[]> {
  const limit = Math.min(10, Math.max(1, opts.limit ?? 5));
  const vec = await embedQuery(query);
  const literal = pgvectorLiteral(vec);

  await db.$executeRawUnsafe('SET LOCAL hnsw.ef_search = 40');

  const typeClause = opts.type ? `AND l.type = '${opts.type}'::"LocationType"` : '';

  return db.$queryRawUnsafe<LocationHit[]>(
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

async function searchNeedsVector(args: {
  query: string;
  category?: string;
  location?: string;
  limit: number;
}): Promise<{ resolvedLocation?: LocationHit[]; needs: NeedAgentHit[]; vectorUsed: boolean }> {
  const literal = pgvectorLiteral(await embedQuery(args.query || '???? ????'));

  let resolvedLocation: LocationHit[] | undefined;
  let locationSql = '';

  if (args.location?.trim()) {
    resolvedLocation = await searchLocationsVector(args.location.trim(), { limit: 3 });
    const cityNames = resolvedLocation.filter((h) => h.type === LocationType.CITY).map((h) => h.name);
    const hoodNames = resolvedLocation
      .filter((h) => h.type === LocationType.NEIGHBORHOOD)
      .map((h) => h.name);
    locationSql = buildLocationSql(cityNames, hoodNames);
  }

  await db.$executeRawUnsafe('SET LOCAL hnsw.ef_search = 40');

  const categoryClause = args.category?.trim()
    ? `AND (c.slug ILIKE '%${args.category.trim().replace(/'/g, "''")}%' OR c.name ILIKE '%${args.category.trim().replace(/'/g, "''")}%')`
    : '';

  const rows = await db.$queryRawUnsafe<NeedAgentHit[]>(
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
    args.limit,
  );

  return { resolvedLocation, needs: rows, vectorUsed: true };
}

export async function searchNeedsAgent(args: Record<string, unknown>) {
  const query = typeof args.query === 'string' ? args.query.trim() : '';
  const category = typeof args.category === 'string' ? args.category.trim() : '';
  const location = typeof args.location === 'string' ? args.location.trim() : '';
  const limitRaw = typeof args.limit === 'number' ? args.limit : 5;
  const limit = Math.min(5, Math.max(1, Math.floor(limitRaw)));

  if (!query) {
    return { error: 'query is required', count: 0, needs: [] as NeedAgentHit[] };
  }

  try {
    const vectorResult = await searchNeedsVector({ query, category, location, limit });
    if (vectorResult.needs.length > 0) {
      return {
        query,
        resolvedLocation: vectorResult.resolvedLocation,
        count: vectorResult.needs.length,
        needs: vectorResult.needs.map((r) => ({
          id: r.id,
          title: r.title,
          city: r.city,
          province: r.province,
          address: r.address,
          categoryName: r.categoryName,
          categorySlug: r.categorySlug,
          budgetMin: r.budgetMin != null ? Number(r.budgetMin) : null,
          budgetMax: r.budgetMax != null ? Number(r.budgetMax) : null,
          createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
          score: Number(r.score),
        })),
        searchMode: 'vector',
      };
    }
  } catch {
    /* fall through to SQL fallback */
  }

  const fallback = await searchActiveNeedsWithLocation({
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
