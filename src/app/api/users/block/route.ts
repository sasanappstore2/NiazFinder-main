import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as { blockedId?: string };
  if (!body.blockedId || body.blockedId === user.id) {
    return NextResponse.json({ error: 'Invalid blockedId' }, { status: 400 });
  }

  await db.userBlock.upsert({
    where: {
      blockerId_blockedId: { blockerId: user.id, blockedId: body.blockedId },
    },
    create: { blockerId: user.id, blockedId: body.blockedId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const blockedId = request.nextUrl.searchParams.get('blockedId');
  if (!blockedId) {
    return NextResponse.json({ error: 'blockedId required' }, { status: 400 });
  }

  await db.userBlock.deleteMany({
    where: { blockerId: user.id, blockedId },
  });

  return NextResponse.json({ ok: true });
}
