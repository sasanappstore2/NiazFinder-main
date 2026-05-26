import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { evaluateRequestModeration } from '@/lib/request-moderation/rules';
import { applyModerationAction } from '@/lib/rbac/request-moderation';

export const runtime = 'nodejs';

/**
 * Internal auto-moderation hook (Phase 2).
 * Called after publish; auto-approves clean listings.
 */
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.INTERNAL_API_SECRET;
    if (secret) {
      const header = request.headers.get('x-internal-secret');
      if (header !== secret) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await request.json().catch(() => ({}));
    const requestId = typeof body.requestId === 'string' ? body.requestId : '';
    if (!requestId) {
      return NextResponse.json({ error: 'requestId required' }, { status: 400 });
    }

    const existing = await db.serviceRequest.findUnique({
      where: { id: requestId },
      select: { id: true, moderationStatus: true },
    });

    if (!existing || existing.moderationStatus !== 'PENDING') {
      return NextResponse.json({ skipped: true });
    }

    const evaluation = await evaluateRequestModeration(requestId);

    if (evaluation.pass) {
      const systemUser = await db.user.findFirst({
        where: { role: 'SUPER_ADMIN' },
        select: { id: true },
      });
      if (systemUser) {
        await applyModerationAction(requestId, 'approve', systemUser.id, {
          notes: `auto-moderation score=${evaluation.score}`,
        });
        return NextResponse.json({ autoApproved: true, score: evaluation.score });
      }
    }

    return NextResponse.json({
      autoApproved: false,
      flags: evaluation.flags,
      score: evaluation.score,
    });
  } catch (error) {
    console.error('Internal request-moderation error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
