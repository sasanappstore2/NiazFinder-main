import { isCategorySlug } from '@/config/categories';
import { isOccupationSlug } from '@/config/business-occupations';
import type { ManagedOnlineStoreCategory } from '@/lib/business/online-stores-cache';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateOnlineStoreSlug(slug: string): string | null {
  const t = slug.trim();
  if (!t) return 'slug الزامی است';
  if (!SLUG_RE.test(t)) return 'slug باید kebab-case باشد';
  if (!t.startsWith('online-')) return 'slug فروشگاه آنلاین باید با online- شروع شود';
  if (isCategorySlug(t)) return 'slug با دسته‌بندی نیازها تداخل دارد';
  if (isOccupationSlug(t)) return 'slug با دسته‌بندی کسب‌وکار تداخل دارد';
  return null;
}

export function validateOnlineStorePayload(
  payload: Partial<ManagedOnlineStoreCategory>,
  existing: ManagedOnlineStoreCategory[],
  editingSlug?: string
): string | null {
  const slug = payload.slug?.trim();
  if (slug) {
    const slugErr = validateOnlineStoreSlug(slug);
    if (slugErr) return slugErr;
    if (existing.some((c) => c.slug === slug && c.slug !== editingSlug)) {
      return 'slug تکراری است';
    }
  }

  const depth = payload.depth;
  const parentSlug = payload.parentSlug ?? null;

  if (depth === 0 && parentSlug !== null) {
    return 'sector باید parentSlug=null داشته باشد';
  }
  if (depth === 1) {
    if (!parentSlug) return 'دسته فرعی باید sector والد داشته باشد';
    const parent = existing.find((c) => c.slug === parentSlug);
    if (!parent || parent.depth !== 0) return 'sector والد معتبر نیست';
  }

  if (payload.title !== undefined && !String(payload.title).trim()) {
    return 'عنوان فارسی الزامی است';
  }

  return null;
}

export { countProfilesByOccupationSlug as countProfilesByOnlineStoreSlug } from '@/lib/business/occupations-admin';
