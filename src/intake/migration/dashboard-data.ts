import { toConsumerDisplayRows } from '@/intake/migration/consumer-display';
import {
  countLegacyWritesWindow,
  countPublishedToday,
  getDriftStatsToday,
  getShadowPublishStats,
  getShadowStatsByNeedType,
} from '@/intake/migration/events';
import { getIntakeMigrationFeatureFlags } from '@/intake/migration/feature-flags';
import { computeMigrationReadiness } from '@/intake/migration/readiness';
import { listUnmigratedConsumers } from '@/intake/legacy/consumer-audit';
import { getLegacyWriteCount } from '@/intake/legacy/legacy-guards';

function sinceDays(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function buildIntakeMigrationDashboard() {
  const shadow7dSince = sinceDays(7);
  const [legacyWrites, driftToday, publishedToday, shadow7d, needTypeBreakdown] =
    await Promise.all([
      countLegacyWritesWindow(),
      getDriftStatsToday(),
      countPublishedToday(),
      getShadowPublishStats(shadow7dSince),
      getShadowStatsByNeedType(shadow7dSince),
    ]);

  const readiness = computeMigrationReadiness({
    legacyWrites24h: legacyWrites.h24,
    driftTotalToday: shadow7d.total > 0 ? shadow7d.total : driftToday.total,
    driftDiffToday: shadow7d.total > 0 ? shadow7d.diff : driftToday.diff,
  });

  const featureFlags = getIntakeMigrationFeatureFlags();

  return {
    consumers: toConsumerDisplayRows(),
    unmigratedCount: listUnmigratedConsumers().length,
    legacyWrites,
    inMemoryLegacyWrites: getLegacyWriteCount(),
    driftToday: {
      ...driftToday,
      publishedToday,
    },
    readiness,
    shadowMode: {
      enabled: featureFlags.shadowPublishEnabled,
      windowDays: 7,
      ...shadow7d,
      driftPercent: Math.round(shadow7d.driftRate * 10000) / 100,
    },
    needTypeBreakdown,
    featureFlags,
    exitCriteria: {
      legacyWritesZero: legacyWrites.h24 === 0 && legacyWrites.d7 === 0,
      legacyReadsZero: readiness.legacyReadComponent === 100,
      driftBelowThreshold: shadow7d.total === 0 || shadow7d.driftRate < 0.001,
      shadowEnabled: featureFlags.shadowPublishEnabled,
    },
  };
}

export type IntakeMigrationDashboardData = Awaited<
  ReturnType<typeof buildIntakeMigrationDashboard>
>;
