import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export const runtime = 'nodejs';

/** Stub: accept Web Push subscription JSON when VAPID keys are configured. */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
    if (!vapidPublic) {
      return NextResponse.json(
        { error: 'Push not configured', configured: false },
        { status: 503 }
      );
    }

    await request.json().catch(() => ({}));
    return NextResponse.json({ ok: true, configured: true });
  } catch (error) {
    console.error('Push subscribe error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
