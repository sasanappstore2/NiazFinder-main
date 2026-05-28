import { db } from '@/lib/db';
import type { BusinessProfile } from '@prisma/client';
import { ensureBusinessProfile } from '@/lib/business/ensure-profile';
import type { AuthUser } from '@/lib/auth';

/** Fields safe for Prisma select (excludes columns that may be missing in a stale generated client). */
const PROFILE_SELECT = {
  id: true,
  slug: true,
  name: true,
  status: true,
  logo: true,
  coverImage: true,
  description: true,
  categorySlugs: true,
  city: true,
  province: true,
  address: true,
  phone: true,
  whatsapp: true,
  email: true,
  chatEnabled: true,
  seoTitle: true,
  seoDescription: true,
  verified: true,
  viewCount: true,
  extensions: true,
} as const;

async function readOnboardingCompletedAt(profileId: string): Promise<Date | null> {
  try {
    const rows = await db.$queryRaw<Array<{ onboardingCompletedAt: Date | null }>>`
      SELECT "onboardingCompletedAt" FROM "BusinessProfile" WHERE "id" = ${profileId} LIMIT 1
    `;
    return rows[0]?.onboardingCompletedAt ?? null;
  } catch {
    return null;
  }
}

/** Load or create profile + onboarding timestamp (works even if Prisma client is stale). */
export async function loadMyBusinessProfile(user: AuthUser): Promise<BusinessProfile> {
  const profile = await ensureBusinessProfile(user);
  const row = await db.businessProfile.findUnique({
    where: { id: profile.id },
    select: PROFILE_SELECT,
  });
  if (!row) {
    throw new Error('Business profile not found after ensure');
  }
  const onboardingCompletedAt = await readOnboardingCompletedAt(profile.id);
  return { ...profile, ...row, onboardingCompletedAt } as BusinessProfile;
}
