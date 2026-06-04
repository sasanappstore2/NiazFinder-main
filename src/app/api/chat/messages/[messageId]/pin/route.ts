import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { pinOrUnpinMessage } from '@/lib/chat/message-pin';

type PinBody = { unpin?: boolean };

/** @deprecated Prefer POST /api/chat/messages/[messageId] with `{ pin: true }`. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { messageId } = await params;
  const body = (await request.json().catch(() => ({}))) as PinBody;
  const unpin = body.unpin === true;

  try {
    const result = await pinOrUnpinMessage(messageId, user.id, unpin);
    return NextResponse.json(result);
  } catch (err) {
    const code = err instanceof Error ? err.message : '';
    if (code === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (code === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (code === 'DELETED') {
      return NextResponse.json({ error: 'پیام حذف‌شده قابل سنجاق نیست' }, { status: 400 });
    }
    console.error('[message pin] Error:', err);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
