import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import type { ModerationStatus, Prisma } from '@prisma/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'market:requests:read');
    if (!authz.ok) return authz.response;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';
    const moderationStatus = searchParams.get('moderationStatus')?.trim() || '';
    const assignedTo = searchParams.get('assignedTo')?.trim() || '';
    const cursor = searchParams.get('cursor')?.trim() || '';
    const page = Math.max(Number(searchParams.get('page') || 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 20), 1), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceRequestWhereInput = {};
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { city: { contains: q } },
        { province: { contains: q } },
      ];
    }
    if (status) where.status = status as Prisma.EnumRequestStatusFilter['equals'];
    if (moderationStatus) {
      where.moderationStatus = moderationStatus as ModerationStatus;
    }
    if (assignedTo === 'me') {
      where.assignedToUserId = authz.user.id;
    } else if (assignedTo === 'unassigned') {
      where.assignedToUserId = null;
    } else if (assignedTo) {
      where.assignedToUserId = assignedTo;
    }

    const orderBy = { createdAt: 'desc' as const };
    const useCursor = Boolean(cursor);

    const [total, requests] = await Promise.all([
      db.serviceRequest.count({ where }),
      db.serviceRequest.findMany({
        where,
        orderBy,
        ...(useCursor
          ? { cursor: { id: cursor }, skip: 1, take: limit }
          : { skip, take: limit }),
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          status: true,
          moderationStatus: true,
          priority: true,
          city: true,
          province: true,
          createdAt: true,
          reviewedAt: true,
          rejectionReason: true,
          assignedToUserId: true,
          user: {
            select: {
              id: true,
              displayName: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          category: { select: { id: true, name: true, slug: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
          assignedTo: {
            select: { id: true, displayName: true, firstName: true, lastName: true },
          },
          _count: { select: { proposals: true } },
        },
      }),
    ]);

    const nextCursor = requests.length === limit ? requests[requests.length - 1]?.id : null;

    return NextResponse.json({
      requests: requests.map((r) => ({
        ...r,
        proposalCount: r._count.proposals,
        _count: undefined,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        nextCursor,
      },
    });
  } catch (error) {
    console.error('Super admin requests GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
