import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { canManageBusinessProfile } from '@/lib/business/can-manage-business-profile';

type AuthUser = NonNullable<Awaited<ReturnType<typeof getAuthUser>>>;

/** Authenticated user with business-management role, or error response. */
export async function requireBusinessManager(
  request: NextRequest
): Promise<{ user: AuthUser } | { error: NextResponse }> {
  const user = await getAuthUser(request);
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (!canManageBusinessProfile(user.role)) {
    return { error: NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 }) };
  }
  return { user };
}
