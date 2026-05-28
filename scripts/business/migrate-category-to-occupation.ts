/**
 * Migrate BusinessProfile.categorySlugs from legacy need categories to occupation slugs.
 * Run: npx --yes tsx scripts/business/migrate-category-to-occupation.ts
 */
import { PrismaClient } from '@prisma/client';
import { parseJsonArray, toJson } from '../../src/lib/business/json-fields';
import { migrateSlugToOccupation } from '../../src/config/need-to-occupation-map';
import { isPickableOccupationSlug, isOccupationSlug } from '../../src/config/business-occupations';

const db = new PrismaClient();

type LogRow = {
  profileId: string;
  slug: string;
  before: string[];
  after: string[];
  action: 'kept' | 'mapped' | 're-onboard';
  confidence: string;
};

async function main() {
  const profiles = await db.businessProfile.findMany({
    select: {
      id: true,
      slug: true,
      categorySlugs: true,
      onboardingCompletedAt: true,
      status: true,
    },
  });

  const log: LogRow[] = [];
  let mapped = 0;
  let kept = 0;
  let reOnboard = 0;

  for (const p of profiles) {
    const before = parseJsonArray<string>(p.categorySlugs);
    if (before.length === 0) continue;

    const afterSet = new Set<string>();
    let needsReOnboard = false;
    let anyMapped = false;
    let confidenceUsed = 'high';

    for (const raw of before) {
      if (isOccupationSlug(raw) && isPickableOccupationSlug(raw)) {
        afterSet.add(raw);
        continue;
      }

      const { occupations, confidence } = migrateSlugToOccupation(raw);
      if (confidence === 'none' || occupations.length === 0) {
        needsReOnboard = true;
        confidenceUsed = 'none';
        continue;
      }

      anyMapped = true;
      if (confidence === 'low') confidenceUsed = 'low';
      afterSet.add(occupations[0]);
    }

    const after = [...afterSet];
    if (after.length === 0 && needsReOnboard) {
      await db.$executeRaw`
        UPDATE "BusinessProfile"
        SET "onboardingCompletedAt" = NULL, "status" = 'INACTIVE'
        WHERE "id" = ${p.id}
      `;
      log.push({
        profileId: p.id,
        slug: p.slug,
        before,
        after: [],
        action: 're-onboard',
        confidence: confidenceUsed,
      });
      reOnboard += 1;
      continue;
    }

    if (after.length === 0) continue;

    const same =
      after.length === before.length && after.every((s, i) => before[i] === s);
    if (same && before.every((s) => isPickableOccupationSlug(s))) {
      kept += 1;
      log.push({ profileId: p.id, slug: p.slug, before, after, action: 'kept', confidence: 'high' });
      continue;
    }

    await db.businessProfile.update({
      where: { id: p.id },
      data: { categorySlugs: toJson(after) },
    });

    if (confidenceUsed === 'low') {
      await db.$executeRaw`
        UPDATE "BusinessProfile"
        SET "onboardingCompletedAt" = NULL, "status" = 'INACTIVE'
        WHERE "id" = ${p.id}
      `;
      reOnboard += 1;
      log.push({
        profileId: p.id,
        slug: p.slug,
        before,
        after,
        action: 're-onboard',
        confidence: 'low',
      });
    } else {
      mapped += 1;
      log.push({
        profileId: p.id,
        slug: p.slug,
        before,
        after,
        action: anyMapped ? 'mapped' : 'kept',
        confidence: confidenceUsed,
      });
    }
  }

  console.log(JSON.stringify({ mapped, kept, reOnboard, total: log.length, rows: log }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void db.$disconnect());
