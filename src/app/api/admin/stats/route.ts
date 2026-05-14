import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/admin/stats - platform statistics
export async function GET() {
  try {
    const authUser = await getAuthUser(new Request(''));
    if (!authUser || (authUser.role !== 'ADMIN' && authUser.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      onlineUsers,
      verifiedUsers,
      newUsersThisMonth,
      specialistCount,
      clientCount,
      bannedUsers,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { online: true } }),
      db.user.count({ where: { isVerified: true } }),
      db.user.count({ where: { createdAt: { gte: monthStart } } }),
      db.user.count({ where: { role: 'SPECIALIST' } }),
      db.user.count({ where: { role: 'CLIENT' } }),
      db.user.count({ where: { isBanned: true } }),
    ]);

    return NextResponse.json({
      totalUsers,
      onlineUsers,
      verifiedUsers,
      newUsersThisMonth,
      specialistCount,
      clientCount,
      bannedUsers,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
