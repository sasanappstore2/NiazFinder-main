import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { acceptBusinessInvitesForUser } from '@/lib/business/team/accept-invite';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.phone) {
      return NextResponse.json({ error: 'لطفاً وارد شوید' }, { status: 401 });
    }

    await acceptBusinessInvitesForUser(user.id, user.phone);

    const memberships = await db.businessMember.findMany({
      where: { userId: user.id, status: 'ACTIVE' },
      include: { profile: { select: { id: true, name: true, slug: true } } },
    });

    return NextResponse.json({ memberships });
  } catch (error) {
    console.error('Team invite accept error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
