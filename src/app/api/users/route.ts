import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { normalizeText, fuzzySearch } from '@/lib/persian-normalize';

// GET /api/users - list users (public fuzzy search + authenticated admin listing)
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

      // Fetch active users for fuzzy search
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
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayName: true,
          username: true,
          avatar: true,
          coverImage: true,
          bio: true,
          website: true,
          city: true,
          province: true,
          role: true,
          isVerified: true,
          isActive: true,
          isBanned: true,
          online: true,
          lastSeenAt: true,
          createdAt: true,
          _count: {
            select: {
              followers: true,
              following: true,
              posts: true,
            },
          },
        },
        take: 100, // reasonable limit for fuzzy search
      });

      // Apply fuzzy search with normalized scoring
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
        data: sliced.map(r => ({
          ...r.item,
          followerCount: r.item._count.followers,
          followingCount: r.item._count.following,
          postCount: r.item._count.posts,
          _score: r.score,
        })),
        pagination: {
          page: 1,
          limit,
          total: results.length,
          totalPages: Math.ceil(results.length / limit),
        },
      });
    }

    // ─── Authenticated search (search parameter - auth required) ──────────
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const where: Record<string, unknown> = { isActive: true };

    // Admin can see all users including inactive/banned
    if (authUser.role === 'ADMIN' || authUser.role === 'SUPER_ADMIN') {
      delete where.isActive;
    }

    if (role) {
      if (role.includes(',')) {
        const roles = role.split(',');
        where.role = { in: roles };
      } else {
        where.role = role;
      }
    }
    if (status === 'banned') where.isBanned = true;
    else if (status === 'inactive') where.isActive = false;

    const skip = (page - 1) * limit;

    // Build Prisma orderBy
    let orderBy: Record<string, string> = { createdAt: 'desc' };
    if (sort === 'active') orderBy = { createdAt: 'desc' };
    if (sort === 'followers') orderBy = { createdAt: 'desc' };

    // ─── Search logic with Persian fuzzy matching ─────────────────────────
    if (search && search.trim().length > 0) {
      const trimmedSearch = search.trim();

      // Step 1: Use Prisma contains for direct matches
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
        select: {
          id: true,
          email: true,
          phone: true,
          username: true,
          firstName: true,
          lastName: true,
          displayName: true,
          avatar: true,
          coverImage: true,
          bio: true,
          website: true,
          city: true,
          province: true,
          role: true,
          isVerified: true,
          isActive: true,
          isBanned: true,
          online: true,
          lastSeenAt: true,
          createdAt: true,
          _count: {
            select: {
              followers: true,
              following: true,
              posts: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      db.user.count({ where }),
    ]);

    // ─── Step 2: Apply fuzzy Persian filtering in JavaScript ──────────────
    let users = dbUsers;

    if (search && search.trim().length > 0) {
      const qStr = search.trim();

      // Check if search contains Persian chars that need normalization
      const normalizedQ = normalizeText(qStr);
      const hasPersianVariants = normalizedQ !== qStr.toLowerCase();

      if (hasPersianVariants && dbUsers.length < total) {
        // Some users might have been missed due to character normalization.
        const allUsers = await db.user.findMany({
          where: {
            ...(authUser.role === 'ADMIN' || authUser.role === 'SUPER_ADMIN' ? {} : { isActive: true }),
            ...(role ? (role.includes(',') ? { role: { in: role.split(',') } } : { role }) : {}),
            ...(status === 'banned' ? { isBanned: true } : status === 'inactive' ? { isActive: false } : {}),
          },
          select: {
            id: true,
            email: true,
            phone: true,
            username: true,
            firstName: true,
            lastName: true,
            displayName: true,
            avatar: true,
            coverImage: true,
            bio: true,
            website: true,
            city: true,
            province: true,
            role: true,
            isVerified: true,
            isActive: true,
            isBanned: true,
            online: true,
            lastSeenAt: true,
            createdAt: true,
            _count: {
              select: {
                followers: true,
                following: true,
                posts: true,
              },
            },
          },
          orderBy,
          take: 100,
        });

        users = allUsers.filter((u) => {
          const searchableText = [
            u.firstName,
            u.lastName,
            u.displayName || '',
            u.username || '',
            u.bio || '',
            u.city || '',
          ].join(' ');

          return normalizeText(searchableText).includes(normalizedQ);
        });
      } else if (!hasPersianVariants && dbUsers.length === 0 && qStr.length >= 1) {
        const allUsers = await db.user.findMany({
          where: {
            ...(authUser.role === 'ADMIN' || authUser.role === 'SUPER_ADMIN' ? {} : { isActive: true }),
          },
          select: {
            id: true,
            email: true,
            phone: true,
            username: true,
            firstName: true,
            lastName: true,
            displayName: true,
            avatar: true,
            coverImage: true,
            bio: true,
            website: true,
            city: true,
            province: true,
            role: true,
            isVerified: true,
            isActive: true,
            isBanned: true,
            online: true,
            lastSeenAt: true,
            createdAt: true,
            _count: {
              select: {
                followers: true,
                following: true,
                posts: true,
              },
            },
          },
          orderBy,
          take: 50,
        });

        users = allUsers.filter((u) => {
          const searchableText = [
            u.firstName,
            u.lastName,
            u.displayName || '',
            u.username || '',
            u.bio || '',
            u.city || '',
          ].join(' ');

          return normalizeText(searchableText).includes(normalizedQ);
        });
      }
    }

    // ─── Step 3: Apply sort on filtered results ───────────────────────────
    if (search && search.trim().length > 0) {
      if (sort === 'followers') {
        users.sort((a, b) => b._count.followers - a._count.followers);
      } else if (sort === 'active') {
        users.sort((a, b) => {
          if (a.online && !b.online) return -1;
          if (!a.online && b.online) return 1;
          return b._count.posts - a._count.posts;
        });
      }
    }

    // ─── Step 4: Paginate the filtered results ────────────────────────────
    const filteredTotal = users.length;
    const totalPages = Math.ceil(filteredTotal / limit);
    const paginatedUsers = users.slice(skip, skip + limit);

    return NextResponse.json({
      data: paginatedUsers.map(u => ({
        ...u,
        followerCount: u._count.followers,
        followingCount: u._count.following,
        postCount: u._count.posts,
      })),
      pagination: { page, limit, total: filteredTotal, totalPages },
    });
  } catch (error) {
    console.error('Users list error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
