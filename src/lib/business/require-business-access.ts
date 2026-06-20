import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { canManageBusinessProfile } from '@/lib/business/can-manage-business-profile';

type AuthUser = NonNullable<Awaited<ReturnType<typeof getAuthUser>>>;

export type BusinessAccessOptions = {
  /** Promote CLIENT → SPECIALIST only after onboarding is completed. */
  promoteToSpecialist?: boolean;
};

export type BusinessAccessResult =
  | { user: AuthUser; roleUpgraded: boolean }
  | { error: NextResponse };

/**
 * Authenticated users may manage a business profile.
 * CLIENT users can access onboarding APIs without automatic role promotion.
 */
export async function requireBusinessAccess(
  request: NextRequest,
  options?: BusinessAccessOptions
): Promise<BusinessAccessResult> {
  const user = await getAuthUser(request);
  if (!user) {
    return { error: NextResponse.json({ error: 'لطفاً وارد شوید' }, { status: 401 }) };
  }

  if (user.role === 'CLIENT') {
    if (options?.promoteToSpecialist) {
      await db.user.update({
        where: { id: user.id },
        data: { role: 'SPECIALIST' },
      });
      return {
        user: { ...user, role: 'SPECIALIST' },
        roleUpgraded: true,
      };
    }
    return { user, roleUpgraded: false };
  }

  if (!canManageBusinessProfile(user.role)) {
    return {
      error: NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 }),
    };
  }

  return { user, roleUpgraded: false };
}
