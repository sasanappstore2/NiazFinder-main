import { NextRequest, NextResponse } from 'next/server';
import { runDueFilingScrapers } from '@/lib/filing-scrapers/runner';

export const runtime = 'nodejs';

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.INTERNAL_API_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== 'production';
  const header = request.headers.get('x-internal-secret');
  return header === secret;
}

/** POST — process due filing scrapers (cron / fleet supervisor). */
export async function POST(request: NextRequest) {
  if (!authorizeCron(request)) {
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
