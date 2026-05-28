/**
 * Idempotent backfill for business onboarding flags.
 * Run: npx --yes tsx scripts/business/backfill-onboarding.ts
 */
import { PrismaClient } from '@prisma/client';
import { parseJsonArray } from '../../src/lib/business/json-fields';

const db = new PrismaClient();

function isSubstantivelyComplete(row: {
  name: string;
  phone: string | null;
  categorySlugs: string;
}): boolean {
  const categories = parseJsonArray<string>(row.categorySlugs);
  const name = row.name?.trim() ?? '';
  const phone = row.phone?.trim() ?? '';
  return (
    name.length >= 2 &&
    name !== 'کسب‌وکار' &&
    phone.length >= 10 &&
    categories.length > 0
  );
}

async function main() {
  const profiles = await db.businessProfile.findMany({
    select: {
      id: true,
      name: true,
      phone: true,
      categorySlugs: true,
      onboardingCompletedAt: true,
      status: true,
      updatedAt: true,
    },
  });

  let activated = 0;
  let deactivated = 0;

  for (const p of profiles) {
    const complete = isSubstantivelyComplete(p);
    if (complete && !p.onboardingCompletedAt) {
      await db.businessProfile.update({
        where: { id: p.id },
        data: {
          onboardingCompletedAt: p.updatedAt,
          status: 'ACTIVE',
        },
      });
      activated += 1;
    } else if (!complete && p.onboardingCompletedAt == null && p.status === 'ACTIVE') {
      await db.businessProfile.update({
        where: { id: p.id },
        data: { status: 'INACTIVE' },
      });
      deactivated += 1;
    }
  }

  console.log(`Backfill done: ${activated} activated, ${deactivated} set INACTIVE`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void db.$disconnect());
