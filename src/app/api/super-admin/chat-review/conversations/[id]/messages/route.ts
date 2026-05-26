import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'comms:messages:read');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 50), 1), 200);

    const messages = await db.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        content: true,
        type: true,
        attachmentUrls: true,
        isRead: true,
        createdAt: true,
        sender: { select: { id: true, phone: true, displayName: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({
      messages: messages.map((m) => ({
        ...m,
        attachmentUrls: (() => {
          try {
            const parsed = JSON.parse(m.attachmentUrls || '[]');
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })(),
      })),
    });
  } catch (error) {
    console.error('Chat review messages GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}

