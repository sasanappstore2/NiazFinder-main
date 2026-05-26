import { db } from '@/lib/db';
import type { NeedMatchContext } from '@/contracts/need-match';

function parseJsonArray(raw: string): string[] {
  try {
    const p = JSON.parse(raw || '[]');
    return Array.isArray(p) ? p.map(String) : [];
  } catch {
    return [];
  }
}

function parseJsonObject(raw: string): Record<string, unknown> {
  try {
    const p = JSON.parse(raw || '{}');
    return p && typeof p === 'object' && !Array.isArray(p) ? (p as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Load ServiceRequest with category → NeedMatchContext for matching/outreach. */
export async function buildNeedMatchContextFromRequest(
  requestId: string
): Promise<NeedMatchContext | null> {
  const r = await db.serviceRequest.findUnique({
    where: { id: requestId },
    include: {
      category: { select: { slug: true, name: true, icon: true } },
      subcategory: { select: { slug: true, name: true } },
    },
  });

  if (!r) return null;

  const categorySlug =
    r.subcategory?.slug ?? r.category.slug ?? 'general';
  const categoryName = r.subcategory?.name ?? r.category.name;

  return {
    id: r.id,
    title: r.title,
    description: r.description,
    city: r.city,
    province: r.province,
    address: r.address,
    categorySlug,
    categoryName,
    tags: parseJsonArray(r.tags),
    budgetMin: r.budgetMin,
    budgetMax: r.budgetMax,
    dynamicAnswers: parseJsonObject(r.dynamicAnswers),
  };
}
