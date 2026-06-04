import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const templates = await db.chatReplyTemplate.findMany({
      where: { userId: user.id },
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Chat templates GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const title = String(body.title ?? '').trim();
    const templateBody = String(body.body ?? '').trim();
    if (!title || !templateBody) {
      return NextResponse.json({ error: 'عنوان و متن الزامی است' }, { status: 400 });
    }
    const count = await db.chatReplyTemplate.count({ where: { userId: user.id } });
    const template = await db.chatReplyTemplate.create({
      data: { userId: user.id, title, body: templateBody, sortOrder: count },
    });
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Chat templates POST error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
