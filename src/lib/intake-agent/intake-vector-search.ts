import type { IntakeDomain } from '@prisma/client';
import { db } from '@/lib/db';
import { embedQuery } from '@/lib/ai-agent/embedding-client';
import { pgvectorLiteral } from '@/lib/ai-agent/pgvector';
import type { CategoryRouteHit, IntakeRuleHit } from '@/lib/intake-agent/types';

const DEFAULT_EF = 40;

function escSql(value: string): string {
  return value.replace(/'/g, "''");
}

async function setHnswEf(ef = DEFAULT_EF): Promise<void> {
  await db.$executeRawUnsafe(`SET LOCAL hnsw.ef_search = ${Math.max(1, Math.floor(ef))}`);
}

/** Level 1: semantic category routing (small index). */
export async function searchCategoryRoutesVector(args: {
  keyword: string;
  domain: IntakeDomain;
  parentSlug?: string;
  limit?: number;
}): Promise<CategoryRouteHit[]> {
  const limit = Math.min(20, Math.max(1, args.limit ?? 8));
  const literal = pgvectorLiteral(await embedQuery(args.keyword));
  await setHnswEf();

  const parentClause = args.parentSlug?.trim()
    ? `AND r."parentSlug" = '${escSql(args.parentSlug.trim())}'`
    : '';

  return db.$queryRawUnsafe<CategoryRouteHit[]>(
    `
    SELECT r.id, r.domain, r.slug, r."parentSlug", r.title, r.depth,
           r."categoryId", r.description, r."semanticPath",
           r."technicalConstraints"::jsonb AS "technicalConstraints",
           r."ruleCount",
           1 - (r.embedding <=> $1::vector) AS score
    FROM intake_category_routes r
    WHERE r.embedding IS NOT NULL
      AND r.domain = '${args.domain}'::"IntakeDomain"
      ${parentClause}
    ORDER BY r.embedding <=> $1::vector
    LIMIT $2
    `,
    literal,
    limit,
  );
}

/** Hierarchical category listing (no vector — for tree traversal). */
export async function listCategoryRoutes(args: {
  domain: IntakeDomain;
  parentSlug?: string | null;
  limit?: number;
}): Promise<CategoryRouteHit[]> {
  const limit = Math.min(200, Math.max(1, args.limit ?? 50));
  const parent = args.parentSlug ?? null;

  return db.$queryRawUnsafe<CategoryRouteHit[]>(
    `
    SELECT r.id, r.domain, r.slug, r."parentSlug", r.title, r.depth,
           r."categoryId", r.description, r."semanticPath",
           r."technicalConstraints"::jsonb AS "technicalConstraints",
           r."ruleCount",
           1.0 AS score
    FROM intake_category_routes r
    WHERE r.domain = $1::"IntakeDomain"
      AND (($2::text IS NULL AND r."parentSlug" IS NULL)
           OR r."parentSlug" = $2)
    ORDER BY r.depth ASC, r.title ASC
    LIMIT $3
    `,
    args.domain,
    parent,
    limit,
  );
}

export async function getCategoryRouteBySlug(
  domain: IntakeDomain,
  slug: string,
): Promise<CategoryRouteHit | null> {
  const rows = await db.$queryRawUnsafe<CategoryRouteHit[]>(
    `
    SELECT r.id, r.domain, r.slug, r."parentSlug", r.title, r.depth,
           r."categoryId", r.description, r."semanticPath",
           r."technicalConstraints"::jsonb AS "technicalConstraints",
           r."ruleCount",
           1.0 AS score
    FROM intake_category_routes r
    WHERE r.domain = $1::"IntakeDomain" AND r.slug = $2
    LIMIT 1
    `,
    domain,
    slug,
  );
  return rows[0] ?? null;
}

export async function getCategoryRouteById(id: string): Promise<CategoryRouteHit | null> {
  const rows = await db.$queryRawUnsafe<CategoryRouteHit[]>(
    `
    SELECT r.id, r.domain, r.slug, r."parentSlug", r.title, r.depth,
           r."categoryId", r.description, r."semanticPath",
           r."technicalConstraints"::jsonb AS "technicalConstraints",
           r."ruleCount",
           1.0 AS score
    FROM intake_category_routes r
    WHERE r.id = $1
    LIMIT 1
    `,
    id,
  );
  return rows[0] ?? null;
}

/**
 * Level 2: filtered vector search — metadata filter on categorySlug BEFORE similarity.
 * Uses partial HNSW index when domain is set.
 */
export async function queryIntakeRulesVector(args: {
  query: string;
  domain: IntakeDomain;
  categorySlug: string;
  bundleTypes?: string[];
  limit?: number;
}): Promise<IntakeRuleHit[]> {
  const limit = Math.min(50, Math.max(1, args.limit ?? 12));
  const literal = pgvectorLiteral(await embedQuery(args.query));
  await setHnswEf();

  const bundleClause =
    args.bundleTypes && args.bundleTypes.length > 0
      ? `AND d."bundleType" IN (${args.bundleTypes.map((b) => `'${escSql(b)}'`).join(', ')})`
      : '';

  return db.$queryRawUnsafe<IntakeRuleHit[]>(
    `
    SELECT d.id, d."ruleKey", d."ruleKind", d.pattern, d."bundleType",
           d.description, d."technicalConstraints"::jsonb AS "technicalConstraints",
           d."categorySlug",
           1 - (d.embedding <=> $1::vector) AS score
    FROM intake_rule_documents d
    WHERE d.embedding IS NOT NULL
      AND d.domain = '${args.domain}'::"IntakeDomain"
      AND d."categorySlug" = '${escSql(args.categorySlug)}'
      ${bundleClause}
    ORDER BY d.embedding <=> $1::vector
    LIMIT $2
    `,
    literal,
    limit,
  );
}

/** Minimal rule fetch: requirement bundle + small match sample (no user query). */
export async function fetchIntakeRulesForCategory(args: {
  domain: IntakeDomain;
  categorySlug: string;
  matchSampleLimit?: number;
}): Promise<IntakeRuleHit[]> {
  const sampleLimit = Math.min(20, Math.max(1, args.matchSampleLimit ?? 5));

  const requirements = await db.$queryRawUnsafe<IntakeRuleHit[]>(
    `
    SELECT d.id, d."ruleKey", d."ruleKind", d.pattern, d."bundleType",
           d.description, d."technicalConstraints"::jsonb AS "technicalConstraints",
           d."categorySlug",
           1.0 AS score
    FROM intake_rule_documents d
    WHERE d.domain = $1::"IntakeDomain"
      AND d."categorySlug" = $2
      AND d."bundleType" = 'requirement'
    ORDER BY d.priority DESC
    LIMIT 1
    `,
    args.domain,
    args.categorySlug,
  );

  const matches = await db.$queryRawUnsafe<IntakeRuleHit[]>(
    `
    SELECT d.id, d."ruleKey", d."ruleKind", d.pattern, d."bundleType",
           d.description, d."technicalConstraints"::jsonb AS "technicalConstraints",
           d."categorySlug",
           1.0 AS score
    FROM intake_rule_documents d
    WHERE d.domain = $1::"IntakeDomain"
      AND d."categorySlug" = $2
      AND d."bundleType" IN ('match', 'negative')
    ORDER BY d.priority DESC, d.weight DESC
    LIMIT $3
    `,
    args.domain,
    args.categorySlug,
    sampleLimit,
  );

  return [...requirements, ...matches];
}
