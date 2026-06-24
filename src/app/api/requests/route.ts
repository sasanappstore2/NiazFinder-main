import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, createSlug, type PaginatedResponse } from '@/lib/auth';
import type { Prisma } from '@prisma/client';
import { scheduleNeedLeadOutreach } from '@/lib/need-leads/schedule';
import {
  RESERVED_BROWSE_PARAMS,
  parseRangeShorthand,
  RANGE_PARAM_MAP,
} from '@/config/category-filters/attr-params';
import {
  matchesDynamicAnswers,
  matchesNumericRanges,
} from '@/lib/filters/dynamic-answers-filter';
import { resolveNeighborhoodSlugs } from '@/lib/neighborhoods/server';
import { buildNeighborhoodWhereClauses } from '@/lib/neighborhoods/tokens';
import { shouldAutoApproveNeed } from '@/lib/need-intake/auto-approve-policy';
import { extractNeedBudgetMetaFromDynamicAnswers } from '@/lib/need/extract-need-budget-meta';
import { apiErrorFromUnknown } from '@/lib/db-health';
import { getPublicCategoryWhere, isCategoryAvailable } from '@/lib/categories/category-status';

// ============ TYPES ============

interface CreateRequestBody {
  title: string;
  description: string;
  categoryId: string;
  budgetMin?: number;
  budgetMax?: number;
  budgetType?: 'FIXED' | 'HOURLY' | 'NEGOTIABLE';
  deliveryTime?: number;
  deliveryUnit?: string;
  city?: string;
  province?: string;
  address?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  tags?: string[];
  intentType?: string;
  dynamicAnswers?: Record<string, unknown>;
  aiExtractedData?: Record<string, unknown>;
  source?: string;
}

interface RequestListItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  budgetMin: number | null;
  budgetMax: number | null;
  budgetType: string;
  deliveryTime: number | null;
  deliveryUnit: string;
  city: string | null;
  province: string | null;
  priority: string;
  status: string;
  tags: string[];
  viewCount: number;
  proposalCount: number;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  dealType?: string;
  rahnAmount?: number;
  monthlyRent?: number;
  deposit?: number;
  nightlyRent?: number;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    city: string | null;
    createdAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const REQUEST_STATUSES = ['PENDING_AI_REVIEW', 'PENDING_REVIEW', 'OPEN', 'IN_PROGRESS', 'CLOSED', 'COMPLETED', 'CANCELLED', 'REJECTED'] as const;

