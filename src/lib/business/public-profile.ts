/** Tiny public-visibility helper — keep free of Typesense / server-only imports. */

export type ProfileWithUserActive = {
  status: string;
  user: { isActive: boolean };
};

export function isPublicBusinessProfile(profile: ProfileWithUserActive): boolean {
  return profile.status === 'ACTIVE' && profile.user.isActive;
}
