/**
 * Level 2 indexing: intake rule documents from JSON packs (~1.16M rules).
 * Run: npm run intake:index:rules [-- --slug=plumbing] [-- --embed-only] [-- --skip-embed]
 *
 * Tiered strategy:
 * - Upsert all rule rows (metadata only) in batches per pack
 * - Embed in batches with resume support (embeddedAt IS NULL)
 * - Always index with domain=NEEDS; business capability docs use domain=BUSINESS separately
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient, IntakeDomain } from '@prisma/client';
import type { RulePack } from '../../src/intake/rules/types';
import { RULES_PACKS_DIR } from '../../src/intake/rules/config';
import {
  buildRuleDescription,
  buildRuleSearchText,
  inferBundleType,
  packRuleKey,
  ruleToTechnicalConstraints,
  summarizePackForRoute,
} from '../../src/lib/intake-agent/rule-mapper';
import { embedModelId, embedPassagesBatch } from '../../src/lib/ai-agent/embedding-client';
import { pgvectorLiteral } from '../../src/lib/ai-agent/pgvector';

const prisma = new PrismaClient();
const BATCH = Number(process.env.EMBED_BATCH_SIZE ?? 64);
const UPSERT_BATCH = Number(process.env.INTAKE_UPSERT_BATCH ?? 500);

const slugFilter = process.argv.find((a) => a.startsWith('--slug='))?.split('=')[1];
const embedOnly = process.argv.includes('--embed-only');
const skipEmbed = process.argv.includes('--skip-embed');

function loadPack(path: string): RulePack | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as RulePack;
  } catch {
    return null;
  }
}

function listPacks(): RulePack[] {
  const dir = join(process.cwd(), RULES_PACKS_DIR);
  if (!existsSync(dir)) return [];
  const packs: RulePack[] = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.pack.json')) continue;
    const pack = loadPack(join(dir, name));
    if (!pack?.meta?.slug) continue;
    if (slugFilter && pack.meta.slug !== slugFilter) continue;
    packs.push(pack);
  }
  return packs;
}

async function getRouteId(slug: string): Promise<string | null> {
  const row = await prisma.intakeCategoryRoute.findUnique({
    where: { domain_slug: { domain: IntakeDomain.NEEDS, slug } },
    select: { id: true },
  });
  return row?.id ?? null;
}

async function upsertRequirementDoc(pack: RulePack, categoryRouteId: string | null): Promise<void> {
  const summary = summarizePackForRoute(pack);
  const ruleKey = `${IntakeDomain.NEEDS}:requirement:${pack.meta.slug}`;

  await prisma.intakeRuleDocument.upsert({
    where: { domain_ruleKey: { domain: IntakeDomain.NEEDS, ruleKey } },
    create: {
      domain: IntakeDomain.NEEDS,
      categorySlug: pack.meta.slug,
      categoryRouteId,
      ruleKey,
      ruleKind: 'requirement',
      pattern: pack.meta.slug,
      bundleType: 'requirement',
      description: summary.description,
      technicalConstraints: summary.technicalConstraints,
      searchText: summary.description,
      priority: 1000,
    },
    update: {
      categoryRouteId,
      description: summary.description,
      technicalConstraints: summary.technicalConstraints,
      searchText: summary.description,
      embeddedAt: null,
    },
  });
}

async function upsertPackRules(pack: RulePack): Promise<number> {
  const categoryRouteId = await getRouteId(pack.meta.slug);
  await upsertRequirementDoc(pack, categoryRouteId);

  let upserted = 0;
  for (let i = 0; i < pack.rules.length; i += UPSERT_BATCH) {
    const chunk = pack.rules.slice(i, i + UPSERT_BATCH);
    await prisma.$transaction(
      chunk.map((rule) => {
        const ruleKey = packRuleKey(IntakeDomain.NEEDS, rule);
        return prisma.intakeRuleDocument.upsert({
          where: { domain_ruleKey: { domain: IntakeDomain.NEEDS, ruleKey } },
          create: {
            domain: IntakeDomain.NEEDS,
            categorySlug: rule.slug,
            categoryRouteId,
            ruleKey,
            ruleKind: rule.kind,
            pattern: rule.pattern,
            bundleType: inferBundleType(rule.kind),
            description: buildRuleDescription(rule, pack.meta),
            technicalConstraints: ruleToTechnicalConstraints(rule, pack.meta),
            searchText: buildRuleSearchText(rule, pack.meta),
            priority: rule.priority ?? 0,
            weight: rule.weight ?? 1,
          },
          update: {
            categorySlug: rule.slug,
            categoryRouteId,
            ruleKind: rule.kind,
            pattern: rule.pattern,
            bundleType: inferBundleType(rule.kind),
            description: buildRuleDescription(rule, pack.meta),
            technicalConstraints: ruleToTechnicalConstraints(rule, pack.meta),
            searchText: buildRuleSearchText(rule, pack.meta),
            priority: rule.priority ?? 0,
            weight: rule.weight ?? 1,
          },
        });
      }),
    );
    upserted += chunk.length;
  }

  await prisma.intakeCategoryRoute.updateMany({
    where: { domain: IntakeDomain.NEEDS, slug: pack.meta.slug },
    data: { ruleCount: pack.rules.length + 1 },
  });

  return upserted;
}

async function embedPendingRules(): Promise<number> {
  let updated = 0;
  for (;;) {
    const where = {
      embeddedAt: null as Date | null,
      searchText: { not: null as string | null },
      ...(slugFilter ? { categorySlug: slugFilter } : {}),
    };

    const rows = await prisma.intakeRuleDocument.findMany({
      where,
      take: BATCH,
      select: { id: true, searchText: true },
      orderBy: { createdAt: 'asc' },
    });
    if (rows.length === 0) break;

    const vectors = await embedPassagesBatch(rows.map((r) => r.searchText!));
    const model = embedModelId();
    const now = new Date();

    for (let i = 0; i < rows.length; i++) {
      await prisma.$executeRawUnsafe(
        `UPDATE intake_rule_documents SET embedding = $1::vector, "embeddingModel" = $2, "embeddedAt" = $3 WHERE id = $4`,
        pgvectorLiteral(vectors[i]),
        model,
        now,
        rows[i].id,
      );
      updated += 1;
    }
    console.log(`rule docs embedded: +${rows.length} (total ${updated})`);
  }
  return updated;
}

async function main() {
  if (!embedOnly) {
    const packs = listPacks();
    console.log(`Indexing ${packs.length} pack(s)...`);
    let totalRules = 0;
    for (const pack of packs) {
      const n = await upsertPackRules(pack);
      totalRules += n;
      console.log(`  ${pack.meta.slug}: ${n} rules (+1 requirement doc)`);
    }
    console.log(`Upserted ${totalRules} rule documents`);
  }

  if (!skipEmbed) {
    const embedded = await embedPendingRules();
    console.log(`Embedded ${embedded} rule documents`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
