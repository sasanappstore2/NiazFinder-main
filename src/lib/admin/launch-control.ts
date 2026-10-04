/**
 * Shared launch-control helpers for need categories, business occupations, and online stores.
 */

export type LaunchFlatItem = {
  id: string;
  name: string;
  slug: string;
  parentKey: string | null;
  isActive: boolean;
  sortOrder?: number;
};

export type LaunchNode = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  children: LaunchNode[];
};

export const REAL_ESTATE_NEED_ROOT_SLUG = 'real-estate';
export const REAL_ESTATE_OCCUPATION_ROOT_SLUG = 'real-estate-facility';

export function buildLaunchTree(flat: LaunchFlatItem[]): LaunchNode[] {
  const byParent = new Map<string | null, LaunchFlatItem[]>();
  for (const c of flat) {
    const key = c.parentKey ?? null;
    const list = byParent.get(key) ?? [];
    list.push(c);
    byParent.set(key, list);
  }
  const sort = (a: LaunchFlatItem, b: LaunchFlatItem) =>
    (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, 'fa');

  const walk = (parentKey: string | null): LaunchNode[] =>
    (byParent.get(parentKey) ?? [])
      .slice()
      .sort(sort)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        isActive: c.isActive,
        children: walk(c.id),
      }));

  return walk(null);
}

function collectSubtreeIds(rootId: string, flat: LaunchFlatItem[]): Set<string> {
  const byParent = new Map<string | null, LaunchFlatItem[]>();
  for (const c of flat) {
    const key = c.parentKey ?? null;
    const list = byParent.get(key) ?? [];
    list.push(c);
    byParent.set(key, list);
  }
  const ids = new Set<string>([rootId]);
  let frontier = [rootId];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const pid of frontier) {
      for (const child of byParent.get(pid) ?? []) {
        if (!ids.has(child.id)) {
          ids.add(child.id);
          next.push(child.id);
        }
      }
    }
    frontier = next;
  }
  return ids;
}

/** Activate everything under keepRootSlug; deactivate all other active rows. rootSlug=null → all off. */
export function computeRealEstateLaunchPlan(
  flat: LaunchFlatItem[],
  keepRootSlug: string | null
): { toActivate: LaunchFlatItem[]; toDeactivate: LaunchFlatItem[] } {
  if (keepRootSlug === null) {
    return {
      toActivate: [],
      toDeactivate: flat.filter((i) => i.isActive),
    };
  }

  const root = flat.find((i) => i.slug === keepRootSlug);
  if (!root) {
    return { toActivate: [], toDeactivate: flat.filter((i) => i.isActive) };
  }

  const keepIds = collectSubtreeIds(root.id, flat);
  const toActivate = flat.filter((i) => keepIds.has(i.id) && !i.isActive);
  const toDeactivate = flat.filter((i) => !keepIds.has(i.id) && i.isActive);
  return { toActivate, toDeactivate };
}

/** Prefer roots for deactivate when server cascades (need categories). */
export function pickDeactivateTargetsForCascade(
  flat: LaunchFlatItem[],
  toDeactivate: LaunchFlatItem[]
): LaunchFlatItem[] {
  const deactivateIds = new Set(toDeactivate.map((i) => i.id));
  return toDeactivate.filter((item) => {
    if (!item.parentKey) return true;
    return !deactivateIds.has(item.parentKey);
  });
}

/** Parents before children for activate. */
export function sortForActivate(items: LaunchFlatItem[], flat: LaunchFlatItem[]): LaunchFlatItem[] {
  const depth = new Map<string, number>();
  const walk = (parentKey: string | null, d: number) => {
    for (const c of flat.filter((x) => (x.parentKey ?? null) === parentKey)) {
      depth.set(c.id, d);
      walk(c.id, d + 1);
    }
  };
  walk(null, 0);
  return [...items].sort(
    (a, b) => (depth.get(a.id) ?? 0) - (depth.get(b.id) ?? 0) || a.name.localeCompare(b.name, 'fa')
  );
}

export type StatusFilter = 'all' | 'on' | 'off';

export function filterTreeBySearch(nodes: LaunchNode[], q: string): LaunchNode[] {
  if (!q) return nodes;
  const filterNode = (node: LaunchNode): LaunchNode | null => {
    const selfMatch =
      node.name.toLowerCase().includes(q) || node.slug.toLowerCase().includes(q);
    const children = node.children.map(filterNode).filter(Boolean) as LaunchNode[];
    if (selfMatch || children.length > 0) {
      return { ...node, children: selfMatch ? node.children : children };
    }
    return null;
  };
  return nodes.map(filterNode).filter(Boolean) as LaunchNode[];
}

export function filterTreeByStatus(nodes: LaunchNode[], status: StatusFilter): LaunchNode[] {
  if (status === 'all') return nodes;
  const wantOn = status === 'on';
  const filterNode = (node: LaunchNode): LaunchNode | null => {
    const children = node.children.map(filterNode).filter(Boolean) as LaunchNode[];
    const selfMatch = node.isActive === wantOn;
    if (selfMatch || children.length > 0) {
      return { ...node, children };
    }
    return null;
  };
  return nodes.map(filterNode).filter(Boolean) as LaunchNode[];
}

export function collectBulkTargets(nodes: LaunchNode[], nextActive: boolean): LaunchNode[] {
  const out: LaunchNode[] = [];
  const walk = (list: LaunchNode[], ancestorQueued: boolean) => {
    for (const n of list) {
      if (nextActive) {
        if (!n.isActive) out.push(n);
        walk(n.children, false);
      } else {
        if (n.isActive && !ancestorQueued) {
          out.push(n);
          walk(n.children, true);
        } else {
          walk(n.children, ancestorQueued || !n.isActive);
        }
      }
    }
  };
  walk(nodes, false);
  return out;
}

export function flatItemsFromNeedCategories(
  flat: Array<{
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    isActive: boolean;
    order?: number;
  }>
): LaunchFlatItem[] {
  return flat.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    parentKey: c.parentId,
    isActive: c.isActive,
    sortOrder: c.order,
  }));
}

export function flatItemsFromSlugTaxonomy(
  rows: Array<{
    slug: string;
    title: string;
    parentSlug: string | null;
    isActive: boolean;
    sortOrder?: number;
  }>
): LaunchFlatItem[] {
  const slugToId = new Map(rows.map((r) => [r.slug, r.slug]));
  return rows.map((r) => ({
    id: r.slug,
    name: r.title,
    slug: r.slug,
    parentKey: r.parentSlug ? (slugToId.get(r.parentSlug) ?? r.parentSlug) : null,
    isActive: r.isActive !== false,
    sortOrder: r.sortOrder,
  }));
}
