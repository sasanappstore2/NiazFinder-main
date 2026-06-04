const PERSIAN_MAP: Record<string, string> = {
  'فروش': 'sales',
  'پشتیبانی': 'support',
  'سفارشات': 'orders',
  'مدیریت': 'management',
};

export function contactPointSlugFromLabel(label: string, fallback = 'contact'): string {
  const trimmed = label.trim();
  if (PERSIAN_MAP[trimmed]) return PERSIAN_MAP[trimmed];

  const ascii = trimmed
    .toLowerCase()
    .replace(/[\u0600-\u06FF\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return ascii || fallback;
}

export async function uniqueContactSlug(
  profileId: string,
  base: string,
  excludeId?: string
): Promise<string> {
  const { db } = await import('@/lib/db');
  let slug = base;
  let n = 0;
  while (true) {
    const existing = await db.businessContactPoint.findFirst({
      where: {
        profileId,
        slug,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (!existing) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}
