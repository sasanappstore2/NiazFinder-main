import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { guardIntakePublicApi } from '@/lib/need-intake/intake-api-guard';
import { fetchIntakeJobMerged } from '@/lib/need-intake/intake-queue-orchestrator';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const rateLimited = guardIntakePublicApi(request, 'queue-poll', 240);
  if (rateLimited) return rateLimited;

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'لطفاً وارد شوید' }, { status: 401 });
  }

  const { jobId } = await params;
  const job = await fetchIntakeJobMerged(jobId);
  if (!job) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(job);
}
