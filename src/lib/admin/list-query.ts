import type { NextRequest } from 'next/server';

export type AdminListQuery = {
  page: number;
  limit: number;
  skip: number;
  q: string;
  sort: string;
  status: string;
};

export function parseAdminListQuery(
  request: NextRequest,
  defaults: { limit?: number; maxLimit?: number } = {}
): AdminListQuery {
  const { searchParams } = new URL(request.url);
  const page = Math.max(Number(searchParams.get('page') || 1), 1);
  const defaultLimit = defaults.limit ?? 20;
  const maxLimit = defaults.maxLimit ?? 50;
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || defaultLimit), 1), maxLimit);
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
    q: searchParams.get('q')?.trim() || '',
    sort: searchParams.get('sort')?.trim() || 'createdAt:desc',
    status: searchParams.get('status')?.trim() || '',
  };
}

export function adminPaginationMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };
}
