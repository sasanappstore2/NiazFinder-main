/**
 * Seed demo analytics sessions/events for admin hub testing.
 * Usage: npx tsx scripts/seed-analytics-demos.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const now = Date.now();
  const visitorBase = `demo-v-${now}`;
  let created = 0;

  for (let i = 0; i < 14; i++) {
    const day = new Date(now - i * 86400000);
    for (let s = 0; s < 5 + (i % 4); s++) {
      const sessionId = `demo-s-${i}-${s}-${now}`;
      const visitorId = `${visitorBase}-${(i + s) % 8}`;
      await db.analyticsSession.create({
        data: {
          sessionId,
          visitorId,
          firstSeen: day,
          lastSeen: new Date(day.getTime() + 120_000),
          device: s % 2 ? 'mobile' : 'desktop',
          browser: 'Chrome',
          os: 'Android',
          province: ['tehran', 'isfahan', 'fars', 'khorasan-razavi'][s % 4],
          city: 'tehran',
          landingPath: s % 3 ? '/n/tehran' : '/',
          utmSource: s % 2 ? 'google' : undefined,
          utmMedium: s % 2 ? 'organic' : undefined,
          pageViewCount: 1 + (s % 3),
          totalDurationMs: 5000 + s * 3000,
        },
      });

      await db.analyticsEvent.createMany({
        data: [
          {
            sessionId,
            visitorId,
            type: 'page_view',
            path: s % 2 ? '/n/tehran' : '/b/tehran',
            title: 'Demo page',
            dimensions: { market: s % 2 ? 'need' : 'business', pageKind: 'browse-need' },
            createdAt: day,
          },
          ...(s === 0
            ? [
                {
                  sessionId,
                  visitorId,
                  type: 'event',
                  name: 'need_created',
                  path: '/post',
                  createdAt: new Date(day.getTime() + 60_000),
                },
              ]
            : []),
        ],
      });
      created += 1;
    }
  }

  console.log(`Seeded ${created} demo sessions/events`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
