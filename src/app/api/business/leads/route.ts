import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { routeBuilder } from '@/config/routes';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(30, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));

    const leads = await db.needLeadOutreach.findMany({
      where: {
        businessUserId: user.id,
        status: 'SENT',
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        request: {
          select: {
            id: true,
            title: true,
            slug: true,
            city: true,
            address: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      leads: leads.map((l) => ({
        id: l.id,
        requestId: l.requestId,
        matchScore: l.matchScore,
        matchReasonFa: l.matchReasonFa,
        conversationId: l.conversationId,
        chatUrl: l.conversationId ? routeBuilder.chatConversation(l.conversationId) : null,
        needUrl: routeBuilder.need(l.request.id, l.request.title),
        request: l.request,
        createdAt: l.createdAt,
      })),
    });
  } catch (error) {
    console.error('business leads GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
