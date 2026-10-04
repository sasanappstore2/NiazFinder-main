/**
 * Apply real-estate-only launch preset across all three taxonomies.
 * Run: npx tsx scripts/admin/apply-real-estate-launch-preset.ts
 */
import { PrismaClient } from '@prisma/client';
import {
  REAL_ESTATE_NEED_ROOT_SLUG,
  REAL_ESTATE_OCCUPATION_ROOT_SLUG,
  computeRealEstateLaunchPlan,
  flatItemsFromNeedCategories,
  flatItemsFromSlugTaxonomy,
  pickDeactivateTargetsForCascade,
  sortForActivate,
} from '@/lib/admin/launch-control';
import {
  readManagedOccupations,
  writeManagedOccupations,
  setOccupationsCache,
} from '@/lib/business/occupations-registry';
import {
  readManagedOnlineStores,
  writeManagedOnlineStores,
  setOnlineStoresCache,
} from '@/lib/business/online-stores-registry';

const prisma = new PrismaClient();

async function applyNeedCategories() {
  const cats = await prisma.category.findMany({
    select: { id: true, name: true, slug: true, parentId: true, isActive: true, order: true },
  });
  const items = flatItemsFromNeedCategories(cats);
  const plan = computeRealEstateLaunchPlan(items, REAL_ESTATE_NEED_ROOT_SLUG);
  const deactivate = pickDeactivateTargetsForCascade(items, plan.toDeactivate);
  const activate = sortForActivate(plan.toActivate, items);

  for (const t of deactivate) {
    await prisma.category.update({ where: { id: t.id }, data: { isActive: false } });
    const descendants = await collectDescendantIds(prisma, t.id);
    if (descendants.length > 0) {
      await prisma.category.updateMany({
        where: { id: { in: descendants } },
        data: { isActive: false },
      });
    }
  }
  for (const t of activate) {
    await prisma.category.update({ where: { id: t.id }, data: { isActive: true } });
  }

  console.log(
    `[need-categories] deactivated roots=${deactivate.length} activated=${activate.length} total=${cats.length}`
  );
}

async function collectDescendantIds(db: PrismaClient, rootId: string): Promise<string[]> {
  const ids: string[] = [];
  let frontier = [rootId];
  while (frontier.length > 0) {
    const kids = await db.category.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true },
    });
    frontier = kids.map((k) => k.id);
    ids.push(...frontier);
  }
  return ids;
}

async function applyOccupations() {
  const rows = await readManagedOccupations();
  const items = flatItemsFromSlugTaxonomy(
    rows.map((o) => ({
      slug: o.slug,
      title: o.title,
      parentSlug: o.parentSlug,
      isActive: o.isActive,
      sortOrder: o.sortOrder,
    }))
  );
  const plan = computeRealEstateLaunchPlan(items, REAL_ESTATE_OCCUPATION_ROOT_SLUG);
  const activateSlugs = new Set(sortForActivate(plan.toActivate, items).map((i) => i.slug));
  const deactivateSlugs = new Set(plan.toDeactivate.map((i) => i.slug));

  const next = rows.map((o) => {
    if (deactivateSlugs.has(o.slug)) return { ...o, isActive: false };
    if (activateSlugs.has(o.slug)) return { ...o, isActive: true };
    return o;
  });

  await writeManagedOccupations(next);
  setOccupationsCache(next);
  console.log(
    `[business-occupations] deactivated=${deactivateSlugs.size} activated=${activateSlugs.size} total=${rows.length}`
  );
}

async function applyOnlineStores() {
  const rows = await readManagedOnlineStores();
  const items = flatItemsFromSlugTaxonomy(
    rows.map((o) => ({
      slug: o.slug,
      title: o.title,
      parentSlug: o.parentSlug,
      isActive: o.isActive,
      sortOrder: o.sortOrder,
    }))
  );
  const plan = computeRealEstateLaunchPlan(items, null);
  const deactivateSlugs = new Set(plan.toDeactivate.map((i) => i.slug));
  const next = rows.map((o) =>
    deactivateSlugs.has(o.slug) ? { ...o, isActive: false } : o
  );
  await writeManagedOnlineStores(next);
  setOnlineStoresCache(next);
  console.log(`[online-stores] deactivated=${deactivateSlugs.size} total=${rows.length}`);
}

async function main() {
  await applyNeedCategories();
  await applyOccupations();
  await applyOnlineStores();
  console.log('Real-estate launch preset applied.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
