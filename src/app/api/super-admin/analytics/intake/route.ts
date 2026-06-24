import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/authz';
import { aggregateSessions } from '@/intake/intelligence/sessionAggregator';
import { loadPostIntakeEventsForAnalysis } from '@/intake/telemetry/postIntakeTelemetryReplayReader';
import { getPostIntakeTelemetryStoreSize } from '@/intake/telemetry/postIntakeTelemetryStore';
import { FUNNEL_STEPS } from '@/intake/intelligence/types';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'superadmin:analytics:read');
    if (!authz.ok) return authz.response;

    const sinceDays = Number(request.nextUrl.searchParams.get('sinceDays') ?? 7);
    const events = await loadPostIntakeEventsForAnalysis({
      sinceDays: Number.isFinite(sinceDays) ? sinceDays : 7,
      maxEvents: 20_000,
    });

    const agg = aggregateSessions(events);

    const eventsByType: Record<string, number> = {};
    for (const e of events) {
      eventsByType[e.type] = (eventsByType[e.type] ?? 0) + 1;
    }

    const funnelReach: Record<string, number> = {};
    for (const step of FUNNEL_STEPS) {
      funnelReach[step] = agg.sessions.filter((s) => s.stepsReached.has(step)).length;
    }

    const dropoffsByStep = Object.fromEntries(agg.dropoffsByStep);
    const topValidationErrors = [...agg.globalValidationErrors.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([field, count]) => ({ field, count }));

    const topFieldChanges = [...agg.globalFieldChanges.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([field, count]) => ({ field, count }));

    const publishSuccess = events.filter(
      (e) => e.type === 'publish_attempt' && e.outcome === 'success'
    ).length;
    const publishFail = events.filter(
      (e) => e.type === 'publish_attempt' && e.outcome === 'fail'
    ).length;

    return NextResponse.json({
      events: events.length,
      memoryBufferSize: getPostIntakeTelemetryStoreSize(),
      totalSessions: agg.totalSessions,
      eventsByType,
      funnelReach,
      dropoffsByStep,
      publish: { success: publishSuccess, fail: publishFail },
      topValidationErrors,
      topFieldChanges,
      sinceDays: Number.isFinite(sinceDays) ? sinceDays : 7,
    });
  } catch (error) {
    console.error('analytics intake GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
