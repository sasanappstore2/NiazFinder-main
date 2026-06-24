import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireBusinessAccess } from '@/lib/business/require-business-access';
import { loadMyBusinessProfile } from '@/lib/business/load-my-business-profile';
import { isOwnerByPublicId } from '@/lib/business/ecosystem/owner-access';

export const runtime = 'nodejs';

interface RequestRow {
  id: string;
  title: string;
  city?: string | null;
  budget?: string | null;
}

const SELECT = {
  id: true,
  title: true,
  city: true,
  budgetMax: true,
} as const;

function toRow(r: { id: string; title: string; city: string | null; budgetMax: bigint | null }): RequestRow {
  return {
    id: r.id,
    title: r.title,
    city: r.city,
    budget: r.budgetMax != null ? `${r.budgetMax.toString()} تومان` : null,
  };
}

/** Phase 9 — owner-scoped Property Request Hub (matching/urgent/nearby/high-value). */
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

    const [matching, urgent, nearby, highValue] = await Promise.all([
      db.serviceRequest.findMany({
        where: { ...baseWhere, ...cityWhere },
        select: SELECT,
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      db.serviceRequest.findMany({
        where: { ...baseWhere, priority: { in: ['HIGH', 'URGENT'] } },
        select: SELECT,
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      db.serviceRequest.findMany({
        where: { ...baseWhere, ...cityWhere },
        select: SELECT,
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      db.serviceRequest.findMany({
        where: { ...baseWhere, budgetMax: { not: null } },
        select: SELECT,
        orderBy: { budgetMax: 'desc' },
        take: 8,
      }),
    ]);

    return NextResponse.json({
      matching: matching.map(toRow),
      urgent: urgent.map(toRow),
      nearby: nearby.map(toRow),
      highValue: highValue.map(toRow),
    });
  } catch (error) {
    console.error('request-hub error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
