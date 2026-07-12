import { LocationType } from '@prisma/client';
import { db } from '@/lib/db';
import { embedQuery } from '@/lib/ai-agent/embedding-client';
import { pgvectorLiteral } from '@/lib/ai-agent/pgvector';
import { searchActiveNeedsWithLocation } from '@/lib/ai-agent/site-data';
import { sanitizeUntrustedPassage, truncateForAgent } from '@/lib/rag/content-hash';

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

export type BusinessAgentHit = {
  id: string;
  userId: string;
  name: string;
  slug: string;
  city: string | null;
  province: string | null;
  description: string | null;
  verified: boolean;
  rating: number;
  score: number;
};

export type SiteKnowledgeHit = {
  id: string;
  sourceKey: string;
  title: string;
  section: string | null;
  content: string;
  route: string | null;
  score: number;
};

const MIN_VECTOR_SCORE = 0.25;

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
  const literal = pgvectorLiteral(await embedQuery(args.query || 'نیاز عمومی'));

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

  return {
    resolvedLocation,
    needs: rows.filter((r) => Number(r.score) >= MIN_VECTOR_SCORE),
    vectorUsed: true,
  };
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
          title: truncateForAgent(r.title, 120),
          city: r.city,
          province: r.province,
          address: r.address ? truncateForAgent(r.address, 80) : null,
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

async function searchBusinessesVector(args: {
  query: string;
  city?: string;
  limit: number;
}): Promise<BusinessAgentHit[]> {
  const literal = pgvectorLiteral(await embedQuery(args.query));
  await db.$executeRawUnsafe('SET LOCAL hnsw.ef_search = 40');

  const cityClause = args.city?.trim()
    ? `AND (bp.city ILIKE '%${args.city.trim().replace(/'/g, "''")}%' OR bp.province ILIKE '%${args.city.trim().replace(/'/g, "''")}%')`
    : '';

  const rows = await db.$queryRawUnsafe<BusinessAgentHit[]>(
    `
    SELECT bp.id, bp."userId", bp.name, bp.slug, bp.city, bp.province, bp.description,
           bp.verified, bp.rating,
           1 - (bp."searchEmbedding" <=> $1::vector) AS score
    FROM "BusinessProfile" bp
    JOIN "User" u ON u.id = bp."userId"
    WHERE bp."searchEmbedding" IS NOT NULL
      AND bp.status = 'ACTIVE'
      AND u."isActive" = true
      ${cityClause}
    ORDER BY bp."searchEmbedding" <=> $1::vector
    LIMIT $2
    `,
    literal,
    args.limit,
  );

  return rows.filter((r) => Number(r.score) >= MIN_VECTOR_SCORE);
}

async function searchBusinessesLexicalFallback(args: {
  query: string;
  city?: string;
  limit: number;
}): Promise<BusinessAgentHit[]> {
  try {
    const { searchBusinessProfilesTypesense } = await import(
      '@/lib/search/typesense-business-search'
    );
    const ts = await searchBusinessProfilesTypesense({
      search: args.query,
      legacyCity: args.city,
      limit: args.limit,
      page: 1,
    });
    if (ts && ts.data.length > 0) {
      return ts.data.slice(0, args.limit).map((doc, i) => ({
        id: doc.id,
        userId: doc.id,
        name: doc.name,
        slug: doc.slug,
        city: doc.city || null,
        province: doc.province || null,
        description: doc.description
          ? sanitizeUntrustedPassage(doc.description, 280)
          : null,
        verified: doc.verified,
        rating: doc.rating,
        score: 1 - i * 0.05,
      }));
    }
  } catch {
    /* prisma fallback */
  }

  const rows = await db.businessProfile.findMany({
    where: {
      status: 'ACTIVE',
      user: { isActive: true },
      AND: [
        args.city?.trim()
          ? {
              OR: [
                { city: { contains: args.city.trim(), mode: 'insensitive' } },
                { province: { contains: args.city.trim(), mode: 'insensitive' } },
              ],
            }
          : {},
        {
          OR: [
            { name: { contains: args.query, mode: 'insensitive' } },
            { description: { contains: args.query, mode: 'insensitive' } },
            { tags: { contains: args.query, mode: 'insensitive' } },
          ],
        },
      ],
    },
    take: args.limit,
    select: {
      id: true,
      userId: true,
      name: true,
      slug: true,
      city: true,
      province: true,
      description: true,
      verified: true,
      rating: true,
    },
  });

  return rows.map((r, i) => ({
    ...r,
    description: r.description ? sanitizeUntrustedPassage(r.description, 280) : null,
    score: 0.5 - i * 0.05,
  }));
}

