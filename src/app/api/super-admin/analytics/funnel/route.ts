import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { parseDateRange } from '@/lib/analytics/query-utils';

export const runtime = 'nodejs';

const PRESETS: Record<string, string[]> = {
  signup: ['page_view', 'signup_completed'],
  need: ['page_view', 'need_created'],
  engagement: ['page_view', 'chat_started', 'proposal_sent'],
  business: ['business_profile_view', 'chat_started'],
  'intake-wizard': [
    'intake_wizard_step_need',
    'intake_wizard_step_details',
    'intake_wizard_step_location',
    'intake_wizard_step_preview',
    'intake_publish_success',
  ],
};

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'superadmin:analytics:read');
    if (!authz.ok) return authz.response;

    const range = parseDateRange(request.nextUrl.searchParams);
    const preset = request.nextUrl.searchParams.get('preset') ?? 'signup';
    const stepsParam = request.nextUrl.searchParams.get('steps');
    const steps = stepsParam
      ? stepsParam.split(',').map((s) => s.trim())
      : PRESETS[preset] ?? PRESETS.signup;

    const sessions = await db.analyticsSession.findMany({
      where: { firstSeen: { gte: range.from, lte: range.to } },
      select: { sessionId: true },
    });
    const sessionIds = sessions.map((s) => s.sessionId);
    const totalSessions = sessionIds.length;

    if (!totalSessions) {
      return NextResponse.json({
        range: { from: range.from.toISOString(), to: range.to.toISOString() },
        preset,
        steps: steps.map((name, i) => ({ name, count: 0, rate: 0, stepIndex: i })),
        totalSessions: 0,
      });
    }

    const events = await db.analyticsEvent.findMany({
      where: {
        sessionId: { in: sessionIds },
        createdAt: { gte: range.from, lte: range.to },
        OR: [
          { type: 'page_view' },
          { type: 'event', name: { in: steps.filter((s) => s !== 'page_view') } },
        ],
      },
      select: { sessionId: true, type: true, name: true },
    });

    const sessionEvents = new Map<string, Set<string>>();
    for (const e of events) {
      const key = e.type === 'page_view' ? 'page_view' : (e.name ?? '');
      if (!key) continue;
      if (!sessionEvents.has(e.sessionId)) sessionEvents.set(e.sessionId, new Set());
      sessionEvents.get(e.sessionId)!.add(key);
    }

    const stepCounts: number[] = steps.map(() => 0);
    for (const [, evts] of sessionEvents) {
      let reached = true;
      for (let i = 0; i < steps.length; i++) {
        if (!reached) break;
        if (evts.has(steps[i]!)) stepCounts[i]! += 1;
        else reached = false;
      }
    }

    const funnelSteps = steps.map((name, i) => ({
      name,
      count: stepCounts[i] ?? 0,
      rate: totalSessions ? Math.round(((stepCounts[i] ?? 0) / totalSessions) * 1000) / 10 : 0,
      stepIndex: i,
      dropoff:
        i > 0 && stepCounts[i - 1]
          ? Math.round((1 - (stepCounts[i] ?? 0) / (stepCounts[i - 1] ?? 1)) * 100)
          : 0,
    }));

    return NextResponse.json({
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      preset,
      steps: funnelSteps,
      totalSessions,
    });
  } catch (error) {
    console.error('Analytics funnel error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
