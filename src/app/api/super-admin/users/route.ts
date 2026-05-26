import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'crm:users:read');
    if (!authz.ok) return authz.response;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';
    const role = searchParams.get('role')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';
    const page = Math.max(Number(searchParams.get('page') || 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 20), 1), 50);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (q) {
      where.OR = [
        { phone: { contains: q } },
        { email: { contains: q } },
        { displayName: { contains: q } },
        { firstName: { contains: q } },
        { lastName: { contains: q } },
      ];
    }
    if (role) where.role = role;
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (status === 'banned') where.isBanned = true;

    const [total, users] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          phone: true,
          email: true,
          firstName: true,
          lastName: true,
          displayName: true,
          role: true,
          isActive: true,
          isBanned: true,
          isVerified: true,
          createdAt: true,
          lastSeenAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Super admin users GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}

