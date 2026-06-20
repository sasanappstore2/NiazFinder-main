import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { guardIntakePublicApi } from '@/lib/need-intake/intake-api-guard';
import { fetchIntakeJobMerged } from '@/lib/need-intake/intake-queue-orchestrator';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const rateLimited = guardIntakePublicApi(request, 'queue-stream', 120);
  if (rateLimited) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const { jobId } = await params;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const write = (obj: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      const started = Date.now();
      const timeoutMs = 120_000;

      while (Date.now() - started < timeoutMs) {
        const job = await fetchIntakeJobMerged(jobId);
        if (!job) {
          write({ type: 'error', message: 'not_found' });
          break;
        }

        write({ type: 'status', status: job.status });

        if (job.status === 'completed') {
          write({ type: 'result', result: job.result });
          break;
        }
        if (job.status === 'failed' || job.status === 'dead_letter') {
          write({ type: 'error', message: job.error ?? 'failed' });
          break;
        }

        await new Promise((r) => setTimeout(r, 400));
      }

      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
