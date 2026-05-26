import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
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

    const { businesses, source } = await matchBusinessesForNeed(need, limit);

    return NextResponse.json({
      businesses,
      briefSummary: buildNeedBriefSummary(need),
      meta: {
        source,
        engine: 'internal',
        candidateCount: businesses.length,
      },
    });
  } catch (error) {
    console.error('matched-businesses error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
