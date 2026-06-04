import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const post = await db.blogPost.findFirst({
      where: { slug, status: 'PUBLISHED' },
    });
    if (!post) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 });
    return NextResponse.json({ post });
  } catch (error) {
    console.error('Blog slug GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
