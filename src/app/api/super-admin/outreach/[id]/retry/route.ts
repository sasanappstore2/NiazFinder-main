import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';
import { buildNeedMatchContextFromRequest } from '@/lib/need-leads/build-match-context';
import { sendLeadToBusiness } from '@/lib/need-leads/send-lead-to-business';
import type { QualifiedLead } from '@/lib/need-leads/qualified-lead';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'market:outreach:write');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    const outreach = await db.needLeadOutreach.findUnique({
      where: { id },
      include: {
        request: { select: { id: true, userId: true, status: true } },
        business: {
          select: {
            id: true,
            userId: true,
            name: true,
            slug: true,
            city: true,
            province: true,
            verified: true,
            rating: true,
          },
        },
      },
    });

    if (!outreach) {
      return NextResponse.json({ error: 'رکورد outreach یافت نشد' }, { status: 404 });
    }

    if (outreach.request.status !== 'OPEN') {
      return NextResponse.json({ error: 'نیاز در وضعیت باز نیست' }, { status: 400 });
    }

    const need = await buildNeedMatchContextFromRequest(outreach.requestId);
    if (!need) {
      return NextResponse.json({ error: 'نیاز یافت نشد' }, { status: 404 });
    }

    const business: QualifiedLead = {
      id: outreach.business.id,
      userId: outreach.businessUserId,
      name: outreach.business.name,
      slug: outreach.business.slug,
      city: outreach.business.city,
      province: outreach.business.province,
      rating: outreach.business.rating,
      reviewCount: 0,
      verified: outreach.business.verified,
      matchScore: outreach.matchScore,
      matchReasonFa: outreach.matchReasonFa,
      qualifyScore: outreach.matchScore,
      qualifyReasonFa: outreach.matchReasonFa,
    };

    await db.needLeadOutreach.update({
      where: { id },
      data: { status: 'QUEUED', skipReason: null },
    });

    const outcome = await sendLeadToBusiness({
      requestId: outreach.requestId,
      need,
      business,
      needOwnerUserId: outreach.request.userId,
    });

    await logAdminAction(request, authz.user.id, 'market.outreach.retry', 'NeedLeadOutreach', id, {
      ok: outcome.ok,
      skipReason: outcome.ok ? undefined : outcome.skipReason,
    });

    if (!outcome.ok) {
      return NextResponse.json(
        { error: `ارسال مجدد انجام نشد: ${outcome.skipReason}` },
        { status: 422 }
      );
    }

    return NextResponse.json({
      message: 'ارسال مجدد انجام شد',
      conversationId: outcome.conversationId,
    });
  } catch (error) {
    console.error('Super admin outreach retry error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