function budgetToJson(value: bigint | number | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === 'bigint' ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

function budgetToDb(value: number | undefined | null): bigint | null {
  if (value == null || Number.isNaN(value)) return null;
  return BigInt(Math.trunc(value));
}

function collectAttributeFilters(searchParams: URLSearchParams): {
  exact: Record<string, string>;
  ranges: { key: string; min?: number; max?: number }[];
} {
  const exact: Record<string, string> = {};
  const rangeAccum = new Map<string, { key: string; min?: number; max?: number }>();

  for (const key of searchParams.keys()) {
    if (RESERVED_BROWSE_PARAMS.has(key)) continue;
    const raw = searchParams.get(key);
    if (!raw?.trim()) continue;

    if (RANGE_PARAM_MAP[key]) {
      const parsed = parseRangeShorthand(key, raw);
      for (const [attrKey, val] of Object.entries(parsed)) {
        const n = Number(val);
        if (Number.isNaN(n)) continue;
        const entry = rangeAccum.get(attrKey) ?? { key: attrKey };
        if (attrKey.endsWith('Min')) entry.min = n;
        if (attrKey.endsWith('Max')) entry.max = n;
        rangeAccum.set(attrKey, entry);
      }
      continue;
    }

    if (key.endsWith('Min') || key.endsWith('Max')) {
      const n = Number(raw);
      if (!Number.isNaN(n)) {
        const entry = rangeAccum.get(key) ?? { key };
        if (key.endsWith('Min')) entry.min = n;
        else entry.max = n;
        rangeAccum.set(key, entry);
      }
      continue;
    }

    exact[key] = raw.trim();
  }

  const dealType = searchParams.get('dealType');
  if (dealType) exact.dealType = dealType.trim();

  return { exact, ranges: Array.from(rangeAccum.values()) };
}

function recentCutoff(recent: string): Date | null {
  const now = Date.now();
  if (recent === '24h') return new Date(now - 24 * 60 * 60 * 1000);
  if (recent === '7d') return new Date(now - 7 * 24 * 60 * 60 * 1000);
  if (recent === '30d') return new Date(now - 30 * 24 * 60 * 60 * 1000);
  return null;
}

// ============ GET handler ============

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const categoryFilter = searchParams.get('category') || searchParams.get('categoryId') || undefined;
    const province = searchParams.get('province') || undefined;
    const city = searchParams.get('city') || undefined;
    const statusParam = searchParams.get('status') || undefined;
    const mine = searchParams.get('mine') === '1' || searchParams.get('mine') === 'true';
    const sort = searchParams.get('sort') || 'newest';
    const search = searchParams.get('search') || undefined;
    const budgetMin = searchParams.get('budgetMin');
    const budgetMax = searchParams.get('budgetMax');
    const priority = searchParams.get('priority');
    const hasPhoto = searchParams.get('hasPhoto') === 'true' || searchParams.get('has-photo') === 'true';
    const recent = searchParams.get('recent');
    const { exact: attrExact, ranges: attrRanges } = collectAttributeFilters(searchParams);
    const needsPostFilter = attrRanges.length > 0;

    // Build where clause
    const where: Prisma.ServiceRequestWhereInput = {};
    const andFilters: Prisma.ServiceRequestWhereInput[] = [];

    if (mine) {
      const user = await getAuthUser(request);
      if (!user) {
        return NextResponse.json({ error: 'لطفاً ابتدا وارد حساب کاربری خود شوید' }, { status: 401 });
      }
      where.userId = user.id;
      if (
        statusParam &&
        REQUEST_STATUSES.includes(statusParam as (typeof REQUEST_STATUSES)[number])
      ) {
        where.status = statusParam as Prisma.EnumRequestStatusFilter['equals'];
      }
    } else {
      const status =
        statusParam && REQUEST_STATUSES.includes(statusParam as (typeof REQUEST_STATUSES)[number])
          ? statusParam
          : 'OPEN';
      where.status = status as Prisma.EnumRequestStatusFilter['equals'];
      where.moderationStatus = 'APPROVED';
    }

    if (categoryFilter) {
      const category = await db.category.findFirst({
        where: getPublicCategoryWhere({
          OR: [{ id: categoryFilter }, { slug: categoryFilter }],
        }),
        include: {
          children: {
            where: getPublicCategoryWhere(),
            select: { id: true },
          },
        },
      });

      if (category) {
        const categoryIds = [category.id, ...category.children.map((child) => child.id)];
        andFilters.push({
          OR: [
            { categoryId: { in: categoryIds } },
            { subcategoryId: { in: categoryIds } },
          ],
        });
      } else {
        console.warn('[requests] unknown category slug/id — returning empty set:', categoryFilter);
        andFilters.push({ categoryId: { in: [] } });
      }
    }

    const { buildGeoAndFilters } = await import('@/lib/search/geo-api-filters');
    andFilters.push(
      ...buildGeoAndFilters({
        citiesParam: searchParams.get('cities'),
        provincesParam: searchParams.get('provinces'),
        legacyCity: city,
        legacyProvince: province,
      })
    );

    const neighborhoodsParam = searchParams.get('neighborhoods');
    const neighborhoodCityId = searchParams.get('neighborhoodCity')?.trim();

    if (neighborhoodsParam && neighborhoodCityId) {
      const slugs = neighborhoodsParam
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (slugs.length > 0) {
        const resolved = await resolveNeighborhoodSlugs(neighborhoodCityId, slugs);
        if (resolved.length > 0) {
          andFilters.push(...buildNeighborhoodWhereClauses(resolved));
        }
      }
    }

    if (budgetMin) {
      const n = Number(budgetMin);
      if (!Number.isNaN(n)) {
        andFilters.push({
          OR: [{ budgetMin: { gte: n } }, { budgetMax: { gte: n } }],
        });
      }
    }
    if (budgetMax) {
      const n = Number(budgetMax);
      if (!Number.isNaN(n)) {
        andFilters.push({
          OR: [{ budgetMin: { lte: n } }, { budgetMax: { lte: n } }, { budgetMin: null }],
        });
      }
    }

    if (priority && ['LOW', 'NORMAL', 'HIGH', 'URGENT'].includes(priority)) {
      where.priority = priority as Prisma.EnumPriorityFilter['equals'];
    }

    if (hasPhoto) {
      andFilters.push({ NOT: { attachmentUrls: '[]' } });
    }

    const recentDate = recent ? recentCutoff(recent) : null;
    if (recentDate) {
      where.createdAt = { gte: recentDate };
    }

    for (const [key, val] of Object.entries(attrExact)) {
      andFilters.push({
        dynamicAnswers: { contains: `"${key}":"${val}"` },
      });
    }

    if (search) {
      andFilters.push({
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
        ],
      });
    }

    if (andFilters.length) {
      where.AND = andFilters;
    }

    // Build orderBy
    let orderBy: Prisma.ServiceRequestOrderByWithRelationInput;
    switch (sort) {
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'budget_low':
        orderBy = { budgetMin: 'asc' };
        break;
      case 'budget_high':
        orderBy = { budgetMax: 'desc' };
        break;
      case 'most_proposals':
        orderBy = { proposalCount: 'desc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const skip = (page - 1) * limit;
    const fetchTake = needsPostFilter ? Math.min(limit * 8, 200) : limit;
    const fetchSkip = needsPostFilter ? 0 : skip;

    let [requests, total] = await Promise.all([
      db.serviceRequest.findMany({
        where,
        orderBy,
        skip: fetchSkip,
        take: fetchTake,
        include: {
          category: {
            select: { id: true, name: true, icon: true },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              city: true,
              createdAt: true,
            },
          },
        },
      }),
      db.serviceRequest.count({ where }),
    ]);

    if (needsPostFilter) {
      const filtered = requests.filter((r) =>
        matchesDynamicAnswers(r.dynamicAnswers, attrExact) &&
        matchesNumericRanges(r.dynamicAnswers, attrRanges)
      );
      total = filtered.length;
      requests = filtered.slice(skip, skip + limit);
    }

    const mappedRequests: RequestListItem[] = requests.map((r) => {
      const budgetMeta = extractNeedBudgetMetaFromDynamicAnswers(r.dynamicAnswers);
      return {
      id: r.id,
      title: r.title,
      slug: r.slug,
      description: r.description,
      address: r.address,
      budgetMin: budgetToJson(r.budgetMin),
      budgetMax: budgetToJson(r.budgetMax),
      budgetType: r.budgetType,
      deliveryTime: r.deliveryTime,
      deliveryUnit: r.deliveryUnit,
      city: r.city,
      province: r.province,
      priority: r.priority,
      status: r.status,
      tags: (() => {
        try {
          const parsed = JSON.parse(r.tags || '[]');
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })(),
      viewCount: r.viewCount,
      proposalCount: r.proposalCount,
      categoryId: r.categoryId,
      categoryName: r.category.name,
      categoryIcon: r.category.icon,
      dealType: budgetMeta.dealType,
      rahnAmount: budgetMeta.rahnAmount,
      monthlyRent: budgetMeta.monthlyRent,
      deposit: budgetMeta.deposit,
      nightlyRent: budgetMeta.nightlyRent,
      user: r.user,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
    });

    const response: PaginatedResponse<RequestListItem> = {
      data: mappedRequests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Requests GET error:', error);
    const { error: message, status } = apiErrorFromUnknown(error);
    return NextResponse.json({ error: message }, { status });
  }
}

// ============ POST handler ============

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'لطفاً ابتدا وارد حساب کاربری خود شوید' },
        { status: 401 }
      );
    }

    const body: CreateRequestBody = await request.json();
    const {
      title,
      description,
      categoryId,
      budgetMin,
      budgetMax,
      budgetType,
      deliveryTime,
      deliveryUnit,
      city,
      province,
      address,
      priority,
      tags,
      intentType,
      dynamicAnswers,
      aiExtractedData,
      source,
    } = body;

    // Validate required fields
    if (!title?.trim() || !description?.trim() || !categoryId) {
      return NextResponse.json(
        { error: 'عنوان، توضیحات و دسته‌بندی الزامی است' },
        { status: 400 }
      );
    }

    // Verify category exists
    const category = await db.category.findUnique({
      where: { id: categoryId },
    });

    if (!category || !isCategoryAvailable(category.status)) {
      return NextResponse.json(
        { error: 'دسته‌بندی معتبر نیست یا غیرفعال است' },
        { status: 400 }
      );
    }

    // Generate unique slug
    let slug = createSlug(title);
    const existingSlug = await db.serviceRequest.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    // Create request — dev defaults to auto-publish for easier local QA
    const autoApproveDev = shouldAutoApproveNeed(source?.trim() || 'form');

    const serviceRequest = await db.serviceRequest.create({
      data: {
        title: title.trim(),
        slug,
        description: description.trim(),
        budgetMin: budgetToDb(budgetMin),
        budgetMax: budgetToDb(budgetMax),
        budgetType: budgetType || 'FIXED',
        deliveryTime: deliveryTime ?? null,
        deliveryUnit: deliveryUnit || 'day',
        city: city?.trim() || null,
        province: province?.trim() || null,
        address: address?.trim() || null,
        categoryId,
        priority: priority || 'NORMAL',
        tags: JSON.stringify(tags || []),
        intentType: intentType?.trim() || null,
        dynamicAnswers: JSON.stringify(dynamicAnswers ?? {}),
        aiExtractedData: JSON.stringify(aiExtractedData ?? {}),
        source: source?.trim() || 'form',
        userId: user.id,
        status: autoApproveDev ? 'OPEN' : 'PENDING_REVIEW',
        moderationStatus: autoApproveDev ? 'APPROVED' : 'PENDING',
        ...(autoApproveDev
          ? { reviewedAt: new Date(), reviewedByUserId: user.id }
          : {}),
      },
      include: {
        category: {
          select: { id: true, name: true, icon: true },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            city: true,
            createdAt: true,
          },
        },
      },
    });

    const mappedRequest: RequestListItem = {
      id: serviceRequest.id,
      title: serviceRequest.title,
      slug: serviceRequest.slug,
      description: serviceRequest.description,
      budgetMin: budgetToJson(serviceRequest.budgetMin),
      budgetMax: budgetToJson(serviceRequest.budgetMax),
      budgetType: serviceRequest.budgetType,
      deliveryTime: serviceRequest.deliveryTime,
      deliveryUnit: serviceRequest.deliveryUnit,
      city: serviceRequest.city,
      province: serviceRequest.province,
      priority: serviceRequest.priority,
      status: serviceRequest.status,
      tags: JSON.parse(serviceRequest.tags),
      viewCount: serviceRequest.viewCount,
      proposalCount: serviceRequest.proposalCount,
      categoryId: serviceRequest.categoryId,
      categoryName: serviceRequest.category.name,
      categoryIcon: serviceRequest.category.icon,
      user: serviceRequest.user,
      createdAt: serviceRequest.createdAt,
      updatedAt: serviceRequest.updatedAt,
    };

    void import('@/lib/request-moderation/enqueue').then(({ enqueueRequestModerationJob }) =>
      enqueueRequestModerationJob(serviceRequest.id)
    );

    return NextResponse.json(
      { message: 'نیاز ثبت شد و در صف بازبینی قرار گرفت', request: mappedRequest },
      { status: 201 }
    );
  } catch (error) {
    console.error('Requests POST error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
