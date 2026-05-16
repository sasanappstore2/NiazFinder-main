import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { normalizeText, fuzzySearch } from '@/lib/persian-normalize';

// Common select fields for User model
const USER_SELECT = {
  id: true,
  email: true,
  phone: true,
  username: true,
  firstName: true,
  lastName: true,
  displayName: true,
  avatar: true,
  bio: true,
  city: true,
  province: true,
  role: true,
  isVerified: true,
  isActive: true,
  isBanned: true,
  online: true,
  lastSeenAt: true,
  createdAt: true,
} as const;

const USER_PUBLIC_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  displayName: true,
  username: true,
  avatar: true,
  bio: true,
  city: true,
  province: true,
  role: true,
  isVerified: true,
  isActive: true,
  isBanned: true,
  online: true,
  lastSeenAt: true,
  createdAt: true,
} as const;

// GET /api/users - list users (public fuzzy search + authenticated listing)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';
    const search = url.searchParams.get('search') || '';
    const role = url.searchParams.get('role') || '';
    const status = url.searchParams.get('status') || '';
    const sort = url.searchParams.get('sort') || 'newest';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);

    // ─── Public fuzzy search (q parameter - no auth required) ────────────
    if (q && q.trim().length > 0) {
      const trimmedQ = q.trim();

      const whereClause: Record<string, unknown> = { isActive: true, isBanned: false };
      if (role) {
        if (role.includes(',')) {
          whereClause.role = { in: role.split(',') };
        } else {
          whereClause.role = role;
        }
      }

      const allUsers = await db.user.findMany({
        where: whereClause,
        select: USER_PUBLIC_SELECT,
        take: 100,
      });

      const results = fuzzySearch(allUsers, trimmedQ, [
        (u) => u.username || '',
        (u) => u.displayName || '',
        (u) => `${u.firstName} ${u.lastName}`,
        (u) => u.email,
        (u) => u.bio || '',
        (u) => u.city || '',
      ], 1, 0.3);

      const sliced = results.slice(0, limit);

      return NextResponse.json({
        data: sliced.map(r => ({ ...r.item, _score: r.score })),
        pagination: {
          page: 1,
          limit,
          total: results.length,
          totalPages: Math.ceil(results.length / limit),
        },
      });
    }

    // ─── Authenticated listing (auth required) ──────────
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const where: Record<string, unknown> = { isActive: true };

    if (authUser.role === 'ADMIN' || authUser.role === 'SUPER_ADMIN') {
      delete where.isActive;
    }

    if (role) {
      if (role.includes(',')) {
        where.role = { in: role.split(',') };
      } else {
        where.role = role;
      }
    }
    if (status === 'banned') where.isBanned = true;
    else if (status === 'inactive') where.isActive = false;

    const skip = (page - 1) * limit;

    let orderBy: Record<string, string> = { createdAt: 'desc' };

    if (search && search.trim().length > 0) {
      const trimmedSearch = search.trim();
      where.OR = [
        { firstName: { contains: trimmedSearch } },
        { lastName: { contains: trimmedSearch } },
        { displayName: { contains: trimmedSearch } },
        { username: { contains: trimmedSearch } },
        { phone: { contains: trimmedSearch } },
        { email: { contains: trimmedSearch } },
        { bio: { contains: trimmedSearch } },
      ];
    }

    const [dbUsers, total] = await Promise.all([
      db.user.findMany({
        where,
        select: USER_SELECT,
        orderBy,
        skip,
        take: limit,
      }),
      db.user.count({ where }),
    ]);

    let users = dbUsers;

    if (search && search.trim().length > 0) {
      const qStr = search.trim();
      const normalizedQ = normalizeText(qStr);
      const hasPersianVariants = normalizedQ !== qStr.toLowerCase();

      if (hasPersianVariants && dbUsers.length < total) {
        const allUsers = await db.user.findMany({
          where: {
            ...(authUser.role === 'ADMIN' || authUser.role === 'SUPER_ADMIN' ? {} : { isActive: true }),
            ...(role ? (role.includes(',') ? { role: { in: role.split(',') } } : { role }) : {}),
            ...(status === 'banned' ? { isBanned: true } : status === 'inactive' ? { isActive: false } : {}),
          },
          select: USER_SELECT,
          orderBy,
          take: 100,
        });

        users = allUsers.filter((u) => {
          const searchableText = [u.firstName, u.lastName, u.displayName || '', u.username || '', u.bio || '', u.city || ''].join(' ');
          return normalizeText(searchableText).includes(normalizedQ);
        });
      } else if (!hasPersianVariants && dbUsers.length === 0 && qStr.length >= 1) {
        const allUsers = await db.user.findMany({
          where: { ...(authUser.role === 'ADMIN' || authUser.role === 'SUPER_ADMIN' ? {} : { isActive: true }) },
          select: USER_SELECT,
          orderBy,
          take: 50,
        });

        users = allUsers.filter((u) => {
          const searchableText = [u.firstName, u.lastName, u.displayName || '', u.username || '', u.bio || '', u.city || ''].join(' ');
          return normalizeText(searchableText).includes(normalizedQ);
        });
      }
    }

    if (search && search.trim().length > 0) {
      if (sort === 'active') {
        users.sort((a, b) => {
          if (a.online && !b.online) return -1;
          if (!a.online && b.online) return 1;
          return 0;
        });
      }
    }

    const filteredTotal = users.length;
    const totalPages = Math.ceil(filteredTotal / limit);
    const paginatedUsers = users.slice(skip, skip + limit);

    return NextResponse.json({
      data: paginatedUsers,
      pagination: { page, limit, total: filteredTotal, totalPages },
    });
  } catch (error) {
    console.error('Users list error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
