import { db } from '@/lib/db';
import { resolveTemplateIdFromLegacyNeedType } from '@/intake/migration/legacy-need-type-map';

export type IntakeMigrationEventType =
  | 'NeedDraftPublished'
  | 'NeedDraftUpdated'
  | 'LegacyWriteDetected'
  | 'CanonicalDiffDetected'
  | 'ShadowPublishComparison';

export async function recordIntakeMigrationEvent(
  type: IntakeMigrationEventType,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    await db.intakeMigrationEvent.create({
      data: {
        type,
        payload: JSON.stringify(payload),
      },
    });
  } catch (error) {
    console.error('[IntakeMigrationEvent] persist failed:', error);
  }
}

function sinceMs(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function countEventsSince(
  type: IntakeMigrationEventType,
  since: Date
): Promise<number> {
  try {
    return await db.intakeMigrationEvent.count({
      where: { type, createdAt: { gte: since } },
    });
  } catch {
    return 0;
  }
}

export async function countLegacyWritesWindow(): Promise<{
  h24: number;
  d7: number;
  d30: number;
}> {
  const [h24, d7, d30] = await Promise.all([
    countEventsSince('LegacyWriteDetected', sinceMs(1)),
    countEventsSince('LegacyWriteDetected', sinceMs(7)),
    countEventsSince('LegacyWriteDetected', sinceMs(30)),
  ]);
  return { h24, d7, d30 };
}

export async function getDriftStatsToday(): Promise<{
  total: number;
  equal: number;
  diff: number;
  topDiffFields: Array<{ field: string; count: number }>;
}> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  try {
    const events = await db.intakeMigrationEvent.findMany({
      where: {
        type: 'CanonicalDiffDetected',
        createdAt: { gte: start },
      },
      select: { payload: true },
    });

    let equal = 0;
    let diff = 0;
    const fieldCounts = new Map<string, number>();

    for (const event of events) {
      let parsed: { equal?: boolean; diffs?: Array<{ field: string }> } = {};
      try {
        parsed = JSON.parse(event.payload) as typeof parsed;
      } catch {
        continue;
      }
      if (parsed.equal) {
        equal += 1;
      } else {
        diff += 1;
        for (const d of parsed.diffs ?? []) {
          fieldCounts.set(d.field, (fieldCounts.get(d.field) ?? 0) + 1);
        }
      }
    }

    const topDiffFields = [...fieldCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([field, count]) => ({ field, count }));

    return { total: events.length, equal, diff, topDiffFields };
  } catch {
    return { total: 0, equal: 0, diff: 0, topDiffFields: [] };
  }
}

export async function countPublishedToday(): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return countEventsSince('NeedDraftPublished', start);
}

export async function getShadowPublishStats(since: Date): Promise<{
  total: number;
  equal: number;
  diff: number;
  driftRate: number;
  topDiffFields: Array<{ field: string; count: number }>;
}> {
  try {
    const events = await db.intakeMigrationEvent.findMany({
      where: { type: 'ShadowPublishComparison', createdAt: { gte: since } },
      select: { payload: true },
    });

    let equal = 0;
    let diff = 0;
    const fieldCounts = new Map<string, number>();

    for (const event of events) {
      let parsed: {
        equal?: boolean;
        diffs?: Array<{ field: string }>;
      } = {};
      try {
        parsed = JSON.parse(event.payload) as typeof parsed;
      } catch {
        continue;
      }
      if (parsed.equal) {
        equal += 1;
      } else {
        diff += 1;
        for (const d of parsed.diffs ?? []) {
          fieldCounts.set(d.field, (fieldCounts.get(d.field) ?? 0) + 1);
        }
      }
    }

    const total = events.length;
    return {
      total,
      equal,
      diff,
      driftRate: total > 0 ? diff / total : 0,
      topDiffFields: [...fieldCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([field, count]) => ({ field, count })),
    };
  } catch {
    return { total: 0, equal: 0, diff: 0, driftRate: 0, topDiffFields: [] };
  }
}

export async function getShadowStatsByTemplateId(since: Date): Promise<
  Array<{
    templateId: string;
    publishCount: number;
    diffCount: number;
    driftRate: number;
  }>
> {
  try {
    const events = await db.intakeMigrationEvent.findMany({
      where: { type: 'ShadowPublishComparison', createdAt: { gte: since } },
      select: { payload: true },
    });

    const byTemplate = new Map<string, { total: number; diff: number }>();

    for (const event of events) {
      let parsed: { templateId?: string; needType?: string; equal?: boolean } = {};
      try {
        parsed = JSON.parse(event.payload) as typeof parsed;
      } catch {
        continue;
      }
      const templateId =
        parsed.templateId ??
        (parsed.needType ? resolveTemplateIdFromLegacyNeedType(parsed.needType) : 'unknown');
      const row = byTemplate.get(templateId) ?? { total: 0, diff: 0 };
      row.total += 1;
      if (!parsed.equal) row.diff += 1;
      byTemplate.set(templateId, row);
    }

    return [...byTemplate.entries()]
      .map(([templateId, row]) => ({
        templateId,
        publishCount: row.total,
        diffCount: row.diff,
        driftRate: row.total > 0 ? row.diff / row.total : 0,
      }))
      .sort((a, b) => b.publishCount - a.publishCount);
  } catch {
    return [];
  }
}

/** @deprecated Use getShadowStatsByTemplateId */
export const getShadowStatsByNeedType = getShadowStatsByTemplateId;
