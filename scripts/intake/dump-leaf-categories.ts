/** Dumps leaf categories (slug + title path + vertical) as compact JSON for test generation. */
import { CANONICAL_CATEGORIES, getCategoryPath } from '@/config/categories';

const hasChild = new Set<string>();
for (const c of CANONICAL_CATEGORIES) if (c.parentSlug) hasChild.add(c.parentSlug);

const leaves = CANONICAL_CATEGORIES.filter(
  (c) => c.depth === 2 || (c.depth === 1 && !hasChild.has(c.slug))
).map((c) => {
  const path = getCategoryPath(c.slug);
  return {
    slug: c.slug,
    title: c.title,
    sectionTitle: path[0]?.title ?? '',
    parentTitle: path.length >= 2 ? path[path.length - 2]!.title : '',
    vertical: path[0]?.slug ?? '',
  };
});

process.stdout.write(JSON.stringify(leaves));
