import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authorize } from '@/lib/rbac/authz';
import { hasSuperAdminPanelAccess } from '@/lib/rbac/super-admin-access';
import { canManageBusinessProfile } from '@/lib/business/can-manage-business-profile';
import { buildNeedBriefSummary } from '@/lib/need-match/brief-summary';
import { matchBusinessesForNeed } from '@/lib/need-match/rank-businesses';
import type { NeedMatchContext } from '@/contracts/need-match';
import { legacyValueToSlug } from '@/config/categories';
import { budgetToJson } from '@/lib/budget';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await authorize(request);
    if (!authz.ok) {
      return NextResponse.json({ error: 'برای مشاهده این بخش وارد شوید' }, { status: 401 });
    }

    const authUser = authz.user;
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '12', 10)));

    const serviceRequest = await db.serviceRequest.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!serviceRequest) {
      return NextResponse.json({ error: 'نیاز یافت نشد' }, { status: 404 });
    }

    const isNeedOwner = authUser.id === serviceRequest.userId;
    const isBusinessViewer = canManageBusinessProfile(authUser.role);
    const isStaffDebug = hasSuperAdminPanelAccess(authUser, authz.permissions);

    if (!isNeedOwner && !isBusinessViewer && !isStaffDebug) {
      return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });
    }

    const leafSlug =
      serviceRequest.subcategory?.slug ??
      serviceRequest.category?.slug ??
      'services';
    const categorySlug = legacyValueToSlug(leafSlug) ?? leafSlug;

    let tags: string[] = [];
    try {
      tags = JSON.parse(serviceRequest.tags || '[]');
    } catch {
      tags = [];
    }

    const need: NeedMatchContext = {
      id: serviceRequest.id,
      title: serviceRequest.title,
      description: serviceRequest.description,
      city: serviceRequest.city,
      province: serviceRequest.province,
      address: serviceRequest.address,
      categorySlug,
      categoryName: serviceRequest.category?.name ?? 'عمومی',
      tags,
      budgetMin: budgetToJson(serviceRequest.budgetMin),
      budgetMax: budgetToJson(serviceRequest.budgetMax),
    };

    const { businesses: allMatches, source } = await matchBusinessesForNeed(need, limit);

    const seesFullList = isNeedOwner || isStaffDebug;
    const businesses = seesFullList
      ? allMatches
      : allMatches.filter((b) => b.userId === authUser.id);

    const viewerMode = isNeedOwner ? 'owner' : isStaffDebug ? 'staff' : 'business';

    return NextResponse.json({
      businesses,
      briefSummary: seesFullList ? buildNeedBriefSummary(need) : undefined,
      meta: {
        source,
        engine: 'internal',
        candidateCount: businesses.length,
        viewerMode,
      },
    });
  } catch (error) {
    console.error('matched-businesses error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
