import { NextRequest, NextResponse } from 'next/server';
import { runDueFilingScrapers } from '@/lib/filing-scrapers/runner';
import { verifyInternalApiSecret } from '@/lib/security/internal-secret';

export const runtime = 'nodejs';

/** POST — process due filing scrapers (cron / fleet supervisor). */
export async function POST(request: NextRequest) {
  const auth = verifyInternalApiSecret(request);
  if (auth === 'unconfigured') {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
  if (auth === 'mismatch') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runDueFilingScrapers();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('filing-scrapers tick error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
