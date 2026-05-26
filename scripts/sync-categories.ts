import { syncCanonicalCategoriesToDb } from '../src/lib/categories/sync-to-db';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

syncCanonicalCategoriesToDb()
  .then((r) => {
    console.log(`Done: ${r.upserted} upserted, ${r.deactivated} deactivated.`);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
