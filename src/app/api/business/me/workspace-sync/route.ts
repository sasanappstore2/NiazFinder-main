import { NextRequest, NextResponse } from 'next/server';
import { requireBusinessAccess } from '@/lib/business/require-business-access';
import { loadMyBusinessProfile } from '@/lib/business/load-my-business-profile';
import { loadWorkspaceSync } from '@/lib/business/workspace/load-workspace-sync';
import { checkRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

/** GET — bundled workspace sync for silent client polling (one request per tick). */
export async function GET(request: NextRequest) {
  try {
    const access = await requireBusinessAccess(request);
    if ('error' in access) return access.error;

    const limited = checkRateLimit(`workspace-sync:${access.user.id}`, 30, 60_000);
    if (!limited.allowed) {
      return NextResponse.json(
        { error: 'تعداد درخواست زیاد است؛ چند ثانیه بعد دوباره تلاش کنید' },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec ?? 30) } }
      );
    }

    const profile = await loadMyBusinessProfile(access.user);
    const payload = await loadWorkspaceSync(access.user, profile);
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('workspace-sync GET error:', error);
    return NextResponse.json({ error: 'خطا در بارگذاری میزکار' }, { status: 500 });
  }
}
