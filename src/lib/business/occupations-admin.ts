import { isCategorySlug } from '@/config/categories';
import type { ManagedBusinessOccupation } from '@/lib/business/occupations-cache';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateOccupationSlug(slug: string): string | null {
  const t = slug.trim();
  if (!t) return 'slug الزامی است';
  if (!SLUG_RE.test(t)) return 'slug باید kebab-case باشد';
  if (isCategorySlug(t)) return 'slug با دسته‌بندی نیازها تداخل دارد';
  return null;
}

export function validateOccupationPayload(
  payload: Partial<ManagedBusinessOccupation>,
  existing: ManagedBusinessOccupation[],
  editingSlug?: string
): string | null {
  const slug = payload.slug?.trim();
  if (slug) {
    const slugErr = validateOccupationSlug(slug);
    if (slugErr) return slugErr;
    if (existing.some((o) => o.slug === slug && o.slug !== editingSlug)) {
      return 'slug تکراری است';
    }
  }

  const depth = payload.depth;
  const parentSlug = payload.parentSlug ?? null;

  if (depth === 0 && parentSlug !== null) {
    return 'sector باید parentSlug=null داشته باشد';
  }
  if (depth === 1) {
    if (!parentSlug) return 'شغل باید sector والد داشته باشد';
    const parent = existing.find((o) => o.slug === parentSlug);
    if (!parent || parent.depth !== 0) return 'sector والد معتبر نیست';
  }

  if (payload.title !== undefined && !String(payload.title).trim()) {
    return 'عنوان فارسی الزامی است';
  }

  return null;
}

export function countProfilesByOccupationSlug(
  profiles: Array<{ categorySlugs: string }>
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const profile of profiles) {
    let slugs: string[] = [];
    try {
      slugs = JSON.parse(profile.categorySlugs) as string[];
    } catch {
      continue;
    }
    for (const slug of slugs) {
      if (typeof slug !== 'string' || !slug.trim()) continue;
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
  }
  return counts;
}
