import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireBusinessAccess } from '@/lib/business/require-business-access';
import { loadMyBusinessProfile } from '@/lib/business/load-my-business-profile';
import { computeMatchingInsights } from '@/lib/business/ecosystem';
import { isOwnerByPublicId } from '@/lib/business/ecosystem/owner-access';

export const runtime = 'nodejs';

/** Phase 3 — owner-scoped AI matching insights for a business profile. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await requireBusinessAccess(request);
    if ('error' in access) return access.error;

    const profile = await loadMyBusinessProfile(access.user);
    if (!isOwnerByPublicId(profile, id)) {
      return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });
    }

    const city = profile.city ?? undefined;
    const cityWhere = city ? { city } : {};
    const baseWhere = { status: 'OPEN' as const, moderationStatus: 'APPROVED' as const };

    const [needVolume, matchedNeeds, respondedNeeds, sample] = await Promise.all([
      db.serviceRequest.count({ where: baseWhere }),
      db.serviceRequest.count({ where: { ...baseWhere, ...cityWhere } }),
      db.needLeadOutreach.count({ where: { businessProfileId: profile.id } }),
      db.serviceRequest.findMany({
        where: { ...baseWhere, ...cityWhere },
        select: { city: true, address: true, category: { select: { name: true } } },
        take: 500,
      }),
    ]);

    const neighborhoodCounts = new Map<string, number>();
    const requestCounts = new Map<string, number>();
    for (const r of sample) {
      const nLabel = (r.address || r.city || '').trim();
      if (nLabel) neighborhoodCounts.set(nLabel, (neighborhoodCounts.get(nLabel) ?? 0) + 1);
      const cLabel = r.category?.name?.trim();
      if (cLabel) requestCounts.set(cLabel, (requestCounts.get(cLabel) ?? 0) + 1);
    }

    const toSorted = (m: Map<string, number>) =>
      [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);

    const insights = computeMatchingInsights({
      matchedNeeds,
      respondedNeeds,
      conversions: profile.conversionCount,
      needVolume,
      hotNeighborhoods: toSorted(neighborhoodCounts),
      trendingRequests: toSorted(requestCounts),
    });

    return NextResponse.json({ insights });
  } catch (error) {
    console.error('matching-insights error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
