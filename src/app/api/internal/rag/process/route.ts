import { NextRequest, NextResponse } from 'next/server';
import { getRagQueueLag, processRagIndexJobs } from '@/lib/rag';
import { verifyInternalApiSecret } from '@/lib/security/internal-secret';

export const runtime = 'nodejs';

/** POST — drain durable RAG index jobs (cron / supervisor). */
export async function POST(request: NextRequest) {
  const auth = verifyInternalApiSecret(request);
  if (auth === 'unconfigured') {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
  if (auth === 'mismatch') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { limit?: number };
    const limit = typeof body.limit === 'number' ? body.limit : undefined;
    const result = await processRagIndexJobs({ limit });
    const lag = await getRagQueueLag();
    return NextResponse.json({ ok: true, ...result, lag });
  } catch (error) {
    console.error('rag process tick error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

/** GET — queue lag / health for monitoring. */
export async function GET(request: NextRequest) {
  const auth = verifyInternalApiSecret(request);
  if (auth === 'unconfigured') {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
  if (auth === 'mismatch') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const lag = await getRagQueueLag();
    return NextResponse.json({ ok: true, lag });
  } catch (error) {
    console.error('rag lag error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
