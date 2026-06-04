import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { writeStaffAuditLog } from '@/lib/security/staff-audit';

export const runtime = 'nodejs';

/** Revoke all auth tokens for the current user (sign out everywhere). */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await db.authToken.deleteMany({
      where: { userId: user.id, type: 'auth' },
    });

    await writeStaffAuditLog({
      actorUserId: user.id,
      action: 'auth.sessions.revoke',
      entityType: 'user',
      entityId: user.id,
      payload: { deleted: result.count },
      request,
    });

    return NextResponse.json({ ok: true, revoked: result.count });
  } catch (error) {
    console.error('Sessions revoke error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
