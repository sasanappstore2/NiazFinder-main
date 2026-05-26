import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { enqueueRequestModerationJob } from '@/lib/request-moderation/enqueue';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.serviceRequest.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: 'نیاز یافت نشد' }, { status: 404 });
    }

    if (existing.userId !== user.id) {
      return NextResponse.json({ error: 'دسترسی کافی ندارید' }, { status: 403 });
    }

    if (existing.moderationStatus !== 'REJECTED_SOFT') {
      return NextResponse.json(
        { error: 'فقط آگهی‌های رد موقت قابل ارسال مجدد هستند' },
        { status: 409 }
      );
    }

    const updated = await db.serviceRequest.update({
      where: { id },
      data: {
        status: 'PENDING_REVIEW',
        moderationStatus: 'PENDING',
        rejectionReason: null,
        moderationNotes: null,
        reviewedAt: null,
        reviewedByUserId: null,
        assignedToUserId: null,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        moderationStatus: true,
      },
    });

    void enqueueRequestModerationJob(updated.id);

    return NextResponse.json({
      message: 'آگهی برای بازبینی مجدد ارسال شد',
      request: updated,
    });
  } catch (error) {
    console.error('Request resubmit error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
