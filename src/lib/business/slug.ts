/** Build URL-safe business slug from display name. */

export function slugifyBusinessName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'business';
}

export async function uniqueBusinessSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  let slug = slugifyBusinessName(base);
  let n = 0;
  while (await exists(slug)) {
    n += 1;
    slug = `${slugifyBusinessName(base)}-${n}`;
  }
  return slug;
}
