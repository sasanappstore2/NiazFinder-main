import { NextRequest, NextResponse } from 'next/server';
import { dispatchNeedLeadOutreach } from '@/lib/need-leads/dispatch-outreach';

export async function POST(request: NextRequest) {
  const secret = process.env.NEED_LEAD_DISPATCH_SECRET?.trim();
  const header = request.headers.get('x-need-lead-dispatch-secret');

  if (!secret || header !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const requestId = typeof body.requestId === 'string' ? body.requestId : '';

  if (!requestId) {
    return NextResponse.json({ error: 'requestId required' }, { status: 400 });
  }

  const result = await dispatchNeedLeadOutreach(requestId);
  return NextResponse.json(result);
}
