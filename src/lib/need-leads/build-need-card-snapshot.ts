import { db } from '@/lib/db';
import { budgetToJson } from '@/lib/budget';
import type { NeedCardSnapshot } from '@/contracts/need-card-snapshot';
import type { NeedMatchContext } from '@/contracts/need-match';

function parseTags(raw: string): string[] {
  try {
    const p = JSON.parse(raw || '[]');
    return Array.isArray(p) ? p.map(String) : [];
  } catch {
    return [];
  }
}

export async function buildNeedCardSnapshot(
  requestId: string,
  need: NeedMatchContext,
  matchReasonFa?: string
): Promise<NeedCardSnapshot | null> {
  const r = await db.serviceRequest.findUnique({
    where: { id: requestId },
    include: {
      category: { select: { id: true, name: true, icon: true } },
      subcategory: { select: { name: true } },
    },
  });

  if (!r) return null;

  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    description: r.description.slice(0, 500),
    budgetMin: budgetToJson(r.budgetMin) ?? undefined,
    budgetMax: budgetToJson(r.budgetMax) ?? undefined,
    budgetType: r.budgetType,
    city: r.city ?? undefined,
    province: r.province ?? undefined,
    address: r.address ?? need.address ?? undefined,
    categoryId: r.categoryId,
    categoryName: r.subcategory?.name ?? r.category.name,
    categoryIcon: r.category.icon ?? undefined,
    status: r.status,
    priority: r.priority,
    viewCount: r.viewCount,
    proposalCount: r.proposalCount,
    createdAt: r.createdAt.toISOString(),
    tags: parseTags(r.tags),
    matchReasonFa,
  };
}
