import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, createSlug, type PaginatedResponse } from '@/lib/auth';
import type { Prisma } from '@prisma/client';

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

// ============ GET handler ============

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const categoryFilter = searchParams.get('category') || searchParams.get('categoryId') || undefined;
    const province = searchParams.get('province') || undefined;
    const city = searchParams.get('city') || undefined;
    const status = searchParams.get('status') || undefined;
    const sort = searchParams.get('sort') || 'newest';
    const search = searchParams.get('search') || undefined;

    // Build where clause
    const where: Prisma.ServiceRequestWhereInput = {};
    const andFilters: Prisma.ServiceRequestWhereInput[] = [];

    if (categoryFilter) {
      const category = await db.category.findFirst({
        where: {
          OR: [
            { id: categoryFilter },
            { slug: categoryFilter },
          ],
        },
        include: {
          children: { select: { id: true } },
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
        where.categoryId = categoryFilter;
      }
    }

    if (province) {
      where.province = { contains: province };
    }

    const citiesParam = searchParams.get('cities');
    if (citiesParam) {
      const cityNames = citiesParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (cityNames.length === 1) {
        where.city = { contains: cityNames[0] };
      } else if (cityNames.length > 1) {
        andFilters.push({
          OR: cityNames.map((name) => ({ city: { contains: name } })),
        });
      }
    } else if (city) {
      where.city = { contains: city };
    }

    if (status && ['OPEN', 'IN_PROGRESS', 'CLOSED', 'COMPLETED', 'CANCELLED'].includes(status)) {
      where.status = status as Prisma.EnumRequestStatusFilter['equals'];
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

    const [requests, total] = await Promise.all([
      db.serviceRequest.findMany({
        where,
        orderBy,
        skip,
        take: limit,
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

    const mappedRequests: RequestListItem[] = requests.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      description: r.description,
      budgetMin: r.budgetMin,
      budgetMax: r.budgetMax,
      budgetType: r.budgetType,
      deliveryTime: r.deliveryTime,
      deliveryUnit: r.deliveryUnit,
      city: r.city,
      province: r.province,
      priority: r.priority,
      status: r.status,
      tags: JSON.parse(r.tags),
      viewCount: r.viewCount,
      proposalCount: r.proposalCount,
      categoryId: r.categoryId,
      categoryName: r.category.name,
      categoryIcon: r.category.icon,
      user: r.user,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

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
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
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

    if (!category || !category.isActive) {
      return NextResponse.json(
        { error: 'دسته‌بندی معتبر نیست' },
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

    // Create request
    const serviceRequest = await db.serviceRequest.create({
      data: {
        title: title.trim(),
        slug,
        description: description.trim(),
        budgetMin: budgetMin ?? null,
        budgetMax: budgetMax ?? null,
        budgetType: budgetType || 'FIXED',
        deliveryTime: deliveryTime ?? null,
        deliveryUnit: deliveryUnit || 'day',
        city: city?.trim() || null,
        province: province?.trim() || null,
        categoryId,
        priority: priority || 'NORMAL',
        tags: JSON.stringify(tags || []),
        intentType: intentType?.trim() || null,
        dynamicAnswers: JSON.stringify(dynamicAnswers ?? {}),
        aiExtractedData: JSON.stringify(aiExtractedData ?? {}),
        source: source?.trim() || 'form',
        userId: user.id,
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
      budgetMin: serviceRequest.budgetMin,
      budgetMax: serviceRequest.budgetMax,
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

    return NextResponse.json(
      { message: 'نیاز با موفقیت ثبت شد', request: mappedRequest },
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
