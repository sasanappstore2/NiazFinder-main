/**
 * Delete raw analytics events/sessions older than retention window.
 * Daily rollups are kept for 13 months.
 *
 * Usage: npx tsx scripts/analytics/retention-cleanup.ts [--dry-run]
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const RAW_RETENTION_DAYS = 90;
const ROLLUP_RETENTION_DAYS = 395;

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const now = new Date();

  const rawCutoff = new Date(now);
  rawCutoff.setDate(rawCutoff.getDate() - RAW_RETENTION_DAYS);

  const rollupCutoff = new Date(now);
  rollupCutoff.setDate(rollupCutoff.getDate() - ROLLUP_RETENTION_DAYS);

  const [oldEvents, oldSessions, oldRollups] = await Promise.all([
    db.analyticsEvent.count({ where: { createdAt: { lt: rawCutoff } } }),
    db.analyticsSession.count({ where: { lastSeen: { lt: rawCutoff } } }),
    db.analyticsDailyRollup.count({ where: { date: { lt: rollupCutoff } } }),
  ]);

  console.log(`Cutoff raw: ${rawCutoff.toISOString().slice(0, 10)}`);
  console.log(`Cutoff rollup: ${rollupCutoff.toISOString().slice(0, 10)}`);
  console.log({ oldEvents, oldSessions, oldRollups, dryRun });

  if (dryRun) {
    console.log('Dry run — no deletes performed');
    return;
  }

  const deletedEvents = await db.analyticsEvent.deleteMany({
    where: { createdAt: { lt: rawCutoff } },
  });
  const deletedSessions = await db.analyticsSession.deleteMany({
    where: { lastSeen: { lt: rawCutoff } },
  });
  const deletedRollups = await db.analyticsDailyRollup.deleteMany({
    where: { date: { lt: rollupCutoff } },
  });

  console.log('Deleted:', {
    events: deletedEvents.count,
    sessions: deletedSessions.count,
    rollups: deletedRollups.count,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