export async function searchBusinessesAgent(args: Record<string, unknown>) {
  const query = typeof args.query === 'string' ? args.query.trim() : '';
  const city =
    typeof args.city === 'string'
      ? args.city.trim()
      : typeof args.location === 'string'
        ? args.location.trim()
        : '';
  const limit = Math.min(5, Math.max(1, Math.floor(typeof args.limit === 'number' ? args.limit : 5)));

  if (!query) {
    return { error: 'query is required', count: 0, businesses: [] as BusinessAgentHit[] };
  }

  try {
    const vectorHits = await searchBusinessesVector({ query, city, limit });
    if (vectorHits.length > 0) {
      return {
        query,
        count: vectorHits.length,
        businesses: vectorHits.map((b) => ({
          id: b.userId,
          profileId: b.id,
          name: truncateForAgent(b.name, 80),
          slug: b.slug,
          href: `/b/${b.slug}`,
          city: b.city,
          province: b.province,
          description: b.description ? sanitizeUntrustedPassage(b.description, 280) : null,
          verified: b.verified,
          rating: b.rating,
          score: Number(b.score),
          untrustedContent: true,
        })),
        searchMode: 'vector',
      };
    }
  } catch {
    /* fall through */
  }

  const fallback = await searchBusinessesLexicalFallback({ query, city, limit });
  return {
    query,
    count: fallback.length,
    businesses: fallback.map((b) => ({
      id: b.userId,
      profileId: b.id,
      name: truncateForAgent(b.name, 80),
      slug: b.slug,
      href: `/b/${b.slug}`,
      city: b.city,
      province: b.province,
      description: b.description,
      verified: b.verified,
      rating: b.rating,
      score: Number(b.score),
      untrustedContent: true,
    })),
    searchMode: 'fallback',
  };
}

export async function getPublicBusinessProfileTool(args: Record<string, unknown>) {
  const slugOrId =
    (typeof args.slug === 'string' && args.slug.trim()) ||
    (typeof args.id === 'string' && args.id.trim()) ||
    (typeof args.query === 'string' && args.query.trim()) ||
    '';

  if (!slugOrId) {
    return { error: 'slug or id is required' };
  }

  const profile = await db.businessProfile.findFirst({
    where: {
      OR: [{ slug: slugOrId }, { id: slugOrId }, { userId: slugOrId }],
      status: 'ACTIVE',
      user: { isActive: true },
    },
    select: {
      id: true,
      userId: true,
      name: true,
      slug: true,
      description: true,
      city: true,
      province: true,
      verified: true,
      rating: true,
      reviewCount: true,
      phone: true,
      whatsapp: true,
      offers: {
        where: { isPublished: true },
        orderBy: { order: 'asc' },
        take: 5,
        select: { title: true, description: true, priceRange: true },
      },
    },
  });

  if (!profile) {
    return { found: false, message: 'کسب‌وکار عمومی فعالی با این مشخصات پیدا نشد.' };
  }

  return {
    found: true,
    business: {
      id: profile.userId,
      name: profile.name,
      slug: profile.slug,
      href: `/b/${profile.slug}`,
      city: profile.city,
      province: profile.province,
      description: profile.description
        ? sanitizeUntrustedPassage(profile.description, 500)
        : null,
      verified: profile.verified,
      rating: profile.rating,
      reviewCount: profile.reviewCount,
      phone: profile.phone,
      whatsapp: profile.whatsapp,
      offers: profile.offers.map((o) => ({
        title: truncateForAgent(o.title, 80),
        description: o.description ? sanitizeUntrustedPassage(o.description, 200) : null,
        priceRange: o.priceRange,
      })),
      untrustedContent: true,
    },
  };
}

async function searchSiteKnowledgeVector(query: string, limit: number): Promise<SiteKnowledgeHit[]> {
  const literal = pgvectorLiteral(await embedQuery(query));
  await db.$executeRawUnsafe('SET LOCAL hnsw.ef_search = 40');

  const rows = await db.$queryRawUnsafe<SiteKnowledgeHit[]>(
    `
    SELECT id, "sourceKey", title, section, content, route,
           1 - (embedding <=> $1::vector) AS score
    FROM site_knowledge_chunks
    WHERE embedding IS NOT NULL
      AND "isPublic" = true
    ORDER BY embedding <=> $1::vector
    LIMIT $2
    `,
    literal,
    limit,
  );

  return rows.filter((r) => Number(r.score) >= MIN_VECTOR_SCORE);
}

async function searchSiteKnowledgeLexical(query: string, limit: number): Promise<SiteKnowledgeHit[]> {
  const rows = await db.siteKnowledgeChunk.findMany({
    where: {
      isPublic: true,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
        { section: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: limit,
    select: {
      id: true,
      sourceKey: true,
      title: true,
      section: true,
      content: true,
      route: true,
    },
  });

  return rows.map((r, i) => ({ ...r, score: 0.45 - i * 0.03 }));
}

export async function searchSiteKnowledgeAgent(args: Record<string, unknown>) {
  const query =
    (typeof args.query === 'string' && args.query.trim()) ||
    (typeof args.topic === 'string' && args.topic.trim()) ||
    '';
  const limit = Math.min(5, Math.max(1, Math.floor(typeof args.limit === 'number' ? args.limit : 4)));

  if (!query) {
    return { error: 'query is required', count: 0, chunks: [] as SiteKnowledgeHit[] };
  }

  try {
    const hits = await searchSiteKnowledgeVector(query, limit);
    if (hits.length > 0) {
      return {
        query,
        count: hits.length,
        chunks: hits.map((h) => ({
          title: h.title,
          section: h.section,
          content: truncateForAgent(h.content, 500),
          route: h.route,
          sourceKey: h.sourceKey,
          score: Number(h.score),
        })),
        searchMode: 'vector',
      };
    }
  } catch {
    /* fall through */
  }

  const fallback = await searchSiteKnowledgeLexical(query, limit);
  return {
    query,
    count: fallback.length,
    chunks: fallback.map((h) => ({
      title: h.title,
      section: h.section,
      content: truncateForAgent(h.content, 500),
      route: h.route,
      sourceKey: h.sourceKey,
      score: Number(h.score),
    })),
    searchMode: 'fallback',
  };
}
