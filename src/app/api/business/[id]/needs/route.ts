import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { loadBusinessByUserId } from '@/lib/business/load-profile';

export const runtime = 'nodejs';

/** Public list of needs linked to a business profile. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const business = await loadBusinessByUserId(id);
    if (!business) {
      return NextResponse.json({ needs: [] });
    }

    const profile = await db.businessProfile.findUnique({ where: { userId: id } });
    if (!profile) return NextResponse.json({ needs: [] });

    const needs = await db.serviceRequest.findMany({
      where: {
        businessProfileId: profile.id,
        status: { not: 'CANCELLED' },
        moderationStatus: { in: ['APPROVED', 'PENDING'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        moderationStatus: true,
        createdAt: true,
        city: true,
      },
    });

    return NextResponse.json({
      needs: needs.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Business needs GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
