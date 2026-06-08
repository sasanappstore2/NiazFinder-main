/**
 * Dev-only: merge flat browse keys into existing dynamicAnswers JSON.
 * Run: npx tsx scripts/dev/backfill-dynamic-answers-flat.ts [--dry-run]
 */
import { PrismaClient } from '@prisma/client';
import { recordToEntities } from '@/intake/entities/entityRecord';
import { flattenDraftAnswersForPublish } from '@/intake/projections/flatten-draft-answers-for-publish';
import type { NeedDraft } from '@/contracts/need-intake';
import { recomputeNeedDraft } from '@/intake/aggregate/needDraftAggregate';

const dryRun = process.argv.includes('--dry-run');
const db = new PrismaClient();

async function main() {
  const rows = await db.serviceRequest.findMany({
    where: { source: 'intake_chat' },
    select: {
      id: true,
      dynamicAnswers: true,
      title: true,
    },
    take: 5000,
  });

  let updated = 0;
  for (const row of rows) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(row.dynamicAnswers) as Record<string, unknown>;
    } catch {
      continue;
    }

    const entities = parsed.entities;
    if (!entities || typeof entities !== 'object') continue;

    const sourceText =
      typeof parsed.sourceText === 'string' ? parsed.sourceText : row.title;
    const needType = typeof parsed.needType === 'string' ? parsed.needType : 'general-seeking';
    const schemaVersion =
      typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : 1;

    const draft = recomputeNeedDraft({
      needType,
      schemaVersion,
      vertical: 'general',
      category: 'general',
      entities: entities as Record<string, unknown>,
      completionScore: 0,
      matchabilityScore: 0,
      completionState: 'READY_TO_PUBLISH',
      sections: [],
      missingFields: [],
      nextQuestion: null,
      sourceText,
      updatedAt: new Date().toISOString(),
      parsedIntent: {
        rawText: sourceText,
        intentType: 'property_search',
        categorySlug: recordToEntities(entities as Record<string, unknown>).categorySlug ?? 'general',
        subcategorySlug: recordToEntities(entities as Record<string, unknown>).subcategorySlug ?? undefined,
        entities: {},
      },
      answers: {},
      turns: [],
    } as NeedDraft);

    const flat = flattenDraftAnswersForPublish(draft);
    const merged = { ...parsed, ...flat, entities: parsed.entities };
    const nextJson = JSON.stringify(merged);
    if (nextJson === row.dynamicAnswers) continue;

    if (!dryRun) {
      await db.serviceRequest.update({
        where: { id: row.id },
        data: { dynamicAnswers: nextJson },
      });
    }
    updated += 1;
  }

  console.log(
    dryRun
      ? `[dry-run] would update ${updated} intake_chat requests`
      : `updated ${updated} intake_chat requests`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
