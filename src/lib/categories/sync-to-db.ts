/**
 * Upsert canonical categories into Prisma Category table.
 * Run: npm run categories:sync
 */
import { PrismaClient } from '@prisma/client';
import { CANONICAL_CATEGORIES } from '@/config/categories';

const prisma = new PrismaClient();

const CANONICAL_SLUG_SET = new Set(CANONICAL_CATEGORIES.map((c) => c.slug));

export async function syncCanonicalCategoriesToDb(): Promise<{
  upserted: number;
  deactivated: number;
}> {
  const slugToId = new Map<string, string>();

  // Pass 1: upsert without parentId (roots and orphans)
  for (let i = 0; i < CANONICAL_CATEGORIES.length; i++) {
    const cat = CANONICAL_CATEGORIES[i];
    const row = await prisma.category.upsert({
      where: { slug: cat.slug },
      create: {
        name: cat.title,
        slug: cat.slug,
        description: cat.englishTitle ?? cat.title,
        order: i,
        isActive: true,
      },
      update: {
        name: cat.title,
        description: cat.englishTitle ?? cat.title,
        order: i,
        // Preserve admin launch toggles — do not force re-activate.
      },
    });
    slugToId.set(cat.slug, row.id);
  }

  // Pass 2: wire parentId
  for (const cat of CANONICAL_CATEGORIES) {
    if (!cat.parentSlug) continue;
    const id = slugToId.get(cat.slug);
    const parentId = slugToId.get(cat.parentSlug);
    if (!id || !parentId) continue;
    await prisma.category.update({
      where: { id },
      data: { parentId },
    });
  }

  // Deactivate legacy categories not in canonical registry
  const legacy = await prisma.category.findMany({
    where: { slug: { notIn: [...CANONICAL_SLUG_SET] } },
    select: { id: true },
  });
  if (legacy.length > 0) {
    await prisma.category.updateMany({
      where: { id: { in: legacy.map((c) => c.id) } },
      data: { isActive: false },
    });
  }

  return { upserted: CANONICAL_CATEGORIES.length, deactivated: legacy.length };
}

