import { db } from '@/lib/db';

/** Map canonical intake slugs → DB category slugs when they differ. */
const SLUG_ALIASES: Record<string, string[]> = {
  services: ['home-services', 'repairs', 'home-services'],
  'vehicles-car': ['repairs'],
  electronics: ['mobile-app', 'web-design-development'],
  general: ['consulting-education', 'home-services'],
};

/** Resolve Prisma category id from canonical slug (or first active category). */
export async function resolveCategoryId(categorySlug: string): Promise<string> {
  const aliases = SLUG_ALIASES[categorySlug] ?? [categorySlug];

  for (const slug of aliases) {
    const bySlug = await db.category.findFirst({
      where: { slug, isActive: true },
    });
    if (bySlug) return bySlug.id;
  }

  const bySlug = await db.category.findFirst({
    where: { slug: categorySlug, isActive: true },
  });
  if (bySlug) return bySlug.id;

  const byName = await db.category.findFirst({
    where: { name: { contains: categorySlug }, isActive: true },
  });
  if (byName) return byName.id;

  const fallback = await db.category.findFirst({
    where: { isActive: true, parentId: null },
    orderBy: { order: 'asc' },
  });
  if (fallback) return fallback.id;

  const any = await db.category.findFirst({ where: { isActive: true } });
  if (!any) throw new Error('No active category in database');
  return any.id;
}
