import { db } from '@/lib/db';

function clamp(min: number, max: number, value: number) {
  return Math.min(max, Math.max(min, value));
}

export async function applyRating(businessProfileId: string, rating: number) {
  const profile = await db.businessProfile.findUnique({
    where: { id: businessProfileId },
    select: { trustScore: true },
  });
  if (!profile) return;

  const next = clamp(0, 5, 0.85 * profile.trustScore + 0.15 * rating);
  await db.businessProfile.update({
    where: { id: businessProfileId },
    data: { trustScore: next },
  });
}

export async function penalizeFalseClaim(businessProfileId: string) {
  const profile = await db.businessProfile.findUnique({
    where: { id: businessProfileId },
    select: { trustScore: true },
  });
  if (!profile) return;

  await db.businessProfile.update({
    where: { id: businessProfileId },
    data: { trustScore: clamp(0, 5, profile.trustScore - 0.5) },
  });
}

export async function handleNeedResolvedEvent(payload: {
  winnerBusinessProfileId: string;
  falseClaim: boolean;
  falseClaimantProfileId: string | null;
  rating: number;
}) {
  await applyRating(payload.winnerBusinessProfileId, payload.rating);
  if (payload.falseClaim && payload.falseClaimantProfileId) {
    await penalizeFalseClaim(payload.falseClaimantProfileId);
  }
}
