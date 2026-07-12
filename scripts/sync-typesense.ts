#!/usr/bin/env npx tsx
/**
 * Batch index active BusinessProfile rows into Typesense.
 *
 * Usage: npm run sync:typesense
 */
import './stress/intake-marathon/stub-server-only';
import { PrismaClient } from '@prisma/client';
import {
  businessProfileToTypesenseDocument,
  ensureBusinessProfilesCollection,
  upsertBusinessProfileDocuments,
} from '../src/lib/search/typesense-business-index';
import { typesenseEnabled } from '../src/lib/search/typesense-client';

const BATCH_SIZE = 200;

async function main() {
  if (!typesenseEnabled()) {
    console.error(
      'Typesense is disabled. Unset TYPESENSE_ENABLED=false (or set TYPESENSE_ENABLED=true) and provide TYPESENSE_API_KEY.'
    );
    process.exit(1);
  }

  const db = new PrismaClient();

  try {
    await ensureBusinessProfilesCollection();

    const total = await db.businessProfile.count({
      where: { status: 'ACTIVE', user: { isActive: true } },
    });
    console.log(`Indexing ${total} active business profiles...`);

    let indexed = 0;
    let cursor: string | undefined;

    while (true) {
      const rows = await db.businessProfile.findMany({
        where: { status: 'ACTIVE', user: { isActive: true } },
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: 'asc' },
        select: {
          id: true,
          userId: true,
          name: true,
          slug: true,
          logo: true,
          description: true,
          categorySlugs: true,
          tags: true,
          city: true,
          province: true,
          lat: true,
          lng: true,
          status: true,
          rating: true,
          reviewCount: true,
          verified: true,
          viewCount: true,
          createdAt: true,
          user: {
            select: {
              isActive: true,
              isVerified: true,
              avatar: true,
              online: true,
            },
          },
        },
      });

      if (rows.length === 0) break;

      const documents = rows.map((row) => businessProfileToTypesenseDocument(row));
      await upsertBusinessProfileDocuments(documents);
      indexed += documents.length;
      cursor = rows[rows.length - 1]!.id;
      console.log(`  ? ${indexed}/${total}`);
    }

    console.log(`Done. Indexed ${indexed} documents into business_profiles.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
