import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'content:blog:write');
    if (!authz.ok) return authz.response;
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const data: Record<string, unknown> = {};
    for (const key of [
      'title',
      'slug',
      'content',
      'excerpt',
      'coverImage',
      'authorName',
      'seoTitle',
      'seoDescription',
      'status',
    ] as const) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.status === 'PUBLISHED') {
      data.publishedAt = new Date();
    }

    const post = await db.blogPost.update({ where: { id }, data });
    return NextResponse.json({ post });
  } catch (error) {
    console.error('Super admin blog PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'content:blog:write');
    if (!authz.ok) return authz.response;
    const { id } = await params;
    await db.blogPost.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Super admin blog DELETE error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
