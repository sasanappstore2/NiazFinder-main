import { NextRequest, NextResponse } from 'next/server';
import { loadPublicContactPointsBySlug } from '@/lib/business/team/public-contacts';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const data = await loadPublicContactPointsBySlug(slug);
    if (!data) {
      return NextResponse.json({ error: 'کسب‌وکار یافت نشد' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Public contact-points GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
