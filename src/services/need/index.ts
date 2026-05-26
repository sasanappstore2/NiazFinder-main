import type { ApiRequestRow } from '@/types/api';
import type { NeedCardData } from '@/contracts/need-card';

export function mapApiRequestToNeedCard(row: ApiRequestRow): NeedCardData {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    budgetMin: row.budgetMin,
    budgetMax: row.budgetMax,
    budgetType: row.budgetType,
    city: row.city,
    province: row.province,
    categoryId: row.categoryId ?? row.category?.id,
    categoryName: row.category?.name,
    categoryIcon: row.category?.icon,
    status: row.status,
    priority: row.priority,
    viewCount: row.viewCount,
    proposalCount: row.proposalCount,
    createdAt: row.createdAt,
    tags: row.tags,
  };
}
