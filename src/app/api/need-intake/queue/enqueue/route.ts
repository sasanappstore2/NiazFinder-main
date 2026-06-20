import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { guardIntakePublicApi } from '@/lib/need-intake/intake-api-guard';
import { enqueueIntakeJobOrchestrated } from '@/lib/need-intake/intake-queue-orchestrator';
import type { IntakeQueueEnqueueRequest } from '@/lib/need-intake/intake-queue-types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const rateLimited = guardIntakePublicApi(request, 'queue-enqueue', 60);
  if (rateLimited) return rateLimited;

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'لطفاً وارد شوید' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as IntakeQueueEnqueueRequest;
    if (!body?.jobName || !body?.payload) {
      return NextResponse.json({ error: 'jobName and payload required' }, { status: 400 });
    }
    const result = await enqueueIntakeJobOrchestrated(body);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'enqueue failed';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
