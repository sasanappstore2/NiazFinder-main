/**
 * Level 1 indexing: category routes for NEEDS + BUSINESS domains.
 * Run: npm run intake:index:categories
 */
import { PrismaClient, IntakeDomain } from '@prisma/client';
import { CANONICAL_CATEGORIES } from '../../src/config/categories';
import { DEFAULT_BUSINESS_OCCUPATIONS } from '../../src/config/business-occupations-defaults';
import { PACK_INTAKE_MANIFEST } from '../../src/intake/rules/pack-intake-manifest';
import {
  buildCategoryRouteDescription,
} from '../../src/lib/intake-agent/rule-mapper';
import { embedModelId, embedPassagesBatch } from '../../src/lib/ai-agent/embedding-client';
import { pgvectorLiteral } from '../../src/lib/ai-agent/pgvector';

const prisma = new PrismaClient();
const BATCH = Number(process.env.EMBED_BATCH_SIZE ?? 32);

function semanticPath(title: string, parentSlug: string | null, slug: string): string {
  const parts = parentSlug ? [parentSlug.replace(/-/g, ' '), title, slug.replace(/-/g, ' ')] : [title, slug.replace(/-/g, ' ')];
  return parts.join(' > ');
}

async function upsertNeedsRoutes(): Promise<number> {
  let count = 0;
  const categoriesBySlug = new Map(
    (await prisma.category.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id]),
  );

  for (const cat of CANONICAL_CATEGORIES) {
    const manifest = PACK_INTAKE_MANIFEST[cat.slug];
    const description = buildCategoryRouteDescription({
      title: cat.title,
      slug: cat.slug,
      parentSlug: cat.parentSlug,
      englishTitle: cat.englishTitle,
      requiredFields: manifest?.requiredFields,
      optionalFields: manifest?.optionalFields,
    });

    await prisma.intakeCategoryRoute.upsert({
      where: { domain_slug: { domain: IntakeDomain.NEEDS, slug: cat.slug } },
      create: {
        domain: IntakeDomain.NEEDS,
        slug: cat.slug,
        parentSlug: cat.parentSlug,
        title: cat.title,
        depth: cat.depth,
        categoryId: categoriesBySlug.get(cat.slug) ?? null,
        description,
        semanticPath: semanticPath(cat.title, cat.parentSlug, cat.slug),
        technicalConstraints: manifest
          ? { requiredFields: manifest.requiredFields, optionalFields: manifest.optionalFields }
          : {},
      },
      update: {
        parentSlug: cat.parentSlug,
        title: cat.title,
        depth: cat.depth,
        categoryId: categoriesBySlug.get(cat.slug) ?? null,
        description,
        semanticPath: semanticPath(cat.title, cat.parentSlug, cat.slug),
        technicalConstraints: manifest
          ? { requiredFields: manifest.requiredFields, optionalFields: manifest.optionalFields }
          : {},
      },
    });
    count += 1;
  }
  return count;
}

async function upsertBusinessRoutes(): Promise<number> {
  let count = 0;
  for (const occ of DEFAULT_BUSINESS_OCCUPATIONS.filter((o) => o.isActive !== false)) {
    const description = buildCategoryRouteDescription({
      title: occ.title,
      slug: occ.slug,
      parentSlug: occ.parentSlug,
      englishTitle: occ.englishTitle,
      requiredFields: ['serviceDescription', 'city', 'contactPhone'],
      optionalFields: ['portfolio', 'yearsExperience', 'serviceArea'],
    });

    await prisma.intakeCategoryRoute.upsert({
      where: { domain_slug: { domain: IntakeDomain.BUSINESS, slug: occ.slug } },
      create: {
        domain: IntakeDomain.BUSINESS,
        slug: occ.slug,
        parentSlug: occ.parentSlug,
        title: occ.title,
        depth: occ.depth,
        description,
        semanticPath: semanticPath(occ.title, occ.parentSlug, occ.slug),
        technicalConstraints: {
          requiredFields: ['serviceDescription', 'city', 'contactPhone'],
          optionalFields: ['portfolio', 'yearsExperience', 'serviceArea'],
        },
      },
      update: {
        parentSlug: occ.parentSlug,
        title: occ.title,
        depth: occ.depth,
        description,
        semanticPath: semanticPath(occ.title, occ.parentSlug, occ.slug),
      },
    });
    count += 1;
  }
  return count;
}

async function embedRoutes(): Promise<number> {
  let updated = 0;
  for (;;) {
    const rows = await prisma.intakeCategoryRoute.findMany({
      where: { embeddedAt: null },
      take: BATCH,
      select: { id: true, semanticPath: true, description: true },
    });
    if (rows.length === 0) break;

    const texts = rows.map((r) => r.semanticPath ?? r.description);
    const vectors = await embedPassagesBatch(texts);
    const model = embedModelId();
    const now = new Date();

    for (let i = 0; i < rows.length; i++) {
      await prisma.$executeRawUnsafe(
        `UPDATE intake_category_routes SET embedding = $1::vector, "embeddingModel" = $2, "embeddedAt" = $3 WHERE id = $4`,
        pgvectorLiteral(vectors[i]),
        model,
        now,
        rows[i].id,
      );
      updated += 1;
    }
    console.log(`category routes embedded: +${rows.length} (total ${updated})`);
  }
  return updated;
}

async function main() {
  const needs = await upsertNeedsRoutes();
  const business = await upsertBusinessRoutes();
  console.log(`Upserted ${needs} NEEDS routes, ${business} BUSINESS routes`);

  const embedded = await embedRoutes();
  console.log(`Embedded ${embedded} category routes`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
