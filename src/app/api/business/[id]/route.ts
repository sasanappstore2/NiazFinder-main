import { NextRequest, NextResponse } from 'next/server';
import { loadBusinessByUserId, incrementBusinessView } from '@/lib/business/load-profile';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const trackView = request.nextUrl.searchParams.get('track') !== '0';

    const business = await loadBusinessByUserId(id);
    if (!business) {
      return NextResponse.json({ error: 'کسب‌وکار یافت نشد' }, { status: 404 });
    }

    if (trackView) {
      await incrementBusinessView(id);
    }

    return NextResponse.json({ business });
  } catch (error) {
    console.error('Business GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
