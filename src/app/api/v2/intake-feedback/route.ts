import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import type { GoldenConversation } from '@/lib/intake-v2/sim/conversation-transcript';

const FEEDBACK_DIR = join(process.cwd(), 'data', 'v2-feedback');

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = (await req.json()) as {
      turns?: Array<{ role: string; content: string }>;
      needDraft?: unknown;
      reason?: string;
    };

    if (!body.turns?.length) {
      return NextResponse.json({ error: 'turns required' }, { status: 400 });
    }

    mkdirSync(FEEDBACK_DIR, { recursive: true });
    const id = `fb-${Date.now()}`;
    const userMessages = body.turns.filter((t) => t.role === 'user').map((t) => t.content);

    const candidate: GoldenConversation & { feedbackReason?: string; draftSnapshot?: unknown } = {
      id,
      personaId: id,
      userMessages,
      expectedCategorySlug: 'apartment-rent',
      expectedCity: '',
      expectedDealType: 'rent_monthly',
      feedbackReason: body.reason,
      draftSnapshot: body.needDraft,
    };

    writeFileSync(join(FEEDBACK_DIR, `${id}.json`), JSON.stringify(candidate, null, 2), 'utf8');

    return NextResponse.json({ ok: true, id });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'feedback failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
