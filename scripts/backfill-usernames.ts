/**
 * One-off backfill: give every existing user without a username a default
 * searchable handle (social layer). Idempotent — skips users that have one.
 *
 * Usage: npx tsx scripts/backfill-usernames.ts
 */
import { PrismaClient } from '@prisma/client';
import { generateDefaultUsername } from '@/lib/users/generate-username';

const db = new PrismaClient();

async function main() {
  const users = await db.user.findMany({
    where: { OR: [{ username: null }, { username: '' }] },
    select: { id: true },
  });
  console.log(`users without username: ${users.length}`);

  let done = 0;
  for (const user of users) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await db.user.update({
          where: { id: user.id },
          data: { username: generateDefaultUsername() },
        });
        done++;
        break;
      } catch {
        // unique collision — retry with a fresh random handle
      }
    }
  }
  console.log(`backfilled: ${done}/${users.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
