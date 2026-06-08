import { NextRequest } from 'next/server';
import type { NeedDraft } from '@/contracts/need-intake';
import {
  checkNeedIntakeRateLimit,
  rateLimitKeyFromRequest,
} from '@/lib/need-intake/rate-limit';
import { streamListingCopyEvents } from '@/lib/need-intake/preview-listing-stream.server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const rateKey = rateLimitKeyFromRequest(request);
  const limited = checkNeedIntakeRateLimit(rateKey);
  if (!limited.ok) {
    return new Response(JSON.stringify({ error: 'تعداد درخواست زیاد است.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let draft: NeedDraft;
  try {
    const body = await request.json();
    draft = body.draft as NeedDraft;
    if (!draft?.entities || !draft?.needType) {
      return new Response(JSON.stringify({ error: 'پیش‌نویس نامعتبر' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: 'درخواست نامعتبر' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of streamListingCopyEvents(draft)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'خطا';
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message: msg })}\n\n`)
        );
      } finally {
        controller.close();
      }
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
