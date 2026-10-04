/**
 * C3 — Canonical owner-access predicate.
 *
 * The public business id used in URLs (`/pro/{id}`, `/api/business/{id}/…`) is
 * the owner's **userId** (see `loadBusinessByUserId` / `map-profile.ts` where
 * `business.id = profile.userId`). Owner-scoped routes must therefore compare
 * the URL id against `profile.userId`, never the BusinessProfile cuid.
 */
export function isOwnerByPublicId(
  profile: { userId: string } | null | undefined,
  publicId: string
): boolean {
  return Boolean(profile) && profile!.userId === publicId;
}
