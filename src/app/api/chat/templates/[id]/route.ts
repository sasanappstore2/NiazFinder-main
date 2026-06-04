import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const existing = await db.chatReplyTemplate.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 });
    const template = await db.chatReplyTemplate.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: String(body.title) } : {}),
        ...(body.body !== undefined ? { body: String(body.body) } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: Number(body.sortOrder) } : {}),
      },
    });
    return NextResponse.json({ template });
  } catch (error) {
    console.error('Chat template PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const existing = await db.chatReplyTemplate.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 });
    await db.chatReplyTemplate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Chat template DELETE error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
