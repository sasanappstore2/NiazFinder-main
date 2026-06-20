import { getCategoryBySlug } from '@/config/categories';

/** Breadcrumb-style label for category suggestion chips (e.g. املاک / اجاره مسکونی). */
export function formatCategorySuggestionLabel(parentTitle: string, leafTitle: string): string {
  return `${parentTitle} / ${leafTitle}`;
}

export function categorySuggestionLabelFromSlug(slug: string): string {
  const path = getCategoryBySlug(slug);
  if (!path) return slug;
  const parentSlug = path.parentSlug;
  const parent = parentSlug ? getCategoryBySlug(parentSlug) : null;
  if (parent && parent.slug !== path.slug) {
    return formatCategorySuggestionLabel(parent.title, path.title);
  }
  return path.title;
}
