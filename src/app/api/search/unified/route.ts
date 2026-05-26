import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') ?? '').trim();
    if (q.length < 2) {
      return NextResponse.json({ users: [], businesses: [], needs: [] });
    }

    const limit = Math.min(20, parseInt(searchParams.get('limit') || '10', 10));

    const [users, businessProfiles, needs] = await Promise.all([
      db.user.findMany({
        where: {
          isActive: true,
          isBanned: false,
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { displayName: { contains: q } },
            { username: { contains: q } },
            { city: { contains: q } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayName: true,
          username: true,
          avatar: true,
          city: true,
          role: true,
          isVerified: true,
        },
        take: limit,
      }),
      db.businessProfile.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { name: { contains: q } },
            { city: { contains: q } },
            { description: { contains: q } },
          ],
        },
        select: {
          id: true,
          userId: true,
          name: true,
          slug: true,
          logo: true,
          city: true,
          verified: true,
        },
        take: limit,
      }),
      db.serviceRequest.findMany({
        where: {
          status: 'OPEN',
          OR: [{ title: { contains: q } }, { description: { contains: q } }],
        },
        select: {
          id: true,
          title: true,
          slug: true,
          city: true,
          category: { select: { name: true } },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      users: users.map((u) => ({
        type: 'user' as const,
        id: u.id,
        name: u.displayName ?? `${u.firstName} ${u.lastName}`.trim(),
        subtitle: u.username ? `@${u.username}` : u.city,
        avatar: u.avatar,
        isVerified: u.isVerified,
        role: u.role,
      })),
      businesses: businessProfiles.map((b) => ({
        type: 'business' as const,
        id: b.userId,
        profileId: b.id,
        name: b.name,
        subtitle: b.city,
        avatar: b.logo,
        slug: b.slug,
        verified: b.verified,
      })),
      needs: needs.map((n) => ({
        type: 'need' as const,
        id: n.id,
        title: n.title,
        slug: n.slug,
        subtitle: [n.category?.name, n.city].filter(Boolean).join(' · '),
      })),
    });
  } catch (error) {
    console.error('unified search error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
