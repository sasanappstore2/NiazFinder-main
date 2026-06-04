import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { slugifyBlogTitle } from '@/lib/blog/slug';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'content:blog:read');
    if (!authz.ok) return authz.response;

    const posts = await db.blogPost.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Super admin blog GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'content:blog:write');
    if (!authz.ok) return authz.response;

    const body = await request.json().catch(() => ({}));
    const title = String(body.title ?? '').trim();
    const content = String(body.content ?? '').trim();
    if (!title || !content) {
      return NextResponse.json({ error: 'عنوان و متن الزامی است' }, { status: 400 });
    }

    const slug = String(body.slug ?? slugifyBlogTitle(title)).trim() || slugifyBlogTitle(title);
    const status = body.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';

    const post = await db.blogPost.create({
      data: {
        slug,
        title,
        content,
        excerpt: body.excerpt ? String(body.excerpt) : null,
        coverImage: body.coverImage ? String(body.coverImage) : null,
        authorName: body.authorName ? String(body.authorName) : null,
        seoTitle: body.seoTitle ? String(body.seoTitle) : null,
        seoDescription: body.seoDescription ? String(body.seoDescription) : null,
        status,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('Super admin blog POST error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
