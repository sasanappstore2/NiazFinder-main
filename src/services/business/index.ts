import type { ApiSpecialistRow } from '@/types/api';
import type { BusinessCardData } from '@/contracts/business-card';
import type { SpecialistProfile } from '@/lib/types';

/** API list row → SpecialistProfile for browse cards. */
export function mapApiSpecialistToProfile(row: ApiSpecialistRow & {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
  createdAt?: string;
  skills?: { id?: string; name: string; level: number }[];
}): SpecialistProfile {
  const firstName = row.firstName ?? '';
  const lastName = row.lastName ?? '';
  const displayName =
    row.displayName ?? (`${firstName} ${lastName}`.trim() || 'کسب‌وکار');

  return {
    id: row.id,
    profileSlug: row.slug,
    email: row.email ?? '',
    firstName,
    lastName,
    displayName,
    avatar: row.avatar,
    bio: row.bio,
    city: row.city,
    province: row.province,
    role: (row.role as SpecialistProfile['role']) ?? 'SPECIALIST',
    isVerified: row.isVerified ?? false,
    isActive: row.isActive ?? true,
    online: row.online ?? false,
    rating: row.rating ?? 0,
    projectCount: row.projectCount ?? 0,
    completionRate: row.completionRate ?? 0,
    responseRate: row.responseRate ?? 0,
    createdAt: row.createdAt ?? new Date().toISOString(),
    skills: (row.skills ?? []).map((s) =>
      typeof s === 'string'
        ? { name: s, level: 0 }
        : { name: s.name, level: s.level ?? 0 }
    ),
    portfolios: [],
    memberSince: row.createdAt ?? new Date().toISOString(),
    responseTime: 'زیر ۲۴ ساعت',
    completedProjects: row.projectCount ?? 0,
  };
}

function normalizeSkillNames(
  skills?: ApiSpecialistRow['skills']
): string[] | undefined {
  if (!skills?.length) return undefined;
  return skills.map((s) => (typeof s === 'string' ? s : s.name));
}

export function mapApiSpecialistToBusinessCard(row: ApiSpecialistRow): BusinessCardData {
  const displayName =
    row.displayName ??
    ([row.firstName, row.lastName].filter(Boolean).join(' ') || 'کسب‌وکار');
  return {
    id: row.id,
    displayName,
    avatar: row.avatar,
    bio: row.bio,
    city: row.city,
    province: row.province,
    rating: row.rating,
    projectCount: row.projectCount,
    completionRate: row.completionRate,
    responseRate: row.responseRate,
    skills: normalizeSkillNames(row.skills),
    isVerified: row.isVerified,
    online: row.online,
  };
}
